var express = require('express');
var mongoose = require('mongoose');


var auth = require('../../middlewares/auth.js');
var encrypt = require('../../libs/encrypt.js');

var router = express.Router();

var userModel = mongoose.model('User');

module.exports.controller = function (app) {


  router.get('/login', auth.loggedIn, function (req, res) {
    res.render('login', {
      title: "User Login",
      user: req.session.user,
      chat: req.session.chat
    });
  });


  router.get('/logout', function (req, res) {

    delete req.session.user;
    res.redirect('/user/login');

  });

  router.post('/api/v1/login', auth.loggedIn, function (req, res) {

    var epass = encrypt.encryptPassword(req.body.password);

    userModel.findOne({
      $and: [{
        'email': req.body.email
      }, {
        'password': epass
      }]
    }, function (err, result) {
      if (err) {
        res.render('message', {
          title: "Error",
          msg: "login error",
          status: 500,
          error: err,
          user: req.session.user,
          chat: req.session.chat
        });
      } else if (result == null || result == undefined || result == "") {
        res.render('message', {
          title: "Error",
          msg: "User Not Found.",
          status: 404,
          error: "",
          user: req.session.user,
          chat: req.session.chat
        });
      } else {
        req.user = result;
        delete req.user.password;
        req.session.user = result;
        delete req.session.user.password;
        res.redirect('/chat');
      }
    });
  });

  app.use('/user', router);

}