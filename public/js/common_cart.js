$(function(){
	showCart();
});

// 관심쿠폰 등록 이벤트
function setAddCartEvent(){
	$('.btn_add_cart').click(function(){
		var coupon = $(this).parent('article');
		addCart(coupon);
	});
}

// 관심 쿠폰 등록(로컬 스토리지에 저장)
function addCart(coupon){
	var couponId = coupon.data('couponid');
  var couponName = coupon.children('h1').text();
  var couponImg = coupon.children('.list_img').attr('src');
  
  // TODO 관심 쿠폰 목록을 localStorage에서 꺼낸다.
  var cart = localStorage.getItem('cart');
  if(cart){
  	cart = JSON.parse(cart);
  }else{
  	cart = {length: 0};
  }
  
  if(cart.length == 5){
    alert('관심 쿠폰은 최대 5개 등록 가능합니다.');
  }else if(cart[couponId]){
    alert(couponName + '\n이미 등록되어 있습니다.');
  }else{
    // TODO 관심 쿠폰을 localStorage에 저장한다.
  	cart[couponId] = {
  		name: couponName,
  		img: couponImg,
  		noti: 10
  	};
  	cart.length++;
  	localStorage.setItem('cart', JSON.stringify(cart));
  	showCart();
  	alert(couponName + '\n관심 쿠폰으로 등록 되었습니다.');
  	
    // TODO 알림메세지 사용 여부 체크
    Notification.requestPermission();
  }
}

// 관심쿠폰을 보여준다.
function showCart(){
	$('#cart > ul').empty();
	var cart = localStorage.getItem('cart');
	if(cart){
		cart = JSON.parse(cart);
		console.log(cart);
		$.each(cart, function(couponId){
			if(couponId != 'length'){
				var coupon = cart[couponId];
				var cartElement = '<li data-couponid="'+couponId+'"><a href="#"><img src="'+coupon.img+'" alt="'+coupon.name+'"></a><button class="cart_close">관심쿠폰 삭제</button></li>';
				$('#cart > ul').append(cartElement);
			}
		});
		// 수량 표시
		$('#cart > .interest_cnt').text(cart.length);
		setRemoveCartEvent();		
		requestQuantity();
	}
}

// 관심쿠폰 삭제 이벤트
function setRemoveCartEvent(){
	$('#cart .cart_close').click(function(){
		var cart = JSON.parse(localStorage.getItem('cart'));
		var couponId = $(this).parent().data('couponid');
		delete cart[couponId];
		cart.length--;
		localStorage.setItem('cart', JSON.stringify(cart));
		showCart();
	});
}


var es = null;
// 관심쿠폰의 남은 수량을 받아서 10개 미만일 경우 알림 메세지를 보여준다.
function requestQuantity(){
  if(es) es.close();
  var cart = localStorage.getItem('cart');
  if(cart){
    cart = JSON.parse(cart);
    if(cart.length == 0) return;
    
    var couponIdList = [];
    $.each(cart, function(couponId){
      if(couponId != 'length'){
        couponIdList.push(couponId);
      }
    });
    
    // SSE 요청 시작
    es = new EventSource('request?cmd=couponQuantity&couponIdList=' + couponIdList);
    es.onmessage = function(me){
      var data = JSON.parse(me.data);
      $.each(data, function(){
        var cartCoupon = cart[this._id];
        var count = this.quantity - this.buyQuantity;
        if(count < cartCoupon.noti && count > 0){
          var msg = cartCoupon.name + ' 수량이 ' + count + '개 밖에 남지 않았습니다.';
          showNoti({
            tag: this._id,
            icon: cartCoupon.img,
            body: msg
          });
          cartCoupon.noti = count;
          localStorage.setItem('cart', JSON.stringify(cart));
        }
      });
    };
  }
}

// 바탕화면 알림 서비스를 보여준다.
function showNoti(noti){	
	console.log(noti);
	if(Notification.permission == 'granted'){
		new Notification('마감임박!!!', noti);
	}
}





