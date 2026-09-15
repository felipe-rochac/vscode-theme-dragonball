'use strict';

var fs = require('fs');
var path = require('path');
var yauzl = require('yauzl');
var manifest = require('../package.json');

var ROOT = path.resolve(__dirname, '..');
var ARTIFACT_PATH = path.join(
  ROOT,
  'artifacts',
  'vscode-theme-dragonball-' + manifest.version + '-workspace-colors.vsix'
);

// Strict positive allowlist: every packaged entry must match one of these, rather than merely
// avoiding a blacklist of known-bad prefixes. Catches unexpected files (stray .py, nested .vsix,
// anything outside the declared shipping surface) that a blacklist would silently let through.
// dist/themes/images are each constrained to the exact approved runtime filenames/naming
// convention, not an arbitrary single-level filename, so a same-directory stray (including a
// nested .vsix) is still forbidden.
var ALLOWED_ENTRY_RE = /^extension\/(package\.json|LICENSE\.txt|README\.md|CHANGELOG\.md|dist\/(extension\.js|workspace-colors\.js)|themes\/[a-z0-9-]+-color-theme\.json|images\/logo\.png)$/;
var ALLOWED_DIR_ENTRY_RE = /^extension\/(dist|themes|images)\/?$/;

// vsce writes these exact root-level metadata entries alongside the `extension/` payload; they
// are not part of the shipped extension tree and are matched by exact name, not a broad prefix.
var ROOT_METADATA_ENTRIES = ['extension.vsixmanifest', '[Content_Types].xml'];

// Rejects absolute paths (POSIX or Windows drive-letter) and any ".." traversal segment, so a
// manifest-declared main/icon/theme path can't reference a file outside the extension root.
function isSafeRelativePath(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return false;
  }
  var normalized = candidate.replace(/^\.\//, '');
  if (normalized.indexOf('..') !== -1) {
    return false;
  }
  if (/^[\\/]/.test(normalized) || /^[a-zA-Z]:[\\/]/.test(normalized)) {
    return false;
  }
  return true;
}

// Validates an already-read entry-name list against the manifest exactly as packaged (parsed
// from the archive's own extension/package.json content, not the source tree's copy) so a
// packaging-time manifest edit can't silently diverge from what actually ships. Pure/sync so it
// is directly unit-testable without a real archive. Malformed manifest shapes (non-object,
// non-array themes, missing/unsafe paths) are reported as validation failures, never thrown.
function validatePackagedArchive(entries, packagedManifestText) {
  var result = { manifestError: null, missing: [], missingThemes: [], forbidden: [] };

  var manifest;
  try {
    manifest = JSON.parse(packagedManifestText);
  } catch (err) {
    result.manifestError = 'Packaged extension/package.json is not valid JSON: ' + err.message;
    return result;
  }

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    result.manifestError = 'Packaged extension/package.json must be a JSON object';
    return result;
  }

  var entrySet = entries.reduce(function (acc, name) {
    acc[name] = true;
    return acc;
  }, {});

  var required = ['extension/package.json', 'extension/LICENSE.txt', 'extension/README.md',
    'extension/CHANGELOG.md', 'extension/dist/extension.js', 'extension/dist/workspace-colors.js'];

  if (!manifest.main || typeof manifest.main !== 'string') {
    result.missing.push('package.json is missing a "main" entry point');
  } else if (!isSafeRelativePath(manifest.main)) {
    result.missing.push('package.json "main" is not a safe relative path: ' + manifest.main);
  } else {
    required.push('extension/' + manifest.main.replace(/^\.\//, ''));
  }

  if (!manifest.icon || typeof manifest.icon !== 'string') {
    result.missing.push('package.json is missing an "icon"');
  } else if (!isSafeRelativePath(manifest.icon)) {
    result.missing.push('package.json "icon" is not a safe relative path: ' + manifest.icon);
  } else {
    required.push('extension/' + manifest.icon.replace(/^\.\//, ''));
  }

  var rawThemes = manifest.contributes ? manifest.contributes.themes : undefined;
  var themes;
  if (rawThemes === undefined || rawThemes === null) {
    themes = [];
  } else if (Array.isArray(rawThemes)) {
    themes = rawThemes;
  } else {
    themes = [];
    result.missingThemes.push('package.json "contributes.themes" must be an array, found ' + typeof rawThemes);
  }

  if (themes.length !== 15) {
    result.missingThemes.push('expected 15 contributed themes in the packaged manifest, found ' + themes.length);
  }

  var themePaths = [];
  themes.forEach(function (theme, index) {
    if (!theme || typeof theme.path !== 'string' || theme.path.length === 0) {
      result.missingThemes.push('theme at index ' + index + ' is missing a valid "path"');
      return;
    }
    if (!isSafeRelativePath(theme.path)) {
      result.missingThemes.push('theme at index ' + index + ' has an unsafe "path": ' + theme.path);
      return;
    }
    themePaths.push('extension/' + theme.path.replace(/^\.\//, ''));
  });

  result.missing = result.missing.concat(required.filter(function (requiredPath) {
    return !entrySet[requiredPath];
  }));
  result.missingThemes = result.missingThemes.concat(themePaths.filter(function (themePath) {
    return !entrySet[themePath];
  }));

  result.forbidden = entries.filter(function (name) {
    if (name === 'extension/' || ALLOWED_ENTRY_RE.test(name) || ALLOWED_DIR_ENTRY_RE.test(name) ||
      ROOT_METADATA_ENTRIES.indexOf(name) !== -1) {
      return false;
    }
    return true;
  });

  return result;
}

function isValidResult(result) {
  return !result.manifestError && result.missing.length === 0 &&
    result.missingThemes.length === 0 && result.forbidden.length === 0;
}

function readArchive(archivePath) {
  return new Promise(function (resolve, reject) {
    var entries = [];
    var manifestChunks = [];
    var manifestFound = false;
    yauzl.open(archivePath, { lazyEntries: true }, function (err, zipFile) {
      if (err) {
        reject(err);
        return;
      }
      zipFile.readEntry();
      zipFile.on('entry', function (entry) {
        entries.push(entry.fileName);
        if (entry.fileName === 'extension/package.json') {
          manifestFound = true;
          zipFile.openReadStream(entry, function (streamErr, stream) {
            if (streamErr) {
              reject(streamErr);
              return;
            }
            stream.on('data', function (chunk) { manifestChunks.push(chunk); });
            stream.on('end', function () { zipFile.readEntry(); });
            stream.on('error', reject);
          });
          return;
        }
        zipFile.readEntry();
      });
      zipFile.on('end', function () {
        resolve({
          entries: entries,
          manifestText: manifestFound ? Buffer.concat(manifestChunks).toString('utf8') : null
        });
      });
      zipFile.on('error', reject);
    });
  });
}

function main() {
  if (!fs.existsSync(ARTIFACT_PATH)) {
    console.error('Archive not found: ' + ARTIFACT_PATH);
    process.exit(1);
  }

  readArchive(ARTIFACT_PATH).then(function (archive) {
    if (!archive.manifestText) {
      console.error('Missing required entries: extension/package.json');
      process.exit(1);
      return;
    }

    var result = validatePackagedArchive(archive.entries, archive.manifestText);

    if (!isValidResult(result)) {
      if (result.manifestError) {
        console.error(result.manifestError);
      }
      if (result.missing.length > 0) {
        console.error('Missing required entries: ' + result.missing.join(', '));
      }
      if (result.missingThemes.length > 0) {
        console.error('Missing theme entries: ' + result.missingThemes.join(', '));
      }
      if (result.forbidden.length > 0) {
        console.error('Forbidden entries present (not on the strict allowlist): ' + result.forbidden.join(', '));
      }
      process.exit(1);
    }

    console.log('VSIX verified: ' + archive.entries.length + ' entries, all required paths present, no forbidden paths.');
  }).catch(function (err) {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  validatePackagedArchive: validatePackagedArchive,
  isValidResult: isValidResult,
  ALLOWED_ENTRY_RE: ALLOWED_ENTRY_RE
};

if (require.main === module) {
  main();
}
