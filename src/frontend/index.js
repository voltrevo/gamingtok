'use strict';

/* global OT */

var io = require('socket.io-client');

var promptViaTextbox = function(desc) {
  return new Promise(function(resolve) {
    var textbox = document.createElement('input');
    textbox.setAttribute('type', 'text');
    textbox.setAttribute('placeholder', desc);
    document.body.appendChild(textbox);

    var submitButton = document.createElement('button');
    submitButton.appendChild(document.createTextNode('Submit'));
    document.body.appendChild(submitButton);

    var submit = function() {
      document.body.removeChild(textbox);
      document.body.removeChild(submitButton);
      resolve(textbox.value);
    };

    submitButton.addEventListener('click', function() {
      submit();
    });

    textbox.addEventListener('keydown', function(event) {
      // Enter
      if (event.keyCode === 13) {
        submit();
      }
    });
  });
};

window.addEventListener('load', function() {
  var sock = io(window.location.origin);

  sock.on('appError', function(data) {
    console.error('Server error:', JSON.parse(data));
  });

  sock.emit('init');

  sock.on('userList', function(data) {
    var userList = JSON.parse(data);
    console.log('userList:', userList);
  });

  promptViaTextbox('Your name').then(function(username) {
    sock.emit('username', username);

    sock.on('startInfo', function(data) {
      var startInfo = JSON.parse(data);
      console.log('Got startInfo: ' + JSON.stringify(startInfo));

      var session = OT.initSession(startInfo.apiKey, startInfo.sessionId);
      session.connect(startInfo.token, function(error) {
        if (error) {
          console.log('Error connecting: ', error.code, error.message);
        } else {
          console.log('Connected to the session.');

          var publisher = OT.initPublisher();
          session.publish(publisher, function(err) {
            if (err) {
              throw err;
            }

            console.log('Publishing stream.');
          });
        }
      });
    });
  });
});
