var socketio = require('socket.io');
var mongoose = require('mongoose');
var events = require('events');
var _ = require('lodash');
var eventEmitter = new events.EventEmitter();

require('../app/models/user.js');
require('../app/models/chat.js');
require('../app/models/room.js');

var userModel = mongoose.model('User');
var chatModel = mongoose.model('Chat');
var roomModel = mongoose.model('Room');

module.exports.sockets = function (http) {
  io = socketio.listen(http);
  var ioChat = io.of('/chat');
  var userStack = {};
  var oldChats, sendUserStack, setRoom;
  var userSocket = {};
  ioChat.on('connection', function (socket) {
    console.log("connected.");
    socket.on('set-user-data', function (username) {
      socket.username = username;
      userSocket[socket.username] = socket.id;

      socket.broadcast.emit('broadcast', {
        description: username + ' Logged In'
      });
      eventEmitter.emit('get-all-users');
      sendUserStack = function () {
        for (i in userSocket) {
          for (j in userStack) {
            if (j == i) {
              userStack[j] = "Online";
            }
          }
        }
        ioChat.emit('onlineStack', userStack);
      }

    });

    socket.on('set-room', function (room) {
      socket.leave(socket.room);
      eventEmitter.emit('get-room-data', room);
      setRoom = function (roomId) {
        socket.room = roomId;
        socket.join(socket.room);
        ioChat.to(userSocket[socket.username]).emit('set-room', socket.room);
      };

    });

    socket.on('old-chats-init', function (data) {
      eventEmitter.emit('read-chat', data);
    });

    socket.on('old-chats', function (data) {
      eventEmitter.emit('read-chat', data);
    });

    oldChats = function (result, username, room) {
      ioChat.to(userSocket[username]).emit('old-chats', {
        result: result,
        room: room
      });
    }

    socket.on('chat-msg', function (data) {
      eventEmitter.emit('save-chat', {
        msgFrom: socket.username,
        msgTo: data.msgTo,
        msg: data.msg,
        room: socket.room,
        date: data.date
      });
      ioChat.to(socket.room).emit('chat-msg', {
        msgFrom: socket.username,
        msg: data.msg,
        date: data.date
      });
    });

    socket.on('disconnect', function () {
      socket.broadcast.emit('broadcast', {
        description: socket.username + ' Logged out'
      });
      console.log("chat disconnected.");
      _.unset(userSocket, socket.username);
      userStack[socket.username] = "Offline";
      ioChat.emit('onlineStack', userStack);
    });

  });
  eventEmitter.on('save-chat', function (data) {

    var newChat = new chatModel({
      msgFrom: data.msgFrom,
      msgTo: data.msgTo,
      msg: data.msg,
      room: data.room,
      createdOn: data.date

    });

    newChat.save(function (err, result) {});

  });

  eventEmitter.on('read-chat', function (data) {

    chatModel.find({})
      .where('room').equals(data.room)
      .sort('-createdOn')
      .skip(data.msgCount)
      .lean()
      .limit(5)
      .exec(function (err, result) {
        if (err) {
          console.log("Error : ", err);
        } else {
          oldChats(result, data.username, data.room);
        }
      });
  });


  eventEmitter.on('get-all-users', function () {
    userModel.find({})
      .select('username')
      .exec(function (err, result) {
        if (err) {
          console.log("Error : ", err);
        } else {
          for (var i = 0; i < result.length; i++) {
            userStack[result[i].username] = "Offline";
          }
          sendUserStack();
        }
      });
  });

  eventEmitter.on('get-room-data', function (room) {
    roomModel.find({
      $or: [{
        name1: room.name1
      }, {
        name1: room.name2
      }, {
        name2: room.name1
      }, {
        name2: room.name2
      }]
    }, function (err, result) {
      if (err) {
        console.log("Error : ", err);
      } else {
        if (result == "" || result == undefined || result == null) {

          var today = Date.now();

          newRoom = new roomModel({
            name1: room.name1,
            name2: room.name2,
            lastActive: today,
            createdOn: today
          });

          newRoom.save(function (err, newResult) {

            if (err) {
              console.log("Error : ", err);
            } else if (!newResult) {
              console.log("Some Error Occured During Room Creation.");
            } else {
              setRoom(newResult._id);
            }
          });

        } else {
          var jresult = JSON.parse(JSON.stringify(result));
          setRoom(jresult[0]._id);
        }
      }
    });
  });
  var ioSignup = io.of('/signup');

  var checkUname, checkEmail;

  ioSignup.on('connection', function (socket) {
    socket.on('checkUname', function (uname) {
      eventEmitter.emit('findUsername', uname); //event to perform database operation.
    });
    checkUname = function (data) {
      ioSignup.to(socket.id).emit('checkUname', data); //data can have only 1 or 0 value.
    };
    socket.on('checkEmail', function (email) {
      eventEmitter.emit('findEmail', email); //event to perform database operation.
    });
    checkEmail = function (data) {
      ioSignup.to(socket.id).emit('checkEmail', data); //data can have only 1 or 0 value.
    };
    socket.on('disconnect', function () {
      console.log("signup disconnected.");
    });

  });
  eventEmitter.on('findUsername', function (uname) {

    userModel.find({
      'username': uname
    }, function (err, result) {
      if (err) {
        console.log("Error : ", err);
      } else {
        if (result == "") {
          checkUname(1);
        } else {
          checkUname(0);
        }
      }
    });

  });
  eventEmitter.on('findEmail', function (email) {

    userModel.find({
      'email': email
    }, function (err, result) {
      if (err) {
        console.log("Error : ", err);
      } else {
        if (result == "") {
          checkEmail(1);
        } else {
          checkEmail(0);
        }
      }
    });

  });

  return io;

};