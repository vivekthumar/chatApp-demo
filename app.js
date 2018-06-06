var express = require('express');
var app = express();
var http = require('http').Server(app);
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);
var methodOverride = require('method-override');
var path = require('path');
var fs = require('fs');
var logger = require('morgan');


var port = process.env.PORT || 5000;


require('./libs/chat.js').sockets(http);

app.use(logger('dev'));


var dbPath = "mongodb://localhost/socketChatDB";
mongoose.connect(dbPath);
mongoose.connection.once('open', function () {
  console.log("Database Connection Established Successfully.");
});

app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));


var sessionInit = session({
  name: 'userCookie',
  secret: '9974-995-511-vivek',
  resave: true,
  httpOnly: true,
  saveUninitialized: true,
  store: new mongoStore({
    mongooseConnection: mongoose.connection
  }),
  cookie: {
    maxAge: 80 * 80 * 800
  }
});

app.use(sessionInit);

app.use(express.static(path.resolve(__dirname, './public')));

app.set('views', path.resolve(__dirname, './app/views'));
app.set('view engine', 'ejs');


app.use(bodyParser.json({
  limit: '10mb',
  extended: true
}));
app.use(bodyParser.urlencoded({
  limit: '10mb',
  extended: true
}));
app.use(cookieParser());
fs.readdirSync("./app/models").forEach(function (file) {
  if (file.indexOf(".js")) {
    require("./app/models/" + file);
  }
});

fs.readdirSync("./app/controllers").forEach(function (file) {
  if (file.indexOf(".js")) {
    var route = require("./app/controllers/" + file);
    route.controller(app);
  }
});

app.use(function (req, res) {
  res.status(404).render('message', {
    title: "404",
    msg: "Page Not Found.",
    status: 404,
    error: "",
    user: req.session.user,
    chat: req.session.chat
  });
});


var userModel = mongoose.model('User');

app.use(function (req, res, next) {

  if (req.session && req.session.user) {
    userModel.findOne({
      'email': req.session.user.email
    }, function (err, user) {

      if (user) {
        req.user = user;
        delete req.user.password;
        req.session.user = user;
        delete req.session.user.password;
        next();
      }

    });
  } else {
    next();
  }

}); 


http.listen(port, function () {
  console.log("Megic happen on " + port);
});