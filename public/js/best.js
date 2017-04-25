// RGraph(http://www.rgraph.net) 라이브러리를 import 한다.
Util.require('lib/rgraph/RGraph.common.core.js');
Util.require('lib/rgraph/RGraph.common.dynamic.js');
Util.require('lib/rgraph/RGraph.hbar.js');

// Chart.js(http://www.chartjs.org) 라이브러리를 import 한다.
Util.require('lib/Chart.js');

// Flotr2(http://humblesoftware.com/flotr2) 라이브러리를 import 한다.
Util.require('lib/flotr2.js');

// socket.io 라이브러리
Util.require('/socket.io/socket.io.js');

$(function(){
	/*
	var data = [{couponName: '와플세트', buyQuantity: 345}
					, {couponName: '베스킨라빈스', buyQuantity: 245}
					, {couponName: '일말에', buyQuantity: 128}
					, {couponName: '자연산 활어회', buyQuantity: 99}
					, {couponName: '치맥', buyQuantity: 50}];
	
	drawSaleGraph(data);	
	drawPointGraph(data);
	drawViewGraph(data);
	drawReplyGraph(data);
	*/
	
	$.getJSON('request', {cmd: 'topCoupon', condition: 'buyQuantity'}, drawSaleGraph);
	$.getJSON('request', {cmd: 'topCoupon', condition: 'satisfactionAvg'}, drawPointGraph);
	$.getJSON('request', {cmd: 'topCoupon', condition: 'viewCount'}, drawViewGraph);
	$.getJSON('request', {cmd: 'topCoupon', condition: 'epilogueCount'}, drawReplyGraph);
	
	// 웹소켓 서버에 연결(ws://localhost)
	var socket = io();
	socket.on('new5', drawViewGraph);
});

// 판매순 그래프를 그린다.(Canvas)
function drawSaleGraph(data){
	var context = $('#graph_by_sale')[0].getContext('2d');
	
	// TODO x, y 축 그리기
	context.beginPath();
	context.moveTo(70, 10);
	context.lineTo(70, 231);
	context.lineTo(470, 231);	
	context.lineWidth = 2;
	context.stroke();

	// 막대그래프 그리기
	var r = 210 / data[0].buyQuantity; // 높이 비율
	var barW = 50;  // 막대기 넓이
	var gap = 25;   // 막대기 간격
	$.each(data, function(i){
		var x = (barW + gap) * i + gap + 60;
		var barH = this.buyQuantity * r;
		var y = 230 - barH;
		
		// 채우기 스타일 지정
		context.fillStyle = 'rgba(186, 68, 10, 0.' + (7-i) + ')';
		// TODO 막대 그래프 그리기
		context.fillRect(x, y, barW, barH);

		// 텍스트 스타일 지정 출력
		context.font = '12px "돋움, dotum, 굴림, gulim, sans-serif"';
		context.fillStyle = 'black';
		context.textAlign = 'center';
		// TODO 레이블 출력
		context.fillText(this.couponName, x+barW/2, 246);
		context.fillText(this.buyQuantity, x+barW/2, y);
	});
}


// 평가순 그래프를 그린다.(RGraph)
function drawPointGraph(data){
	var labels = [];
	var points = [];
	
	$.each(data, function(i){
		labels[i] = this.couponName;
		points[i] = this.satisfactionAvg * 20;
//		points[i] = this.buyQuantity;
	});
	
	var hbar = new RGraph.HBar('graph_by_point', points);
	hbar.Set('chart.labels', labels);
	hbar.Set('strokestyle', 'white');
	hbar.Set('shadow', true);
	hbar.Set('shadow.blur', 10);
	hbar.Set('linewidth', 1);
	hbar.Set('chart.vmargin', 7);
	hbar.Set('chart.gutter.left', 100);
	hbar.Set('chart.background.barcolor1', 'white');
	hbar.Set('chart.background.barcolor2', 'white');
	hbar.Set('chart.background.grid', true);
	hbar.Set('colors', ['Gradient(white:rgba(153, 208, 249, 0.5))']);

	hbar.Draw();
}


// 조회순 그래프를 그린다.(Chart.js)
var beforeCoupons = [];
var beforeCounts = [];
var animation = true;
function drawViewGraph(data){
	var labels = [];
	var counts = [];
	
	// 순위가 변경될 경우 이전 그래프를 초기화 시킨다.
	if(beforeCoupons.length > 0){
		$.each(data, function(i){
			if(beforeCoupons[i] != this._id){
				beforeCoupons = [];
				beforeCounts = [];
				animation = true;
				return false;
			}
		});
	}
	
	$.each(data, function(i){
		labels.push(this.couponName);
		counts.push(this.viewCount);
//		counts.push(this.buyQuantity);
		if(beforeCoupons.length < data.length){
			beforeCoupons.push(this._id);
			beforeCounts.push(this.viewCount);
//			beforeCounts.push(this.buyQuantity);
		}
	});
	
	var chartData = {
		labels : labels,
		datasets : [
			{
				fillColor : 'rgba(220,220,220,0.5)',
				strokeColor : 'rgba(220,220,220,1)',
				data : beforeCounts
			},
			{
				fillColor : 'rgba(151,187,205,0.5)',
				strokeColor : 'rgba(151,187,205,1)',
				data : counts
			}
		]
	};
	
	var context = $('#graph_by_view')[0].getContext('2d');
	new Chart(context).Bar(chartData, {
		barStrokeWidth: 1,
		scaleOverride: true,
		scaleSteps: 10,
		scaleStepWidth: Math.round(counts[0]*1.1/10),
		scaleStartValue: 0,
		animation: animation 
	});
	animation = false;
}



// 댓글순 그래프를 그린다.(Flotr2)
function drawReplyGraph(data){
	var dataSet = [];
	$.each(data, function(i){
		dataSet[i] = {
			data: [[0, this.epilogueCount]], 
//			data: [[0, this.buyQuantity]],
			label: this.couponName
		};
	});
	
	Flotr.draw($('#graph_by_reply')[0], dataSet, {
		HtmlText : false,
		grid : {
			verticalLines : false,
			horizontalLines : false,
			outlineWidth: 0
		},
		xaxis : { showLabels : false },
		yaxis : { showLabels : false },
		pie : {
			show : true, 
			explode : 6
		},
		mouse : { track : false },
		legend : {
			position : 'se',
			backgroundColor : '#D2E8FF'
		}
	});
}


