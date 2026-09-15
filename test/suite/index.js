'use strict';

var path = require('path');
var Mocha = require('mocha');
var glob = require('fs').readdirSync;

function run() {
  var mocha = new Mocha({ ui: 'bdd', color: true, timeout: 20000 });
  var suiteDir = path.resolve(__dirname);

  glob(suiteDir).filter(function (file) {
    return file.endsWith('.test.js');
  }).forEach(function (file) {
    mocha.addFile(path.join(suiteDir, file));
  });

  return new Promise(function (resolve, reject) {
    mocha.run(function (failures) {
      if (failures > 0) {
        reject(new Error(failures + ' Extension Host test(s) failed.'));
      } else {
        resolve();
      }
    });
  });
}

module.exports = { run: run };
