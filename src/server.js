'use strict';

var config = require('./configure');
var wsPort = require('./wsPort');
var express = require('express');
var nakedjs = require('nakedjs');
var http = require('http');
var sockception = require('sockception');
var roundRobin = require('./roundRobin');
var rockPaperScissors = require('./rockPaperScissors');
var consoleLogger = require('./moduleCandidates/consoleLogger');

var rr = roundRobin(config.opentokAuth, rockPaperScissors(1));

var app = express();
var server = http.Server(app);

server.listen(config.port);

app.use(nakedjs(__dirname + '/frontend/index.js'));

sockception.listen({port: wsPort}, consoleLogger('sockception:')).receiveMany(function(sock) {
  sock.route('connected').send();
  rr.addSocket(sock);
});
