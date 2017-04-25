var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var util = require('util');
var path = require('path');
var clog = require('clog');
var fs = require('fs');

// DB 접속
MongoClient.connect('mongodb://localhost:27017/mulpang', function(err, mulpang) {
	if(err) {
		clog.error(err);
	}else{
		clog.info('mulpang DB 접속.');		
		db = mulpang;
		
		db.collection('member', function(err, member){
			db.member = member;
		});
		db.collection('shop', function(err, shop){
			db.shop = shop;
		});
		db.collection('coupon', function(err, coupon){
			db.coupon = coupon;
		});
		db.collection('purchase', function(err, purchase){
			db.purchase = purchase;
		});
		db.collection('epilogue', function(err, epilogue){
			db.epilogue = epilogue;
		});
		db.collection('post', function(err, post){
			db.post = post;
		});
	}
});

// 쿠폰 목록조회
exports.couponList = function(options){	
	// 검색 조건
	var query = {};
	var now = new Date();
	// 1. 판매 시작일이 지난 쿠폰, 구매 가능 쿠폰(기본 검색조건)
	query['saleDate.start'] = {$lte: now};
	query['saleDate.finish'] = {$gte: now};
	
	// 2. 구매가능/지난쿠폰/전체
	switch(options.params.search_date){
		case 'past':
			query['saleDate.finish'] = {$lt: now};
			break;
		case 'all':
			delete query['saleDate.finish'];
			break;
	}
	
	// 3. 지역명	
	var location = options.params.search_location;
	if(location){
		query['region'] = location;
	}
	
	// 4. 검색어	
	var keyword = options.params.search_keyword;
	if(keyword && keyword.trim() != ''){
		// 정규표현식
		var regExp = new RegExp(keyword, 'i');
		query['$or'] = [{couponName: regExp}, {desc: regExp}];
	}

	// 정렬 옵션
	var orderBy = {};
	// 1. 사용자 지정 정렬 옵션
	var orderCondition = options.params.list_order;
	if(orderCondition){
		orderBy[orderCondition] = -1;	// 내림차순
	}
	
	// 2. 판매 시작일 내림차순(최근 쿠폰)
	orderBy['saleData.start'] = -1;
	
	// 3. 판매 종료일 오름차순(종료 임박 쿠폰)
	orderBy['saleDate.finish'] = 1;
	
	// 출력할 속성 목록
	var resultAttr = {
		couponName: 1,
		image: 1,
		desc: 1,
		primeCost: 1,
		price: 1,
		useDate: 1,
		quantity: 1,
		buyQuantity: 1,
		saleDate: 1,
		position: 1
	};
	
	// TODO 전체 쿠폰 목록을 조회한다.
	db.coupon.find(query, resultAttr).sort(orderBy).toArray(function(err, result){
		options.callback(err, result);
	});
};

// 쿠폰 상세 조회
exports.couponDetail = function(options){
	// coupon, shop, epilogue 조인
	db.coupon.aggregate([
	  {
	  	$match: {_id: new ObjectId(options.params._id)}
	  },
	  {
	  	// shop 조인
	  	$lookup: {
	  		from: 'shop',
	  		localField: 'shopId',
	  		foreignField: '_id',
	  		as: 'shop'
	  	}
	  },
	  {
	  	// shop 조인 결과(배열)를 낱개의 속성으로 변환한다.
	  	$unwind: '$shop'
	  },
	  {
	  	// epilogue 조인
	  	$lookup: {
	  		from: 'epilogue',
	  		localField: '_id',
	  		foreignField: 'couponId',
	  		as: 'epilogueList'
	  	}
	  }
	]).toArray(function(err, data){
		if(err) clog.error(err);
		var coupon = data[0];
		// 뷰 카운트를 하나 증가시킨다.
		db.coupon.update({_id: coupon._id}
										, {$inc: {viewCount: 1}}
										, function(err){
			// 웹소켓으로 수정된 조회수 top5를 전송한다.
			topCoupon({
				params: {condition: 'viewCount'},
				callback: function(err, data){
					options.req.app.get('io').emit('new5', data);
				}
			});
			options.callback(err, coupon);
		});
		
		
	});
};

// 쿠폰 구매
exports.buyCoupon = function(options){
	// 구매 컬렉션에 저장할 형태의 데이터를 만든다.
	var document = {
		couponId: ObjectId(options.params.couponId),
//		email: 'uzoolove@gmail.com',	// 나중에 로그인한 id로 대체
		email: options.req.session.uid,
		quantity: parseInt(options.params.quantity),
		paymentInfo: {
			cardType: options.params.cardType,
			cardNumber: options.params.cardNumber,
			cardExpireDate: options.params.cardExpireYear + options.params.cardExpireMonth,
			csv: options.params.csv,
			price: parseInt(options.params.unitPrice) * parseInt(options.params.quantity)
		},
		regDate: new Date()
	};

	// TODO 구매 정보를 등록한다.
	db.purchase.insert(document, function(err, result){
		// TODO 구매 정보를 등록한 후 쿠폰 구매 건수를 하나 증가시킨다.
		db.coupon.update({_id: document.couponId}
  		, {$inc: {buyQuantity: document.quantity}}
  		, function(err, result){
  		// TODO 쿠폰의 수량을 조회한다.
  		db.coupon.findOne({_id: document.couponId}
    		, {quantity: 1, buyQuantity: 1}
    		, function(err, result){
    		options.callback(err, result);
    	});
		});
	});
};	
	
// 추천 쿠폰 조회
var topCoupon = exports.topCoupon = function(options){
	var condition = options.params.condition;
	var orderBy = {};
	orderBy[condition] = -1;	// -1은 내림차순, 1은 오름차순
	var resultAttr = {couponName: 1};
	resultAttr[condition] = 1;
	db.coupon.find({}, resultAttr).limit(5).sort(orderBy)
																.toArray(function(err, data){
		options.callback(err, data);
	});
};

// 지정한 쿠폰 아이디 목록을 받아서 남은 수량을 넘겨준다.
exports.couponQuantity = function(options){	
  // 쿠폰 목록이 ','를 구분자로 하나의 문자열로 전달되므로 ','를 기준으로 자른다.
	var strIdArray = options.params.couponIdList.split(',');
	var objIdArray = [];
	for(var i=0; i<strIdArray.length; i++){
		objIdArray.push(ObjectId(strIdArray[i]));
	}

	// 쿠폰아이디 배열에 포함된 쿠폰을 조회한다. 
	db.coupon.find({_id: {$in: objIdArray}}, {quantity: 1, buyQuantity: 1, couponName: 1}).toArray(function(err, result){
		// Server-Sent Events 형식의 응답 헤더 설정
		options.res.contentType('text/event-stream');
		options.res.write('data: ' + JSON.stringify(result));
		options.res.write('\n\n');
		options.res.write('retry: ' + 1000*10);
		options.res.end('\n');
	});
};

// 임시로 저장한 프로필 이미지를 회원 이미지로 변경한다.
function saveImage(tmpFileName, profileImage){
	var tmpDir = path.join(__dirname, '..', 'public', 'tmp');
	var profileDir = path.join(__dirname, '..', 'public', 'image', 'member');
	// TODO 임시 이미지를 member 폴더로 이동시킨다.
	fs.rename(path.join(tmpDir, tmpFileName)
					, path.join(profileDir, profileImage));
}

// 회원 가입
exports.registMember = function(options){
	// 등록할 회원 정보
	var member = {
		_id: options.params._id,
		password: options.params.password,
		regDate: new Date(),
		auth: 1
	};
	
	var tmpFileName = options.params.tmpFileName;
	// 프로필 이미지 파일명을 회원아이디로 지정한다.
	member.profileImage = member._id + path.extname(tmpFileName);

	db.member.insert(member, function(err, result){
		// 아이디 중복 여부 체크
		if(err && err.code == 11000){
			// TODO 아이디 중복 메세지 전송
			err = null;
			result = getError(ErrorCode.USER_DUPLICATE);
		}else{
			// TODO 프로필 이미지 저장
			saveImage(tmpFileName, member.profileImage);
		}
		options.callback(err, result);
	});
};

// 로그인 처리
exports.login = function(options){
	// TODO 지정한 아이디와 비밀번호로 회원 정보를 조회한다.
	db.member.findOne(options.params, {profileImage: 1, auth: 1}, function(err, result){
		if(!result){
			result = getError(ErrorCode.LOGIN_FAIL);
		}
		options.callback(err, result);
	});
};

// 회원 정보 조회
exports.getMember = function(options){
	// TODO 세션에서 아이디를 꺼낸다.
	var loginId = options.req.session.uid;	
	
	db.purchase.aggregate([
		{
			$match: {
				email: loginId
			}
		},
		{
			$lookup: {
				from: 'coupon',
				localField: 'couponId',
				foreignField: '_id',
				as: 'coupon'
			}
		},
		{
			$unwind: '$coupon'
		},
		{
			$lookup: {
				from: 'epilogue',
				localField: 'epilogueId',
				foreignField: '_id',
				as: 'epilogue'
			}
		},
		{
			$unwind: {
				path: '$epilogue',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$project: {
				_id: 1,
				couponId: 1, 
				regDate: 1,
				'coupon.couponName': '$coupon.couponName',
				'coupon.image.main': '$coupon.image.main',
				epilogue: 1
			}
		},
		{
			$sort: {
				regDate: -1
			}
		}
	]).toArray(function(err, result){
		if(err){
			clog.error(err);
		}else{
			clog.info(util.inspect(result, {depth: 5}));
			options.callback(err, result);
		}
	});	
};

// 회원 정보 수정
exports.updateMember = function(options){
	var loginId = options.req.session.uid;  
	var oldPassword = options.params.oldPassword;
	// 이전 비밀번호로 회원 정보를 조회한다.
	db.member.findOne({_id: loginId, password: oldPassword}, function(err, member){
		if(!member){
			options.callback(null, getError(ErrorCode.PASSWORD_INCORRECT));
		}else{
			// 비밀번호 수정일 경우
			if(options.params.password.trim() != ''){
				member.password = options.params.password;
			}

			var tmpFileName = options.params.tmpFileName;
			// 프로필 이미지를 수정할 경우
			if(tmpFileName){
				// 프로필 이미지 파일명을 회원아이디로 지정한다.
				member.profileImage = member._id + path.extname(tmpFileName);
				saveImage(tmpFileName, member.profileImage);	
			}
			// 회원 정보를 수정한다.
			db.member.update({_id: loginId}, member, function(err, result){
				options.callback(err, result);
			});
		}
	});
};

// 쿠폰 후기 등록
exports.insertEpilogue = function(options){
	var loginId = options.req.session.uid;
	var purchaseId = new ObjectId(options.params.purchaseId);
	delete options.params.purchaseId;
	
  var epilogue = options.params;
  epilogue._id = new ObjectId();
  epilogue.regDate = new Date();	// 등록일
  epilogue.couponId = ObjectId(options.params.couponId);
  epilogue.writer = loginId;
  db.epilogue.insert(epilogue, function(err, result){
  	// 구매 컬렉션에 후기 아이디를 등록한다.
  	db.purchase.update({_id: purchaseId}
  									, {$set: {epilogueId: epilogue._id}}
  									, function(){
  		// 후기 등록에 성공했을 경우
	    // 쿠폰 컬렉션의 후기 수와 만족도 합계를 업데이트 한다.
	    db.coupon.findOne({_id: epilogue.couponId}, {epilogueCount: 1, satisfactionAvg: 1}, function(err, coupon){
	      var query = {
	        $inc: {epilogueCount: 1},
	        $set: {satisfactionAvg: (coupon.satisfactionAvg*coupon.epilogueCount+parseInt(epilogue.satisfaction))/(coupon.epilogueCount+1)}
	      };
	      db.coupon.update({_id: epilogue.couponId}, query, function(){
	        options.callback(err, epilogue);
	      });
	    });
  	});   
  });
};

// add a new post
exports.addNewPost = function(options) {
	var post = options.params;
	post._id = new ObjectId();
	post.title = options.params.post_title;
	post.content = options.params.post_content;
	post.write = options.req.session.uid;
	post.createDate = new Date();
	post.modifyDate = new Date();
	post.viewCount = 0;	
  
	db.post.insert(post, function(err, result){
		options.callback(err, post);
	});
}

const ErrorCode = {	
	LOGIN_FAIL: 102,
	PASSWORD_INCORRECT: 103,
	USER_DUPLICATE: 104
};
const ErrorMessage = {
	102: '아이디와 비밀번호를 확인하시기 바랍니다.',
	103: '이전 비밀번호가 맞지 않습니다.',
	104: '이미 등록된 이메일입니다.'
};

function getError(code){
	return {
		error: code,
		message: ErrorMessage[code]
	};
}
















