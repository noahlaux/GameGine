/*!
 * gamegine // gameserver
 * Copyright(c) 2011 Noah Laux <noahlaux@gmail.com>
 */

/*
 * Include core dependencies.
 */
var _ = require('underscore')._, Backbone = require('backbone');

/*
 * Include our own modules
 */
var models = require('./models/models'), auth = require('./lib/auth');

/*
* Require redis and setup the client
*/
//var redis = require('redis')
//    , rc = redis.createClient();

//rc.on('error', function (err) {
//    console.log('Error ' + err);
//});

/*
 * Setup connect, express, socket, and the connect-redis session store
 */
var express = require('express'),
//io = require('socket.io'),
MemoryStore = express.session.MemoryStore, sessionStore = new MemoryStore();
//RedisStore = require('connect-redis')(express);

var app = module.exports = express.createServer();

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    store : sessionStore,
    secret : 'secret',
    key : 'express.sid'
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});
var games = require('./scripts/games.js');
//var user = GAMEGINE.user.get(1);

var users = require('./scripts/user_module.js');
var clients = require('./scripts/clients.js');

var parseCookie = require('connect').utils.parseCookie;

var Session = require('connect').middleware.session.Session;

/*
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

//create local state
var activeClients = 0;

/*
 * When we have a client that shouldn't be connected, __kick 'em off!__'
 *
 * @param {object} client
 * @param {function} fn
 */
function disconnectAndRedirectClient(client, fn) {
  console.log('Disconnecting unauthenticated user');
  client.send({
    event : 'disconnect'
  });
  //client.connection.end();
  return fn();
}

/*
 * Event handler for client disconnects. Simply broadcasts the new active client count.
 *
 * @param {object} client
 */
function clientDisconnect(client) {
  activeClients -= 1;
  client.broadcast({
    clients : activeClients
  });
}

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

app.get('/games/:id', function(req, res) {
  //req.session.username = req.session.username ? req.session.username : 'noahlaux';

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
app.get('/login', function(req, res) {
  res.render('login', {
    title : 'Login'
  })
});
/*
 * Route: POST /login
 *
 * Calls the authentication module to verify login details. Failures are redirected back to the login page.
 *
 * If the authentication module gives us a user object back, we ask connect to regenerate the session and send the client back to index. Note: we specify a _long_ cookie age so users won't have to log in frequently. We also set the httpOnly flag to false (I know, not so secure) to make the cookie available over [Flash Sockets](http://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/flash/net/Socket.html).
 */
app.post('/login', function(req, res) {
  auth.authenticateUser(req.body.username, req.body.password, function(err, user) {
    if(user) {
      req.session.regenerate(function() {
        req.session.cookie.maxAge = 100 * 24 * 60 * 60 * 1000;
        //Force longer cookie age
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
app.get('/signup', function(req, res) {
  res.render('signup');
});
/*
 * Route: POST /signup
 *
 * Calls createNewUserAccount() in the auth module, redirects to /login if a user object is returned. Redirects to /signup if not.
 */
app.post('/signup', function(req, res) {
  auth.createNewUserAccount(req.body.username, req.body.password1, req.body.password2, req.body.email, req.body.ponies, function(err, user) {
    if((err) || (!user)) {
      req.session.error = 'New user failed, please check your username and password.';
      res.redirect('back');
    } else if(user) {
      res.redirect('/login');
    }
  });
});
/*
 *  Tell connect to destory the session.
 */

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/');
  });
});
/*
 * Serve up any static file requested by the client
 *
 * TODO: should restrict this to only server *public* routes.
 */

app.get('/*.(js|css)', function(req, res) {
  res.sendfile('./' + req.url);
});
/*
 *  Middleware that decides what a valid login looks like. In this case, just verify that we have a session object for the user.
 *
 *  This is an express [route middleware](http://expressjs.com/guide.html#route-middleware). Control is passed to the middleware function before the route function is called. We use restrictAccess() to verify that we have a valid user key in the session, implying that authentication has succeeded, before we send the client to the index.jade template. If we do not have a valid user in the session, then we redirect to the '/login' route. This effectively locks down our '/' route from unauthenticated access. You could add the restrictAccess() all to any route you want to protect.
 */
function restrictAccess(req, res, next) {
  if(req.session.user) {
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

/*
 var socket = io.listen(app);

 socket.sockets.on('connection', function (client) {

 console.log("User connected");

 client.connectSession = function (fn) {

 if (!client.request || !client.request.headers || !client.request.headers.cookie) {
 disconnectAndRedirectClient(client, function () {
 console.log('Null request/header/cookie!');
 });
 return;
 }

 console.log('Cookie is' + client.request.headers.cookie);

 var match, sid;
 match = client.request.headers.cookie.match(/connect\.sid=([^;]+)/);
 if (!match || match.length < 2) {
 disconnectAndRedirectClient(client, function () {
 console.log('Failed to find connect.sid in cookie');
 });
 return;
 }

 sid = unescape(match[1]);

 rc.get(sid, function (err, data) {
 fn(err, JSON.parse(data));
 });
 };

 client.connectSession(function (err, data) {
 if (err) {
 console.log('Error on connectionSession: ' + err);
 return;
 }

 client.user = data.user;

 activeClients += 1;
 client.on('disconnect', function () {
 clientDisconnect(client);
 });

 client.on('message', function (msg) {
 chatMessage(client, socket, msg);
 });

 console.log('User successfully connected with ' + data.user.name + ' hash ' + data.user.hashPass);

 // Annaunce new session to Master server
 socket.sockets.emit('session', Session);

 socket.broadcast({
 event: 'update',
 clients: activeClients
 });

 var ponyWelcome = new models.ChatEntry({name: 'PonyBot', text: 'Hello ' + data.user.name + '. I also feel that ponies ' + data.user.ponies + '. Welcome to nodechat.js'});

 socket.broadcast({
 event: 'chat',
 data: ponyWelcome.xport()
 });
 });

 client.on('disconnect', function () {
 console.log('A socket with sessionID ' + Session
 + ' disconnected!');
 // clear the socket interval to stop refreshing the session
 //clearInterval(intervalID);
 });

 client.on('get clients', function() {
 socket.sockets.emit('clients', clients.get());
 });

 client.on('get users', function(type) {
 //socket.broadcast.emit('users', users.get());
 socket.sockets.emit('users', sessionStore.sessions);
 });

 client.on('login', function (id) {
 users.login(id);
 socket.sockets.emit('users', users.get());
 console.log(users.online());
 });

 client.on('logoff', function (id) {
 // TODO
 users.logoff(id);
 socket.sockets.emit('users', users.get());
 });

 client.on('disconnectAll', function () {
 users.disconnectAll();
 });

 //function updateUsers() {
 //socket.broadcast.emit('update users', userCount);
 //}

 //socket.broadcast.emit('newUser', userCount);

 client.on('user message', function (msg) {
 client.broadcast.emit('user message', socket.nickname, msg);
 });

 });
 */
/*
 * Fire up the webserver
 */
app.listen(3001);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env); (function() {
  var everyone = require("now").initialize(app);

  // Create primary key to keep track of all the clients that
  // connect. Each one will be assigned a unique ID.
  var primaryKey = 0;
  everyone.now.playerCount = 0;

  // When a client has connected, assign it a UUID. In the
  // context of this callback, "this" refers to the specific client
  // that is communicating with the server.
  //
  // NOTE: This "uuid" value is NOT synced to the client; however,
  // when the client connects to the server, this UUID will be
  // available in the calling context.
  /*
  everyone.connected(
  function(){
  this.now.uuid = ++primaryKey;
  everyone.now.createPlayer(this.now.uuid);
  now.createPlayer(this.now.uuid);
  }
  )
  */
  // Calls the `start` function upon a new client connection
  everyone.on('connect', function() {
    everyone.now.playerCount++;
    this.now.uuid = ++primaryKey;
    everyone.now.createPlayer(this.now.uuid);
    this.now.createOpponents();
  });
  
  // Add a broadcast function to *every* client that they can call
  // when they want to sync the position of the draggable target.
  // In the context of this callback, "this" refers to the
  // specific client that is communicating with the server.
  everyone.now.syncPosition = function(position) {

    // Now that we have the new position, we want to broadcast
    // this back to every client except the one that sent it in
    // the first place! As such, we want to perform a server-side
    // filtering of the clients. To do this, we will use a filter
    // method which filters on the UUID we assigned at connection
    // time.
    everyone.now.filterUpdateBroadcast(this.now.uuid, position);
    console.log('syncPosition - u:' + this.now.uuid + ' t:' + position.top);
  };
  // We want the "update" messages to go to every client except
  // the one that announced it (as it is taking care of that on
  // its own site). As such, we need a way to filter our update
  // broadcasts. By defining this filter method on the server, it
  // allows us to cut down on some server-client communication.
  everyone.now.filterUpdateBroadcast = function(masterUUID, position) {
    // Make sure this client is NOT the same client as the one
    // that sent the original position broadcast.
    if(this.now.uuid == masterUUID) {
      // Return out of guard statement - we don't want to
      // send an update message back to the sender.
      return;
    }

    // If we've made it this far, then this client is a slave
    // client, not a master client.
    everyone.now.updatePosition(this.now.uuid, position);
  }

  everyone.now.log_server = function(msg) {
    console.log(msg);
  }
})()