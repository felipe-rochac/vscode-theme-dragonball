'use strict';

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var manifest = require('../package.json');

var ROOT = path.resolve(__dirname, '..');
var ARTIFACTS_DIR = path.join(ROOT, 'artifacts');
var OUTPUT_NAME = 'vscode-theme-dragonball-' + manifest.version + '-workspace-colors.vsix';

function main() {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  var outputPath = path.join(ARTIFACTS_DIR, OUTPUT_NAME);
  var vscePath = path.join(ROOT, 'node_modules', '.bin', 'vsce');
  var result = childProcess.spawnSync(
    vscePath,
    ['package', '--no-dependencies', '--out', outputPath],
    { cwd: ROOT, stdio: 'inherit', shell: true }
  );
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  console.log('packaged ' + path.relative(ROOT, outputPath));
}

main();
