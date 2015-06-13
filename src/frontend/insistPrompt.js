'use strict';

var alertify = require('./alertify');

module.exports = function insistPrompt(desc, defaultValue) {
  return new Promise(function(resolve) {
    alertify.prompt(desc, defaultValue,
      function(evt, value){
        resolve(value);
      },
      function(){
        resolve(insistPrompt(desc, defaultValue));
      }
    );
  })
};
