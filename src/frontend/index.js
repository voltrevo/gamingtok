'use strict';

var opentok = require('../moduleCandidates/opentok');
var sockception = require('sockception');
var wsPort = require('../wsPort');
var consoleLogger = require('../moduleCandidates/consoleLogger');
var removeChildren = require('../moduleCandidates/removeChildren');
var listenForFirstChild = require('./listenForFirstChild');
var insistPrompt = require('./insistPrompt');

require('./style.css');

var alertify = require('alertifyjs');
require('../../node_modules/alertifyjs/build/css/alertify.css');
require('../../node_modules/alertifyjs/build/css/themes/default.css');

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

  var sock = sockception.connect(
    'ws://' + window.location.hostname + ':' + wsPort + '/',
    consoleLogger('sockception:')
  );

  sock.route('connected').receiveOne(function() {
    sock.route('userList').receiveMany(function(userList) {
      removeChildren(userListSection);

      userList.value.forEach(function(username) {
        var userDiv = document.createElement('div');
        userDiv.appendChild(document.createTextNode(username));
        userListSection.appendChild(userDiv);
      });
    });

    var publisherPromise = Promise.defer();

    insistPrompt('Your name', '').then(function(username) {
      sock.route('username').send(username);

      document.querySelector('#streams-section').style.display = '';
      publisherPromise.resolve(wrappedInitPublisher(document.querySelector('#your-stream')));

      return waitForButton('Let\'s Begin');
    }).then(function() {
      sock.route('requestStart').send();
    });

    sock.route('initOwnSession').receiveMany(function(ownSessionInfo) {
      console.log('ownSessionInfo', ownSessionInfo.value);

      var ownSession = OT.initSession(ownSessionInfo.value.apiKey, ownSessionInfo.value.id);

      ownSession.connect(ownSessionInfo.value.token, function(error) {
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

    sock.route('initGame').receiveMany(function(gameInfo) {
      console.log('Got game:', gameInfo.value);

      document.querySelector('#opponents-stream-name').innerHTML = gameInfo.value.opponentName;

      opponentSession = OT.initSession(gameInfo.value.apiKey, gameInfo.value.sessionId);

      opponentSession.connect(gameInfo.value.token, function(error) {
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

    sock.route('moveRequest').receiveMany(function() {
      insistPrompt(
        'rock/paper/scissors',
        ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)]
      ).then(function(move) {
        sock.route('move').send(move);
      });
    });

    sock.route('closeGame').receiveMany(function() {
      console.log('Got closeGame');
      opponentSession.disconnect();
    });

    sock.route('tournamentResult').receiveMany(function(tournamentResult) {
      alertify.alert(JSON.stringify(tournamentResult.value));
    });
  });
});
