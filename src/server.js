'use strict';

//var config = require('configure');

var express = require('express');
var browserify = require('browserify-middleware');
var http = require('http');
var socketIo = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIo(server);

server.listen(8080);

var projectRoot = __dirname + '/..';
app.use('/index.js', browserify(__dirname + '/frontend/index.js'));
app.use(express.static(projectRoot + '/public'));

io.on('connection', function(sock) {
  sock.on('msg', function(data) {
    console.log(data);
  });
});
