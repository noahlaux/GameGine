/*!
 * nodechat.js
 * Copyright(c) 2011 Justin Slattery <justin.slattery@fzysqr.com> 
 * MIT Licensed
 */

/*
 * Include core dependencies.  
 */
var _ = require('underscore')._
    , Backbone = require('backbone');

/*
 * Include our own modules
 */
var models = require('./models/models')
    , auth = require('./lib/auth');

/*
 * Require redis and setup the client 
 */
var redis = require('redis')
    , rc = redis.createClient();

rc.on('error', function (err) {
    console.log('Error ' + err);
});

/*
 * Setup connect, express, socket, and the connect-redis session store
 */
var express = require('express'),
  sio = require('socket.io'),
  MemoryStore = express.session.MemoryStore,
  sessionStore = new MemoryStore(),
  RedisStore = require('connect-redis')(express);

var app = module.exports = express.createServer();

var games = require('./scripts/games.js');
//var user = GAMEGINE.user.get(1);

var users = require('./scripts/user_module.js');
var clients = require('./scripts/clients.js');


var urlpaser = require('url');

var authCheck = function (req, res, next) {
    url = req.urlp = urlpaser.parse(req.url, true);
    
    // ####
    // Logout
    if ( url.pathname == "/logout" ) {
      req.session.destroy();
    }

    // ####
    // Is User already validated?
    if (req.session && req.session.auth == true) {
      next(); // stop here and pass to the next onion ring of connect
      return;
    }

    // ########
    // Auth - Replace this simple if with you Database or File or Whatever...
    // If Database, you need a Async callback...
    if ( url.pathname == "/login" && 
         url.query.name == "max" && 
         url.query.pwd == "herewego"  ) {
      req.session.auth = true;
      next();
      return;
    }

    // ####
    // User is not unauthorized. Stop talking to him.
    //res.writeHead(403);
    //res.end('Sorry you are unauthorized.\n\nFor a login use: /login?name=max&pwd=herewego');
    res.redirect('/login');
    return;
}


var io = sio.listen(app)
  , nicknames = {};

/*
var parseCookie = require('connect').utils.parseCookie;
 
var Session = require('connect').middleware.session.Session;

io.set('authorization', function (data, accept) {
    if (data.headers.cookie) {
        data.headers.cookie.name = 'noahlaux'
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['express.sid'];
        // save the session store to the data object 
        // (as required by the Session constructor)
        data.sessionStore = sessionStore;
              
        sessionStore.get(data.sessionID, function (err, session) {
            if (err) {
                accept(err.message, false);
            } else {
                // create a session object, passing data as request and our
                // just acquired session data
                data.session = new Session(data, session);
                accept(null, true);
            }
        });
    } else {
       return accept('No cookie transmitted.', false);
    }
});
*/
io.sockets.on('connection', function (socket) {
    
    var hs = socket.handshake;
    // setup an inteval that will keep our session fresh
    var intervalID = setInterval(function () {
        // reload the session (just in case something changed,
        // we don't want to override anything, but the age)
        // reloading will also ensure we keep an up2date copy
        // of the session with our connection.
        hs.session.reload( function () { 
            // "touch" it (resetting maxAge and lastAccess)
            // and save it back again.
            hs.session.touch().save();
        });
    }, 60 * 1000);
    
    // Annaunce new session to Master server
    io.sockets.emit('session', sessionStore);
    
    socket.on('disconnect', function () {
        console.log('A socket with sessionID ' + hs.sessionID 
            + ' disconnected!');
        // clear the socket interval to stop refreshing the session
        clearInterval(intervalID);
    });
    
  socket.on('get clients', function() {
    io.sockets.emit('clients', clients.get());
  });
  
  socket.on('get users', function(type) {
    //socket.broadcast.emit('users', users.get());
    io.sockets.emit('users', users.get()); 
  });

  socket.on('login', function (id) {
    users.login(id);
    io.sockets.emit('users', users.get()); 
    console.log(users.online());
  });
  
  socket.on('logoff', function (id) {
    // TODO
    users.logoff(id);
    io.sockets.emit('users', users.get()); 
  });
  
  socket.on('disconnectAll', function () {
    users.disconnectAll();
  });
  
  //function updateUsers() {
     //socket.broadcast.emit('update users', userCount);
  //}
  
  //socket.broadcast.emit('newUser', userCount);
  
  socket.on('user message', function (msg) {
    socket.broadcast.emit('user message', socket.nickname, msg);
  });

  socket.on('nickname', function (nick, fn) {
    if (nicknames[nick]) {
      fn(true);
    } else {
      fn(false);
      nicknames[nick] = socket.nickname = nick;
      socket.broadcast.emit('announcement', nick + ' connected');
      io.sockets.emit('nicknames', nicknames);
    }
  });

});

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    store: new RedisStore, 
    secret: 'secret', 
    key: 'express.sid'
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions : true,
    showStack : true
  }));
});

app.configure('production', function() {
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res) {
  res.render('index', {
    title : 'GAMEGINE'
  });
});

app.get('/games', function(req, res) {
  res.render('games', {
    sess : req.session,
    title : 'GAMEGINE',
    games : games.getList()
  });
});

app.get('/games/:id', restrictAccess, function(req, res) {
  req.session.username = req.session.username ? req.session.username : 'noahlaux';
  
  res.render('games/test', {
    sess : req.session,
    title : 'Testspil',
    session : sessionStore
  });
});

/*
 * Route: GET /login
 *
 * Template: login.jade 
 */
app.get('/login', function(req, res){
  res.render('login', {
    title: 'Login'
  })
});

/*
 * Route: POST /login
 *
 * Calls the authentication module to verify login details. Failures are redirected back to the login page.
 *
 * If the authentication module gives us a user object back, we ask connect to regenerate the session and send the client back to index. Note: we specify a _long_ cookie age so users won't have to log in frequently. We also set the httpOnly flag to false (I know, not so secure) to make the cookie available over [Flash Sockets](http://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/flash/net/Socket.html).
 */ 
app.post('/login', function(req, res){
    auth.authenticateUser(req.body.username, req.body.password, function(err, user){
        if (user) {
            req.session.regenerate(function(){
                req.session.cookie.maxAge = 100 * 24 * 60 * 60 * 1000; //Force longer cookie age
                req.session.cookie.httpOnly = false;
                req.session.user = user;

                res.redirect('/');
            });
        } else {
            req.session.error = 'Authentication failed, please check your username and password.';
            res.redirect('back');
        }
    });
});

/*
 * Route: GET /signup:
 *
 * Template: signup.jade
 */
app.get('/signup', function (req, res) {
    res.render('signup');
});

/*
 * Route: POST /signup
 *
 * Calls createNewUserAccount() in the auth module, redirects to /login if a user object is returned. Redirects to /signup if not.
 */
app.post('/signup', function (req, res) {
    auth.createNewUserAccount(req.body.username, req.body.password1, req.body.password2, req.body.email, req.body.ponies, function (err, user) {
        if ((err) || (!user)) {
            req.session.error = 'New user failed, please check your username and password.';
            res.redirect('back');
        }
        else if (user) {
            res.redirect('/login');
        }
    });
});

/*
 *  Tell connect to destory the session.
 */

app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

/*
 * Serve up any static file requested by the client
 *
 * TODO: should restrict this to only server *public* routes.
 */
app.get('/*.(js|css)', function (req, res) {
    res.sendfile('./' + req.url);
});

/*
 *  Middleware that decides what a valid login looks like. In this case, just verify that we have a session object for the user.
 *
 *  This is an express [route middleware](http://expressjs.com/guide.html#route-middleware). Control is passed to the middleware function before the route function is called. We use restrictAccess() to verify that we have a valid user key in the session, implying that authentication has succeeded, before we send the client to the index.jade template. If we do not have a valid user in the session, then we redirect to the '/login' route. This effectively locks down our '/' route from unauthenticated access. You could add the restrictAccess() all to any route you want to protect.
 */
function restrictAccess(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}


/*
app.get('/logout', function(req, res){
  if (req.session) {
    req.session.auth = null;
    res.clearCookie('auth');
    req.session.destroy(function() {});
  }
  res.redirect('/login');
});
*/

function loadUser(req, res, next){
  if (req.session.auth) {
    next();
  } else {
    res.redirect('/login');
  }
};

/*
 * Fire up the webserver
 */
app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
