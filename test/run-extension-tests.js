'use strict';

var path = require('path');
var fs = require('fs');

function parseVersionArg(argv) {
  var match = argv.find(function (arg) {
    return arg.indexOf('--vscode-version=') === 0;
  });
  return match ? match.split('=')[1] : 'stable';
}

function main() {
  var testElectron = require('@vscode/test-electron');
  var ROOT = path.resolve(__dirname, '..');
  var version = parseVersionArg(process.argv.slice(2));

  var extensionDevelopmentPath = ROOT;
  var extensionTestsPath = path.join(ROOT, 'test', 'suite', 'index.js');
  var userDataDir = path.join(ROOT, '.vscode-test', 'user-data');
  var fixtureWorkspace = path.join(ROOT, '.test-workspaces', 'folder-fixture');

  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(fixtureWorkspace, { recursive: true });

  return testElectron.runTests({
    version: version,
    extensionDevelopmentPath: extensionDevelopmentPath,
    extensionTestsPath: extensionTestsPath,
    launchArgs: [
      fixtureWorkspace,
      '--user-data-dir=' + userDataDir,
      '--disable-extensions'
    ]
  }).catch(function (err) {
    console.error('Extension Host tests failed to run: ' + (err && err.message ? err.message : err));
    process.exitCode = 1;
  });
}

if (require.main === module) {
  main();
}

module.exports = { main: main };
