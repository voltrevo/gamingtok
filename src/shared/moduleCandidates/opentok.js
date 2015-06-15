'use strict';

module.exports = new Promise(function(resolve) {
  window.addEventListener('load', function() {
    var otScript = document.createElement('script');
    otScript.setAttribute('src', '//static.opentok.com/v2/js/opentok.min.js');
    otScript.setAttribute('async', '');
    document.head.appendChild(otScript);

    otScript.addEventListener('load', function() {
      var opentok = window.OT;
      delete window.OT;
      delete window.OTHelpers;
      //delete window.OTPlugin;

      resolve(opentok);
    });
  });
});
