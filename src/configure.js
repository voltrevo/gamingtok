'use strict';

if (process.argv.length < 3) {
  console.error('Usage: npm start -- <config.json>');
  process.exit(1);
}

var fs = require('fs');

module.exports = JSON.parse(fs.readFileSync(process.argv[2]).toString());
