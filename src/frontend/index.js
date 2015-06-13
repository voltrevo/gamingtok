'use strict';

var opentok = require('./opentok');
var io = require('socket.io-client');

require('./style.css');

var streamsSection = require('./streamsSection.html');

var userListSection;

window.addEventListener('load', function() {
  document.title = 'GamingTok';

  var titleSection = document.createElement('div');
  titleSection.setAttribute('class', 'full-width-section title-section');
  titleSection.innerHTML = 'GamingTok';
  document.body.appendChild(titleSection);

  userListSection = document.createElement('div');
  userListSection.setAttribute('class', 'full-width-section user-list');
  document.body.appendChild(userListSection);

  document.body.appendChild(streamsSection());
});

var promptViaTextbox = function(desc) {
  return new Promise(function(resolve) {
    var section = document.createElement('div');
    section.setAttribute('class', 'full-width-section');

    document.body.insertBefore(section, userListSection.nextSibling);

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

var waitForButton = function(desc) {
  return new Promise(function(resolve) {
    var section = document.createElement('div');
    section.setAttribute('class', 'full-width-section');

    document.body.insertBefore(section, userListSection.nextSibling);

    var submitButton = document.createElement('button');
    submitButton.appendChild(document.createTextNode(desc));
    section.appendChild(submitButton);

    submitButton.addEventListener('click', function() {
      document.body.removeChild(section);
      resolve();
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

opentok.then(function(OT) {
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

  var sock = io(window.location.origin);

  sock.on('appError', function(data) {
    console.error('Server error:', JSON.parse(data));
  });

  sock.emit('init');

  sock.on('userList', function(data) {
    var userList = JSON.parse(data);

    removeChildren(userListSection);

    userList.forEach(function(username) {
      var userDiv = document.createElement('div');
      userDiv.appendChild(document.createTextNode(username));
      userListSection.appendChild(userDiv);
    });
  });

  var publisherPromise = Promise.defer();

  promptViaTextbox('Your name').then(function(username) {
    sock.emit('username', username);

    document.querySelector('#streams-section').style.display = '';
    publisherPromise.resolve(wrappedInitPublisher(document.querySelector('#your-stream')));

    return waitForButton('Let\'s Begin');
  }).then(function() {
    sock.emit('requestStart');
  });

  sock.on('initOwnSession', function(data) {
    var ownSessionInfo = JSON.parse(data);
    console.log('ownSessionInfo', ownSessionInfo);

    var ownSession = OT.initSession(ownSessionInfo.apiKey, ownSessionInfo.id);

    ownSession.connect(ownSessionInfo.token, function(error) {
      if (error) {
        console.error('Error connecting: ', error.code, error.message);
        return;
      }

      publisherPromise.promise.then(function(publisher) {
        console.log('Publishing stream.');

        ownSession.publish(publisher, function(err) {
          if (err) {
            throw err;
          }
        });
      });
    });
  });

  var opponentSession = null;

  sock.on('initGame', function(data) {
    var gameInfo = JSON.parse(data);
    console.log('Got game: ' + JSON.stringify(gameInfo));

    document.querySelector('#opponents-stream-name').innerHTML = gameInfo.opponentName;

    opponentSession = OT.initSession(gameInfo.apiKey, gameInfo.sessionId);

    opponentSession.connect(gameInfo.token, function(error) {
      if (error) {
        console.log('Error connecting: ', error.code, error.message);
        return;
      }

      console.log('Connected to the session.');

      opponentSession.on('streamCreated', function(event) {
        console.log('New stream in the session: ' + event.stream.streamId);

        wrappedSubscribe(
          opponentSession,
          event.stream,
          document.querySelector('#opponents-stream')
        );
      });
    });
  });

  sock.on('moveRequest', function() {
    promptViaTextbox('rock/paper/scissors').then(function(move) {
      sock.emit('move', move);
    });
  });

  sock.on('closeGame', function() {
    console.log('Got closeGame');
    opponentSession.disconnect();
  });

  sock.on('tournamentResult', function(data) {
    var tournamentResult = JSON.parse(data);

    window.alert(JSON.stringify(tournamentResult));
  })
});
