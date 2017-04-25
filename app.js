var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var clog = require('clog');
var ejsLocals = require('ejs-locals');
var session = require('express-session');
var loginCheck = require('./middleware/logincheck');

var index = require('./routes/index');

var app = express();

// view engine setup
app.engine('ejs', ejsLocals);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'image', 'favicon.ico')));

app.use(function(req, res, next){
	if(req.url == '/'){
		res.redirect('/today.html');
	}else{
		next();
	}
});

var skipLog = {
	'.gif': 1, '.jpg': 1, '.png': 1, '.svg': 1, 
	'.css': 1, '.ttf': 1, '.ico': 1, '.js': 1
};
app.use(logger('dev', {skip: function(req, res){
	var ext = path.extname(req.url);
	return skipLog[ext];
}}));

app.use(function(req, res, next){
	clog.debug('before cookie', req.cookies);
	clog.debug('before req.body', req.body);
	clog.debug('before session', req.session);
	next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
	cookie: {maxAge: 1000*60*30},	// 쿠키 유지시간 30분
	secret: 'keyboard cat',
	rolling: true	// 매 요청마다 쿠키 갱신
}));

app.use(loginCheck);

app.use(function(req, res, next){
	clog.debug('after cookie', req.cookies);
	clog.debug('after req.body', req.body);
	clog.debug('after session', req.session);
	next();
});

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error(req.url + ' Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
//	console.error(err);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
