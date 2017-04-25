var express = require('express');
var router = express.Router();
var dao = require('../model/mulpangDao');
var clog = require('clog');

/* GET home page. */
router.get('/all.html', function(req, res, next) {
  res.render('today', { title: 'Mulpang', bodyId: 'all', js: 'today.js', uid: req.session.uid, img: req.session.img, auth: req.session.auth });
});

router.get('/newPost.html', function(req, res, next) {
  res.render('newPost', { title: 'Mulpang', bodyId: 'all', js: 'bbs.js', uid: req.session.uid, img: req.session.img, auth: req.session.auth });
});

router.get('/*.html', function(req, res, next) {
	var url = req.url.substring(1, req.url.indexOf('.html'));
  res.render(url, { title: 'Mulpang', bodyId: url, js: url+'.js', uid: req.session.uid, img: req.session.img, auth: req.session.auth });
});

// DB 처리가 필요한 모든 요청에 사용
// http://localhost/request?cmd=couponList
// http://localhost/request?cmd=couponDetail&_id=acd76567bcd
router.all('/request', function(req, res, next) {
  var params = {};
  if(req.method == 'GET'){
  	params = req.query;	// GET 방식의 요청일때 쿼리스트링
  	console.log(params);
  }else if(req.method == 'POST'){
  	params = req.body;	// POST 방식의 요청일때 쿼리스트링
  }
  var cmd = params.cmd;
  delete params.cmd;
  var options = {
  	req: req,
  	res: res,
  	params: params,
  	callback: function(err, data){
  		if(err){
  			clog.error(err);
  			res.json({error: 500, message: '요청한 작업에 실패했습니다. 잠시후 다시 시도해 주시기 바랍니다.'});
  		}else{
  			res.json(data);
  		}
  	}
  };  
  dao[cmd](options);
});


// 임시 파일 업로드 폴더 생성
var path = require('path');
var fs = require('fs');
var tmp = path.join(__dirname, '..', 'public', 'tmp');
fs.stat(tmp, function(err, stats){
	if(!stats) fs.mkdir(tmp);
});

// 프로필 이미지 업로드
var multiparty = require('multiparty');
router.post('/upload', function(req, res, next){
	var form = new multiparty.Form({
		uploadDir: tmp
	});
	form.on('file', function(name, file){
		var tmpName = path.basename(file.path);
		res.end(tmpName);
	});
	form.parse(req);
});

// 로그인 처리
router.post('/login', function(req, res, next){
	dao.login({
		params: req.body,
		callback: function(err, data){
			if(err){
  			clog.error(err);
  			res.json({error: 500, message: '요청한 작업에 실패했습니다. 잠시후 다시 시도해 주시기 바랍니다.'});
  		}else{
  			// 세션에 아이디와 프로필 이미지 저장
  			if(!data.error){
  				req.session.uid = data._id;
  				req.session.img = data.profileImage;
				req.session.auth = data.auth;
  			}
  			res.json(data);
  		}
		}
	});
});

// 로그아웃 처리
router.get('/logout', function(req, res, next){
	// 세션 삭제
	req.session.destroy();
	res.redirect('/');
});


module.exports = router;














