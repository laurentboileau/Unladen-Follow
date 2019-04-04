var express = require('express')
  , routes = require('./routes')
  , twitter = require('./routes/twitter')
  , http = require('http')
  , path = require('path');
  
var bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , errorHandler = require('errorhandler')
  , favicon = require('serve-favicon')
  , methodOverride = require('method-override')
  , logger = require('morgan')
  , session = require('express-session');
 
var config = require('./config.js');
console.log(config.PORT);

var app = express();
 
// all environments
app.set('port', config.PORT || 3000);
app.set('views', __dirname + '/views');

app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());
app.use(cookieParser());
app.use(session({ 
  secret: config.EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(function(req, res, next) {
  res.locals.user = req.session.user; // just boilerplate?
  res.locals.isLoggedIn = !!(req.session.oauthVerifier);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// development only
if (app.get('env') === 'development') {
  app.use(errorHandler({ dumpExceptions: true, showStack: true }));
}

var isLoggedIn = true; // todo: this is wrong
 
app.get('/', routes.index );
app.get('/scan', routes.scan);
app.get('/u/:user', routes.single); 
app.get('/twitter/timeline', twitter.timeline); 
app.get('/twitter/timeline/:page', twitter.timeline); 
app.get('/twitter/user/:user', twitter.user); 
app.get('/twitter/connect', twitter.connect); 
app.get('/twitter/callback', twitter.callback); 
 

app.get('/about', routes.about); 
app.get('/anatomy', routes.anatomy); 
 
app.listen(parseInt(config.PORT || 3000));