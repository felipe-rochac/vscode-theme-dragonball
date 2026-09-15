'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var DIST_DIR = path.join(ROOT, 'dist');
var SOURCE_FILES = ['extension.js', 'workspace-colors.js'];

function syntaxCheck(filePath) {
  var source = fs.readFileSync(filePath, 'utf8');
  new Function(source);
}

function main() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  SOURCE_FILES.forEach(function (fileName) {
    var srcPath = path.join(ROOT, 'src', fileName);
    var destPath = path.join(DIST_DIR, fileName);
    syntaxCheck(srcPath);
    fs.copyFileSync(srcPath, destPath);
    console.log('built ' + path.relative(ROOT, destPath));
  });
}

main();
