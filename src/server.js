'use strict';

var express = require('express');
var browserify = require('browserify-middleware');

var app = express();
var projectRoot = __dirname + '/..';

app.use('/index.js', browserify(__dirname + '/frontend/index.js'));

app.use(express.static(projectRoot + '/public'));

app.listen(8080);
