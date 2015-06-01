'use strict';

var config = require('./configure');
var express = require('express');
var browserify = require('browserify-middleware');
var http = require('http');
var socketIo = require('socket.io');
var rockPaperScissors = require('./rockPaperScissors');

var rps = rockPaperScissors(config.opentokAuth);

var app = express();
var server = http.Server(app);
var io = socketIo(server);

server.listen(config.port);

var projectRoot = __dirname + '/..';
app.use('/index.js', browserify(__dirname + '/frontend/index.js'));
app.use(express.static(projectRoot + '/public'));

io.on('connection', function(sock) {
  (new Promise(function(resolve, reject) {

    sock.once('init', resolve);
    setTimeout(reject, 5000);

  })).then(function() {

    rps.addSocket(sock);

  }).catch(function() {

    sock.emit('appError', JSON.stringify(
      'Timeout while waiting for client\'s init message. ' +
      'This can happen when the server restarts.'
    ));

    sock.close();

  });
});
