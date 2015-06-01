'use strict';

var config = require('configure');

console.log('before express:', Date.now());
var express = require('express');
console.log('after  express:', Date.now());

var browserify = require('browserify-middleware');
var http = require('http');
var socketIo = require('socket.io');
var rockPaperScissors = require('./rockPaperScissors');

var rps = rockPaperScissors(config.opentokAuth);

var app = express();
var server = http.Server(app);
var io = socketIo(server);

server.listen(8080);

var projectRoot = __dirname + '/..';
app.use('/index.js', browserify(__dirname + '/frontend/index.js'));
app.use(express.static(projectRoot + '/public'));

io.on('connection', function(sock) {
  rps.addClient(sock);
});
