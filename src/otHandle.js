'use strict';

var opentok = require('opentok');

module.exports = function(auth) {
  console.log('Initializing opentok with: ' + JSON.stringify(auth));
  var ot = opentok(auth.apiKey, auth.apiSecret);

  return {
    ot: ot,
    apiKey: auth.apiKey,
    createSession: function() {
      return new Promise(function(resolve, reject) {
        ot.createSession(function(err, session) {
          if (err) {
            reject(err);
          } else {
            resolve(session);
          }
        });
      })
    }
  }
};
