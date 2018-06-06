$(function () {

  var socket = io('/chat');

  var username = $('#user').val();
  var noChat = 0;
  var msgCount = 0;
  var oldInitDone = 0;
  var roomId;
  var toUser;

  socket.on('connect', function () {
    socket.emit('set-user-data', username);
    socket.on('broadcast', function (data) {
      document.getElementById("hell0").innerHTML += '<li>' + data.description + '</li>';
      $('#hell0').scrollTop($('#hell0')[0].scrollHeight);
    });
  });

  socket.on('onlineStack', function (stack) {
    $('#list').empty();
    
    var totalOnline = 0;
    for (var user in stack) {
      if (user == username) {
        var txt1 = $('<button class="boxF disabled"> </button>').text(user).css({
          "font-size": "18px"
        });
      } else {
        var txt1 = $('<button id="ubtn" class="btn btn-success  btn-md">').text(user).css({
          "font-size": "18px"
        });
      }
      if (stack[user] == "Online") {
        var txt2 = $('<span class="badge"></span>').text("*" + stack[user]).css({
          "float": "right",
          "color": "#009933",
          "font-size": "18px"
        });
        totalOnline++;

      } else {
        var txt2 = $('<span class="badge"></span>').text(stack[user]).css({
          "float": "right",
          "color": "#a6a6a6",
          "font-size": "18px"
        });
      }
      $('#list').append($('<li>').append(txt1, txt2));
      $('#totalOnline').text(totalOnline);
    } 
    $('#scrl1').scrollTop($('#scrl1').prop("scrollHeight"));
  });

  $(document).on("click", "#ubtn", function () {
    $('#messages').empty();
    msgCount = 0;
    noChat = 0;
    oldInitDone = 0;
    toUser = $(this).text();
    $('#frndName').text(toUser);
    $('#initMsg').hide();
    $('#chatForm').show();
    $('#sendBtn').hide(); 
    if (toUser == "Group") {
      var currentRoom = "Group-Group";
      var reverseRoom = "Group-Group";
    } else {
      var currentRoom = username + "-" + toUser;
      var reverseRoom = toUser + "-" + username;
    }
    socket.emit('set-room', {
      name1: currentRoom,
      name2: reverseRoom
    });

  });

  socket.on('set-room', function (room) {
    $('#messages').empty();
    msgCount = 0;
    noChat = 0;
    oldInitDone = 0;
    roomId = room;
    socket.emit('old-chats-init', {
      room: roomId,
      username: username,
      msgCount: msgCount
    });
  });

  $('#scrl2').scroll(function () {
    if ($('#scrl2').scrollTop() == 0 && noChat == 0 && oldInitDone == 1) {
      $('#loading').show();
      socket.emit('old-chats', {
        room: roomId,
        username: username,
        msgCount: msgCount
      });
    }
  });

  socket.on('old-chats', function (data) {

    if (data.room == roomId) {
      oldInitDone = 1;
      if (data.result.length != 0) {
        $('#noChat').hide();
        for (var i = 0; i < data.result.length; i++) {
          var chatDate = moment(data.result[i].createdOn).format("MMMM Do YYYY, hh:mm:ss a");
          var txt1 = $('<span></span>').text(data.result[i].msgFrom + " : ").css({
            "color": "#006080"
          });
          var txt2 = $('<span></span>').text(chatDate).css({
            "float": "right",
            "color": "#a6a6a6",
            "font-size": "16px"
          });
          var txt3 = $('<p></p>').append(txt1, txt2);
          var txt4 = $('<p></p>').text(data.result[i].msg).css({
            "color": "#000000"
          });
          $('#messages').prepend($('<li>').append(txt3, txt4));
          msgCount++;

        } 
      } else {
        $('#noChat').show();
        noChat = 1;
      }
      $('#loading').hide();

      
      if (msgCount <= 5) {
        $('#scrl2').scrollTop($('#scrl2').prop("scrollHeight"));
      }
    }

  });
  $('#myMsg').keyup(function () {
    if ($('#myMsg').val()) {
      $('#sendBtn').show();
    } else {
      $('#sendBtn').hide();
    }
  });
  
  $('form').submit(function () {
    socket.emit('chat-msg', {
      msg: $('#myMsg').val(),
      msgTo: toUser,
      date: Date.now()
    });
    $('#myMsg').val("");
    $('#sendBtn').hide();
    return false;
  });

  socket.on('chat-msg', function (data) {
    var chatDate = moment(data.date).format("MMMM Do YYYY, hh:mm:ss a");
    var txt1 = $('<span></span>').text(data.msgFrom + " : ").css({
      "color": "#006080"
    });
    var txt2 = $('<span></span>').text(chatDate).css({
      "float": "right",
      "color": "#a6a6a6",
      "font-size": "16px"
    });
    var txt3 = $('<p></p>').append(txt1, txt2);
    var txt4 = $('<p></p>').text(data.msg).css({
      "color": "#000000"
    });
    $('#messages').append($('<li>').append(txt3, txt4));
    msgCount++;
    console.log(msgCount);
    $('#scrl2').scrollTop($('#scrl2').prop("scrollHeight"));
  });
  socket.on('disconnect', function () {
    $('#list').empty();
    $('#messages').empty();
    $('#frndName').text("Disconnected..");
    $('#loading').hide();
    $('#noChat').hide();
    $('#initMsg').show().text("...Please Refresh Page ");
    $('#chatForm').hide();
    msgCount = 0;
    noChat = 0;
  });
});