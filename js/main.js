window.onload=function() {
    var graph = new joint.dia.Graph;    // 创建画板，所有图上的元素都在画板里
    var paper = new joint.dia.Paper({   // 创建画板上的画布，画布是用来渲染画板
        el: $('#myGraph'),  // 指向HTML里ID为"myGraph"的元素
        model: graph,       // 指定画板
        width: 600,         // 画布宽600像素
        height: 300,        // 画布高300像素
        gridSize: 5,        // 画布上元素拖动时步进的为5像素，默认1
        drawGrid: true,     // 显示步进点，方便对齐
        background: {       // 画布背景色
            color: 'rgba(0, 0, 0, 0.1)'
        },
    
        // 连接线风格
        defaultLink: new joint.shapes.logic.Wire({
            connector: { name: 'jumpover' },  // 当两根连线交叉时，其中一根跳过
        }),
        linkPinning: false,   // 连线必须连到某个元素，即不允许连到空白处
        snapLinks: {
            radius: 25          // 距离元素连接点25像素时自动连接上
        },
    
        // 验证连线是否允许，
        validateConnection: function(viewSource, magnetSource, viewTarget, magnetTarget, end, viewLink) {
            if (end === 'target') {
                // 连线目标必须时一个"in"类型连接点
                if (!magnetTarget || !magnetTarget.getAttribute('port-group') || magnetTarget.getAttribute('port-group').indexOf('in') < 0) {
                    return false;
                }
    
                // 检查连接点是否已经有连线接入，不允许多重接入
                var portUsed = this.model.getLinks().some(function(link) {
                    return (link.id !== viewLink.model.id &&
                      link.get('target').id === viewTarget.model.id &&
                      link.get('target').port === magnetTarget.getAttribute('port'));
                });
                return !portUsed;
    
            } else { // end === 'source'
                // 连线起始点必须时一个"out"类型连接点
                return magnetSource && magnetSource.getAttribute('port-group') && magnetSource.getAttribute('port-group').indexOf('out') >= 0;
            }
        },
    });
	
	// 创建基础元件模板
	var gateTemplate = new joint.shapes.devs.Model({
	  position: {  // 默认位置
	    x: 0,
	    y: 0
	  },
	  size: {   // 默认大小
	    width: 50,
	    height: 60
	  },
	  // "连接点"（port）的风格
	  portMarkup: '<rect class="joint-port-body" width="10" height="3" style="fill:black" />',
	  // "连接点"（port）标签文字的显示风格
	  portLabelMarkup: '<text class="port-label joint-port-label" font-size="10" y="0" fill="#000" /> ',
	  ports: {  // 定义连接点
	    groups: {
	      'in': {  // "入"连接点的属性和风格
	        attrs: {
	          '.port-body': {  // 这是JointJS类库预定义的连接点属性类
	            magnet: 'passive',   // 该连接点只入不出
	          },
	          '.joint-port-body': {  // 这是JointJS类库预定义的连接点风格类
	            x:-10   // "入"连接点左移10个像素，这样可以显示在元素外部
	          }
	        },
	        label: {
	          position: {
	            args: {x:18},  // 标签右移，这样可以显示在元素内部
	          },
	        },
	      },
	      'out': {
	        label: {  // "出"连接点的属性和风格
	          position: {
	            args: {x:-23},  // 标签左移，这样可以显示在元素内部
	          },
	        },
	      }
	    }
	  },
	  attrs: {
	    '.label': {
	      'type': 'primary',  // 自定义一个图例属性，后面事件操作时判断用
	      fontSize: 12,       // 标签字体
	      'ref-x': .5,        // 标签相对于元素的水平位置
	      'ref-y': .05        // 标签相对于元素的垂直位置
	    },
	  }
	});
	
	// 生成"与"元素，两个"入"连接点，一个"出"连接点，显示"And"字样标签
	function genAndPr() {
	  return gateTemplate.clone().set('inPorts', ['IN1', 'IN2']).set('outPorts', ['OUT']).attr('.label/text', 'And');
	}
	
	// 生成"或"元素，两个"入"连接点，一个"出"连接点，显示"Or"字样标签
	function genOrPr() {
	  return gateTemplate.clone().set('inPorts', ['IN1', 'IN2']).set('outPorts', ['OUT']).attr('.label/text', 'Or');
	}
	
	// 生成"非"元素，一个"入"连接点，一个"出"连接点，显示"Not"字样标签
	function genNotPr() {
	  return gateTemplate.clone().set('inPorts', ['IN ']).set('outPorts', ['OUT']).attr('.label/text', 'Not');;
	}
	
	// 图例加入到画板左侧
	graph.addCell(genAndPr().translate(20, 20));
	graph.addCell(genOrPr().translate(20, 120));
	graph.addCell(genNotPr().translate(20, 220));
	
	// 添加一个分割栏将图例和绘图区域分开
	var separator = new joint.shapes.standard.Polyline();
	separator.resize(5, 400);
	separator.position(95, 0);
	separator.addTo(graph);
	
	function genAnd() {
	  return genAndPr().set('portMarkup', '<rect class="port-body joint-port-body" width="10" height="2" style="fill:black" />').attr('.label/type', 'instance');
	}
	function genOr() {
	  return genOrPr().set('portMarkup', '<rect class="port-body joint-port-body" width="10" height="2" style="fill:black" />').attr('.label/type', 'instance');
	}
	function genNot() {
	  return genNotPr().set('portMarkup', '<rect class="port-body joint-port-body" width="10" height="2" style="fill:black" />').attr('.label/type', 'instance');
	}
	
	paper.on({  // JointJS事件都定义在画布上
	  // 当鼠标左键按下时
	  'element:pointerdown': function(elementView, evt) {
	      // 当图例元素被拖走时，在原来的位置创建一个新的图例元素
	      if (elementView.model.attr('.label/type') == 'primary') {
	        var type = elementView.model.attr('.label/text');
	        if (type == 'And') {
	          graph.addCell(genAndPr().translate(20, 20));
	        } else if (type == 'Or') {
	          graph.addCell(genOrPr().translate(20, 120));
	        } else if (type == 'Not') {
	          graph.addCell(genNotPr().translate(20, 220));
	        }
	        // 被拖动的元素挪到图层的最上层，这样可以遮盖现有元素
	        elementView.model.toFront();
	      } else if (elementView.model.attr('.label/type') == 'instance') {
	        // 对于绘图元素，记住其被拖动时的起始点，当拖动位置超出绘图区域时，可以回到原点
	        evt.data = elementView.model.position();
	      }
	  },
	
	  // 当鼠标左键抬起时
	  'element:pointerup': function(elementView, evt, x, y) {
	    if (elementView.model.attr('.label/type') == 'primary') {
	      // 对于图例元素，当其被拖入绘图区域时，则在该位置创建一个新的绘图元素，并删除被拖动的图例元素
	      if (elementView.model.position().x > 105) {
	        var type = elementView.model.attr('.label/text');
	        if (type == 'And') {
	          graph.addCell(genAnd().translate(elementView.model.position().x, elementView.model.position().y));
	        } else if (type == 'Or') {
	          graph.addCell(genOr().translate(elementView.model.position().x, elementView.model.position().y));
	        } else if (type == 'Not') {
	          graph.addCell(genNot().translate(elementView.model.position().x, elementView.model.position().y));
	        }
	      }
	      // 删除当前被拖动的元素
	      graph.removeCells(elementView.model);
	    } else {
	      // 对于绘图元素，当其被拖出绘图区域时，则将其移回原点
	      if (elementView.model.position().x < 110) {
	        elementView.model.position(evt.data.x, evt.data.y);
	      }
	    }
	  },
	
	  // 当鼠标左键双击时
	  'element:pointerdblclick': function(elementView, evt) {
	    // 双击绘图元素则删除该元素，相应的连线也会被自动删除
	    if (elementView.model.attr('.label/type') == 'instance') {
	      elementView.model.remove();
	    }
	  },
	})
	
	
}