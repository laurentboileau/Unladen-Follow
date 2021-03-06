var sys = require('util');
var oauth = require('oauth');
var config = require('../config.js');


var _twitterConsumerKey = config.TWITTER_CONSUMER_KEY;
var _twitterConsumerSecret = config.TWITTER_CONSUMER_SECRET;
console.log("_twitterConsumerKey: %s and _twitterConsumerSecret %s", _twitterConsumerKey, _twitterConsumerSecret);
 
function consumer(next) {

  return new oauth.OAuth(
    'https://api.twitter.com/oauth/request_token', 
    'https://api.twitter.com/oauth/access_token', 
     _twitterConsumerKey, 
     _twitterConsumerSecret, 
     "1.0A", 
     config.HOSTPATH+'/twitter/callback?next='+next, 
     "HMAC-SHA1"
   );
}

exports.sanitizeUsername = function(username) {
  var whitelist = require('validator').whitelist;
  return whitelist(username, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890_');
}

var twitterRequest = function(req, res, path, shouldAuth, extraParams) {
  sys.puts("oauthRequestToken>>"+req.session.oauthRequestToken);
  sys.puts("oauthRequestTokenSecret>>"+req.session.oauthRequestTokenSecret);
  sys.puts("oauth_verifier>>"+req.session.oauthVerifier);

  if (extraParams) {
    extraParams = extraParams + "&"
  }

  var page_size = 100;
  var timeout = 20;
  var page = req.params.page ? parseInt(req.params.page, 10) : 1;

  console.log(req.params);


  if (page > 10) {
    page = 10;
  }

  var apiEndpoint = "https://api.twitter.com/1.1" + path + ".json?" + extraParams + "count=" + page_size + "&page=" + page;

  console.log(apiEndpoint);

  consumer().get(apiEndpoint, 
                  req.session.oauthAccessToken, 
                  req.session.oauthAccessTokenSecret, 
                  function (error, data, response) {  //callback when the data is ready
    if (error) {
      console.log(sys.inspect(response.headers));

      var ratelimit = response.headers['x-rate-limit-reset'];

      console.log("Rate limit", ratelimit);

      var handoff = {
        twitter_error: error.statusCode,
        twitter_ratelimit: ratelimit,
        twitter_error_response: error
      };


      res.send(handoff, 200);
    } else {
      //data = JSON.parse(data);
      //req.session.twitterScreenName = data["screen_name"];  
      res.json(JSON.parse(data));
    }  
  });  
};

exports.user = function(req, res) {
  var user = exports.sanitizeUsername(req.params.user);

  twitterRequest(req, res, "/statuses/user_timeline", false, "screen_name=" + user);
}

exports.timeline = function(req, res) {
  twitterRequest(req, res, "/statuses/home_timeline", true);
}
 
exports.connect = function(req, res) {
  var next = req.query.next;

  consumer(next).getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results){ //callback with request token
    if (error) {
      res.send("Error getting OAuth request token : " + sys.inspect(error), 500);
    } else { 
      sys.puts("results>>"+sys.inspect(results));
      sys.puts("oauthToken>>"+oauthToken);
      sys.puts("oauthTokenSecret>>"+oauthTokenSecret);
 
      req.session.oauthRequestToken = oauthToken;
      req.session.oauthRequestTokenSecret = oauthTokenSecret;
      res.redirect("https://api.twitter.com/oauth/authorize?oauth_token="+req.session.oauthRequestToken);    
    }
  });
};
 
 
exports.callback = function(req, res){
  // Oauth callback from Twitter

  var next = req.query.next;

  sys.puts("oauthRequestToken>>"+req.session.oauthRequestToken);
  sys.puts("oauthRequestTokenSecret>>"+req.session.oauthRequestTokenSecret);
  sys.puts("oauth_verifier>>"+req.query.oauth_verifier);

  // Save oAuth verifier
  req.session.oauthVerifier = req.query.oauth_verifier;

  consumer().getOAuthAccessToken(
    req.session.oauthRequestToken, 
    req.session.oauthRequestTokenSecret, 
    req.session.oauthVerifier, 
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) { //callback when access_token is ready
    if (error) {
      res.send("Error getting OAuth access token : " + sys.inspect(error), 500);
    } else {
      req.session.oauthAccessToken = oauthAccessToken;
      req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;

      if (next) {
          res.redirect(next);        
      } else {
        res.send("Authenticated with Twitter. Have a wonderful day.");
      }
    }
  });
};
