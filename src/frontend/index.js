'use strict';

/* global OT */

var io = require('socket.io-client');

var promptViaTextbox = function(desc) {
  return new Promise(function(resolve) {
    var section = document.createElement('div');
    section.setAttribute('class', 'full-width-section');

    document.body.insertBefore(section, document.querySelector('#user-list').nextSibling);

    var textbox = document.createElement('input');
    textbox.setAttribute('type', 'text');
    textbox.setAttribute('placeholder', desc);
    section.appendChild(textbox);

    var submitButton = document.createElement('button');
    submitButton.appendChild(document.createTextNode('Submit'));
    section.appendChild(submitButton);

    var submit = function() {
      document.body.removeChild(section);
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

var removeChildren = function(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
};

var listenForFirstChild = function(el, timeout) {
  return new Promise(function(resolve, reject) {
    var poller = setInterval(function() {
      if (el.firstChild) {
        clearInterval(poller);
        resolve(el.firstChild);
      }
    });

    // Fail-safe to make sure poller stops
    setTimeout(function() {
      clearInterval(poller);
      reject('timeout');
    }, timeout || 1000);
  });
};

var wrappedInitPublisher = function(el) {
  return new Promise(function(resolve, reject) {
    var publisher = OT.initPublisher(
      el,
      {insertMode: 'append'},
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(publisher);
        }
      }
    );

    listenForFirstChild(el).then(function(firstChild) {
      firstChild.style.width = '';
      firstChild.style.height = '';
    });
  });
};

var wrappedSubscribe = function(session, stream, el) {
  return new Promise(function(resolve, reject) {
    session.subscribe(stream, el, {insertMode: 'append'}, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });

    listenForFirstChild(el).then(function(firstChild) {
      firstChild.style.width = '';
      firstChild.style.height = '';
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
    var userListSection = document.querySelector('#user-list');

    removeChildren(userListSection);

    userList.forEach(function(username) {
      var userDiv = document.createElement('div');
      userDiv.appendChild(document.createTextNode(username));
      userListSection.appendChild(userDiv);
    });
  });

  promptViaTextbox('Your name').then(function(username) {
    sock.emit('username', username);

    document.querySelector('#streams-section').style.display = '';
    var publisherPromise = wrappedInitPublisher(document.querySelector('#your-stream'));

    sock.on('game', function(data) {
      var game = JSON.parse(data);
      console.log('Got game: ' + JSON.stringify(game));

      var session = OT.initSession(game.apiKey, game.sessionId);

      session.connect(game.token, function(error) {
        if (error) {
          console.log('Error connecting: ', error.code, error.message);
          return;
        }

        console.log('Connected to the session.');

        publisherPromise.then(function(publisher) {
          session.publish(publisher, function(err) {
            if (err) {
              throw err;
            }

            console.log('Publishing stream.');
          });
        });

        session.on('streamCreated', function(event) {
          console.log('New stream in the session: ' + event.stream.streamId);
          wrappedSubscribe(session, event.stream, document.querySelector('#opponents-stream'));
        });
      });
    });
  });
});
