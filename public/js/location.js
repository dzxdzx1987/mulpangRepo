Util.require('https://maps.googleapis.com/maps/api/js?key=AIzaSyAHGb0FNR3ktsVVgIvsCdzy1viEvCpJcx4');
// google maps api 참조 -> https://developers.google.com/maps/documentation/javascript/tutorial?hl=ko

/*
	1. 지도를 보여주고 현재 위치 찾기
		1.1 구글맵 로딩
		1.2 현재 위치 찾기
		1.3 지도를 현재 위치로 이동	
		1.4 현재 위치에 마커 표시
		1.5 현재 위치의 오차 표시
	2. 쿠폰 목록 조회
	3. 지도에 쿠폰 추가	
	4. 지도안에 쿠폰이 들어오면 슬라이더를 갱신하도록 이벤트 추가
	5. 슬라이더 이벤트 추가
	6. 지정한 순번의 쿠폰으로 슬라이더 이동
*/


$(function(){
	// 1. 지도를 보여주고 현재 위치 찾기
	initMap();
	$.get('template/coupon_location.html', function(html){
		$.template('list', html);
		// 2. 쿠폰 목록 조회
		getCouponList();
	});
	// 3. 슬라이더 이벤트 추가
	setSliderEvent();
});

// 1. 지도를 보여주고 현재 위치 찾기
var map;
function initMap(){
	// 1.1 구글맵 로딩
	map = new google.maps.Map($('#location_map')[0], {
		center: {lat: 37.527177, lng: 127.028421},
		zoom: 14
	});
	
	// 1.2 현재 위치 찾기
	navigator.geolocation.getCurrentPosition(success, fail);
	
	function success(position){
		// 1.3 지도를 현재 위치로 이동
		var here = {lat: position.coords.latitude
							, lng: position.coords.longitude};
		map.setCenter(here);
		
		// 1.4 현재 위치에 마커 표시
		new google.maps.Marker({
			map: map,
			position: here
		});		
				
		// 1.5 현재 위치의 오차 표시
		circle = new google.maps.Circle({
			map: map,
			center: here,
			radius: position.coords.accuracy,
			strokeColor: 'blue',
			strokeOpacity: 0.2,
			fillColor: 'blue',
			fillOpacity: 0.1
		});
	}

	function fail(err){
		console.error(err);
		/*
		var position = {
			coords: {
				latitude: 37.5017754,
				longitude: 127.0400846,
				accuracy: 200
			}
		};
		success(position);
		*/
	}
}

// 2. 쿠폰 목록 조회
var articleList;
function getCouponList(){
	$.ajax({
		url: 'request?cmd=couponList',
		success: function(couponList){
			console.log(couponList);
			// 화면에 쿠폰을 출력한다.
			articleList = $.tmpl('list', couponList).appendTo('.coupon_list').hide();
			// article에 쿠폰 정보 추가
			articleList.each(function(i){
				var article = $(this);
				article.data('position', couponList[i].position);
				article.data('couponName', couponList[i].couponName);
				// 3. 지도에 쿠폰 추가	
				addCouponToMap(article);
			});			
			// 4. 지도안에 쿠폰이 들어오면 슬라이더를 갱신하도록 이벤트 추가
			addBoundsEvent();
		}
	});
}

// 3. 지도에 쿠폰 추가	
var openWindow;
function addCouponToMap(article){
	// 쿠폰 마커 생성
	var marker = new google.maps.Marker({
		map: map,
		position: article.data('position'),
		title: article.data('couponName'),
		icon: {url: 'css/svg/icon_map_coupon.svg'}
	});
		
	// 지도 클릭 시 보여줄 정보창 생성
	var info = new google.maps.InfoWindow({
		position: article.data('position'),
		content: article.children('.list_img, .content').outerHtml()
	});
	
	// 마커 클릭 이벤트를 추가한다.
	google.maps.event.addListener(marker, 'click', function(){
		console.log(marker);
		if(openWindow) openWindow.close();
		info.open(map);
		openWindow = info;
	});
}

// 4. 지도안에 쿠폰이 들어오면 슬라이더를 갱신하도록 이벤트 추가
function addBoundsEvent(){
	// 지도가 로딩된 후 지도 영역이 변경될 경우에 발생하는 'bounds_changed' 이벤트 처리
	google.maps.event.addListener(map, 'tilesloaded', function(){
		// 모든 쿠폰을 숨기고 지도 안에 포함된 쿠폰만 화면에 보여준다.
		google.maps.event.addListener(map, 'bounds_changed', function(){
			var bounds = map.getBounds();
			articleList.each(function(i){
				var article = $(this);
				if(bounds.contains(article.data('position'))){
					article.show();
				}else{
					article.hide();
				}
			});
			// 첫번째 쿠폰으로 슬라이더를 이동한다.
			slide(0);
		});	
		// 최초로 'bounds_changed' 이벤트를 발생시켜서 슬라이더를 초기화한다.
		google.maps.event.trigger(map, 'bounds_changed');
	});
}

// 5. 슬라이더 이벤트 추가
function setSliderEvent(){
	var range = $('#location_coupon_control input[type=range]');
	var preBtn = $('#btn_pre_location_coupon');
	var nextBtn = $('#btn_next_location_coupon');
	
	// 슬라이더 값이 변경될 경우의 이벤트 추가(막대기를 드래그 해서 이동 시)
	range.change(function(){
		slide(parseInt(range.val()));
	});
	
	// 이전/이후 버튼의 클릭 이벤트 추가
	preBtn.click(function(){
		if(range.val() > 0){
			slide(parseInt(range.val())-1);
		}
	});
	nextBtn.click(function(){
		if(range.val() <  $('.coupon_list article:visible').size()-1){
			slide(parseInt(range.val())+1);
		}
	});
}

// 6. 지정한 순번의 쿠폰으로 슬라이더 이동
function slide(actNo){
	var visibleArticle = $('.coupon_list article:visible');
	visibleArticle.each(function(i){
		var article = $(this);
		switch(i){
		case actNo-2:
			article.attr('class', 'location_slide_pre_02');
			break;
		case actNo-1:
			article.attr('class', 'location_slide_pre_01');
			break;
		case actNo:
			article.attr('class', 'location_slide_act');
			break;
		case actNo+1:
			article.attr('class', 'location_slide_next_01');
			break;
		case actNo+2:
			article.attr('class', 'location_slide_next_02');
			break;
		default:
			if(i < actNo){
				article.attr('class', 'location_slide_pre_hide');	
			}else{
				article.attr('class', 'location_slide_next_hide');
			}
			break;
		}
	});
	
	var size = visibleArticle.size();	
	$('#location_coupon_control input[type=range]').val(actNo).attr('max', size==0 ? 0 : size-1);
	$('#counter_now').text(size==0 ? 0 : actNo+1);
	$('#counter_all').text(size);
}








