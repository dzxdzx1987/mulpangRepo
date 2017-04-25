var page = 2;

$(function(){
	$('body[id=all] #coupon').attr('class', 'list');
	
	// 오늘 날짜 세팅
	$('#time > time').attr('datetime', Util.dateToString('-')).text(Util.dateToString('.'));
		
	// 이전/다음 페이지 클릭 이벤트
	setSlideEvent();
	
	$.get('template/coupon_list.html', function(html){
		$.template('list', html);
		$.get('template/coupon_detail.html', function(html){
			$.template('detail', html);
				// 쿠폰 목록을 조회한다.
				getCouponList();
		});
	});	
	
	// 검색/정렬 이벤트 등록
	$('#coupon_search, #order').submit(function(){
		getCouponList($('#coupon_search').serialize(), $('#order').serialize());
		return false;
	});
});

// 쿠폰 상세보기 이벤트와 상세보기 닫기 이벤트를 추가한다.
function setDetailEvent(){
	// 쿠폰 상세보기 이벤트(이미지 클릭)
	$('.list_img, .detail_img').click(function(){
		var coupon = $(this).parent();
		couponDetail(coupon);
	});
	$('.preview').keydown(function(e){
		if(e.target.nodeName.toLowerCase()=='article' && e.keyCode==13){
			var coupon = $(this);
			couponDetail(coupon);
		}
	});
	// 상세보기 닫기 이벤트
	$('.btn_close_coupon_detail').click(function(){
		var coupon = $(this).parent();
		couponPreview(coupon);
		coupon.focus();
	});
}

// 쿠폰 상세정보를 보여준다.
function couponDetail(coupon, buy){
	// 상세보기 정보가 없을 경우 서버에 요청한다.
	if(coupon.children('.coupon_tab').size() == 0){
		var params = {
			cmd: 'couponDetail',
			_id: coupon.data('couponid')
		};
		$.ajax({
			url: 'request',
			data: params,
			success: function(data){
				console.log(data);
				var detail = $.tmpl('detail', data);
				coupon.children('.content').after(detail);
				// 상세보기의 탭 이벤트를 추가한다.
      	coupon.find('.coupon_tab > section').click(function(){
      		tabView($(this));
      	}).keydown(function(e){
      		if(e.keyCode == 13){
      			tabView($(this));
      		}
      	});
      	
      	// 갤러리 이미지 클릭 이벤트를 추가한다.
      	coupon.find('.photo_list a').click(function(e){
      		e.preventDefault();	// 브라우저의 기본동작(하이퍼링크 연결)을 취소
      		coupon.find('.photo_list + .big_photo > img').attr('src', $(this).attr('href'));
      	});
      	
      	// 조건에 따라서 상세화면이나 구매화면을 보여준다.
      	showBuyForm(coupon, buy);
      	
      	// 구매하기 이벤트
      	setBuyEvent(coupon);
      	
      	
			}
		});
	}	
	
	// 조건에 따라서 상세화면이나 구매화면을 보여준다.
	showBuyForm(coupon, buy);
	
	// 쿠폰 상세정보를 보여준다.
	coupon.removeClass('preview').addClass('detail');
	
	setTimeout(function(){
		$('#today .coupon_list > article.act.preview, #today #search, #today #coupon_control').hide();
	}, 500);
}

// 쿠폰 상세보기를 닫는다.
function couponPreview(coupon){
	$('#today .coupon_list > article.act.preview, #today #search, #today #coupon_control').show();
	
	// 쿠폰 상세보기를 닫는다.
	coupon.removeClass('detail').addClass('preview');
	// 갤러리 탭으로 초기화한다.
	tabView(coupon.find('.gallery'));
	
	coupon.children('.coupon_tab, .buy_section').hide();
}

// 상세보기 화면의 지정한 탭을 보여준다.
function tabView(tab){
	tab.removeClass('tab_off').siblings().addClass('tab_off');
};

// 이전/다음 버튼 이벤트 등록
function setSlideEvent(){
	// 이전 버튼을 클릭할 경우
	$('.btn_pre').click(function(){
		if(page > 1){
			page--;
			movePage();
		}
	});
	
	// 다음 버튼을 클릭할 경우
	$('.btn_next').click(function(){
		var lastPage = Math.floor(($('.coupon_list > article').size()+4)/5);
		if(page < lastPage){
			page++;
			movePage();
		}
	});	
};

// 페이지를 이동한다.
function movePage(){
	$('.slide > .coupon_list > article').show();
	
	var firstAct = (page-1) * 5;	// 현재 페이지 첫 쿠폰 번호
	var lastAct = (page*5) - 1;		// 현재 페이지 마지막 쿠폰 번호
	
	setTimeout(function(){
		$('.coupon_list > article').each(function(i){
			if(i < firstAct){
				$(this).removeClass('act next').addClass('pre');
			}else if(i > lastAct){
				$(this).removeClass('act pre').addClass('next');
			}else{
				$(this).removeClass('pre next').addClass('act');
			}
			$(this).addClass('p' + (i%5+1));
		});
	});
	
	setTimeout(function(){
		$('.slide > .coupon_list > article.pre, .slide > .coupon_list > article.next').hide();
	}, 500);
}

// 쿠폰 목록을 조회한다.
function getCouponList(search, order){	
	/*
	var xhr = new XMLHttpRequest();
	xhr.open('get', 'request?cmd=couponList', true);
	xhr.onload = function(){
		var data = xhr.responseText;
		console.log(data);
	};
	xhr.send();
	*/
	
	var params = 'cmd=couponList';
	if(search){
		params += '&' + search + '&' + order;
	}
	
	$.ajax({
		url: 'request',
		data: params,
		success: function(data){
			console.log(data);
			var couponList = $.tmpl('list', data);
			$('.coupon_list').empty().append(couponList);
			
			// 마지막 페이지에 남는 자리를 채운다.
			var couponSizeLastPage = couponList.size() % 5;
			if(couponList.size() == 0 || couponSizeLastPage > 0){
				for(var i=couponSizeLastPage; i<5; i++){
					$('<article class="preview no_content">')
					.append('<h1>등록된 상품이 없습니다.</h1>')
					.appendTo('.coupon_list');
				}
			}
			
			// 쿠폰 상세보기 클릭 이벤트
			setDetailEvent();		
			
			// 구매화면 보기 이벤트
			setBuyFormEvent();
			
			// 관심 쿠폰 등록 이벤트
			setAddCartEvent();
			
			page = 1;
			movePage();		
		}
	});
}

// 구매하기 버튼 클릭 이벤트 등록
function setBuyFormEvent(){
	$('.buy').click(function(e){
		e.preventDefault();
		var coupon = $(this).parents('article');
		couponDetail(coupon, true);
	});
}

// 구매화면을 보여주거나 숨긴다.
function showBuyForm(coupon, buy){	
	if(buy){
		coupon.children(".coupon_tab").hide().next().show();
	}else{
		coupon.children(".coupon_tab").show().next().hide();
	}
}

// 구매수량을 수정했을 때 결제가격을 다시 계산한다.
function setPrice(element, price){
	$(element).parents(".buy_section").find("output").text($(element).val() * price);
}

// 구매하기
function setBuyEvent(coupon){
	coupon.find('form').submit(function(){
		var form = this;
		// form의 모든 입력 요소를 쿼리스트링으로 만들어 반환
		var params = $(form).serialize();
		$.ajax({
			url: 'request',
			data: params,
			type: 'post',
			success: function(data){
				if(data.error){
					alert(data.message);
				}else{
					alert('쿠폰 구매가 완료되었습니다.');
					form.reset();
					// 잔여 수량 갱신
					var remain = data.quantity - data.buyQuantity;
					coupon.find('.remain > span').text(remain + "개");
					couponDetail(coupon);
				}
			}
		});
		return false;	// form의 submit 동작을 취소한다.
	});
}









