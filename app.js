var express = require('express');
var app = express();
app.use(express.static('public'));
app.use(express.static('dashboard'));
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
const passport=require('passport')
const passportlocal=require('passport-local')
const session=require('cookie-session')
const bodyParser=require('body-parser')
const cookieParser=require('cookie-parser')
const student=require('./model/model.js')
const mongoose=require('mongoose')
const path=require('path')
const flash = require('connect-flash');

app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public');

mongoose.connect("mongodb://localhost/devfest-portal")
app.use(session({name:'session',keys:['yash','mahajan']}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser());
app.use(flash());
var initPassport=require('./Authentication/init');
initPassport(passport);
var isAuthenticated = function (req, res, next) {
    // if user is authenticated in the session, call the next() to call the next request handler
    // Passport adds this method to request object. A middleware is allowed to add properties to
    // request and response objects
    if (req.isAuthenticated())
        return next();
    // if the user is not authenticated then redirect him to the login page
    res.redirect('/login');
}

var lobbyUsers = {};
var users = {};
var activeGames = {};

app.get('/1', function(req, res) {
    res.render('home.ejs',{user: req.user});

});

app.get('/home', function(req, res) {
  console.log("hello");
    res.render('home' , {user: req.user});

});

app.get('/game', isAuthenticated, function(req, res) {
 res.sendFile(__dirname + '/public/index.html');

});

app.get('/login', function(req, res) {
 res.sendFile(__dirname + '/public/login.html');

});
app.post('/login', passport.authenticate('login', {
        successRedirect: '/home',
        //failureRedirect: '/error',
        failureRedirect: '/error',
        failureFlash : true
    }));

app.get('/signup', function(req, res) {
 res.sendFile(__dirname + '/public/signup.html');

});
app.post('/signup', passport.authenticate('signup', {
        successRedirect: '/home',
        failureRedirect: '/error',
        failureFlash : true
    }));

app.get('/dashboard/', function(req, res) {
 res.sendFile(__dirname + '/dashboard/dashboard.html');
});

io.on('connection', function(socket) {
    console.log('new connection ' + socket);

    socket.on('login', function(userId) {
        console.log(userId + ' joining lobby');
        socket.userId = userId;

        if (!users[userId]) {
            console.log('creating new user');
            users[userId] = {userId: socket.userId, games:{}};
        } else {
            console.log('user found!');
            Object.keys(users[userId].games).forEach(function(gameId) {
                console.log('gameid - ' + gameId);
            });
        }

        socket.emit('login', {users: Object.keys(lobbyUsers),
                              games: Object.keys(users[userId].games)});
        lobbyUsers[userId] = socket;

        socket.broadcast.emit('joinlobby', socket.userId);
    });

    socket.on('invite', function(opponentId) {
        console.log('got an invite from: ' + socket.userId + ' --> ' + opponentId);

        socket.broadcast.emit('leavelobby', socket.userId);
        socket.broadcast.emit('leavelobby', opponentId);


        var game = {
            id: Math.floor((Math.random() * 100) + 1),
            board: null,
            users: {white: socket.userId, black: opponentId}
        };

        socket.gameId = game.id;
        activeGames[game.id] = game;

        users[game.users.white].games[game.id] = game.id;
        users[game.users.black].games[game.id] = game.id;

        console.log('starting game: ' + game.id);
        lobbyUsers[game.users.white].emit('joingame', {game: game, color: 'white'});
        lobbyUsers[game.users.black].emit('joingame', {game: game, color: 'black'});

        delete lobbyUsers[game.users.white];
        delete lobbyUsers[game.users.black];

        socket.broadcast.emit('gameadd', {gameId: game.id, gameState:game});
    });

        socket.on('chat message', function(msg){
        io.emit('chat message', msg);
  });

     socket.on('resumegame', function(gameId) {
        console.log('ready to resume game: ' + gameId);

        socket.gameId = gameId;
        var game = activeGames[gameId];

        users[game.users.white].games[game.id] = game.id;
        users[game.users.black].games[game.id] = game.id;

        console.log('resuming game: ' + game.id);
        if (lobbyUsers[game.users.white]) {
            lobbyUsers[game.users.white].emit('joingame', {game: game, color: 'white'});
            delete lobbyUsers[game.users.white];
        }

        if (lobbyUsers[game.users.black]) {
            lobbyUsers[game.users.black] &&
            lobbyUsers[game.users.black].emit('joingame', {game: game, color: 'black'});
            delete lobbyUsers[game.users.black];
        }
    });

    socket.on('move', function(msg) {
        socket.broadcast.emit('move', msg);
        activeGames[msg.gameId].board = msg.board;
        console.log(msg);
    });

    socket.on('disconnect', function(msg) {

      console.log(msg);

      if (socket && socket.userId && socket.gameId) {
        console.log(socket.userId + ' disconnected');
        console.log(socket.gameId + ' disconnected');
      }

      delete lobbyUsers[socket.userId];

      socket.broadcast.emit('logout', {
        userId: socket.userId,
        gameId: socket.gameId
      });
    });

    /////////////////////
    // Dashboard messages
    /////////////////////

    socket.on('dashboardlogin', function() {
        console.log('dashboard joined');
        socket.emit('dashboardlogin', {games: activeGames});
    });

});
app.get('/signout', function(req, res) {
        req.logout();
        res.redirect('/home');
    });

http.listen(port, function() {
    console.log('listening on *: ' + port);
});
