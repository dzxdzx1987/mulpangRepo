var checkList = {
	buyCoupon: 1, 
	getMember: 1, 
	updateMember: 1, 
	insertEpilogue: 1
};
var loginCheck = function(req, res, next){
	var cmd = req.method == 'GET' ? req.query.cmd : req.body.cmd;
	if(checkList[cmd] && !req.session.uid){
		res.json({error: 101, message: '로그인이 필요한 서비스입니다.'});
	}else{
		next();
	}
};

module.exports = loginCheck;