'use strict';

var SCHEMA_VERSION = 1;

var HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

var SURFACE_KEYS = {
  title: [
    'titleBar.activeBackground',
    'titleBar.activeForeground',
    'titleBar.inactiveBackground',
    'titleBar.inactiveForeground'
  ],
  status: [
    'statusBar.background',
    'statusBar.foreground',
    'statusBar.debuggingBackground',
    'statusBar.debuggingForeground'
  ],
  activity: [
    'activityBar.background',
    'activityBar.foreground',
    'activityBar.inactiveForeground'
  ],
  sidebar: [
    'sideBar.background',
    'sideBar.foreground',
    'sideBar.border',
    'sideBarTitle.foreground',
    'sideBarSectionHeader.background',
    'sideBarSectionHeader.foreground'
  ],
  panel: [
    'panel.background',
    'panel.border',
    'panelTitle.activeBorder',
    'panelTitle.activeForeground',
    'panelTitle.inactiveForeground',
    'terminal.background',
    'terminal.foreground'
  ]
};

var ALL_OWNABLE_KEYS = Object.keys(SURFACE_KEYS).reduce(function (acc, surface) {
  return acc.concat(SURFACE_KEYS[surface]);
}, []);

var KEY_TO_SURFACE = {};
Object.keys(SURFACE_KEYS).forEach(function (surface) {
  SURFACE_KEYS[surface].forEach(function (key) {
    KEY_TO_SURFACE[key] = surface;
  });
});

var PRESETS = {
  goku: { label: 'Goku (Orange)', hex: '#F47C2C' },
  vegeta: { label: 'Vegeta (Royal Blue)', hex: '#1976D2' },
  frieza: { label: 'Frieza (Pink)', hex: '#FF6FD8' },
  piccolo: { label: 'Piccolo (Green)', hex: '#7FFF00' },
  gohan: { label: 'Gohan (Lavender)', hex: '#A084CA' },
  trunks: { label: 'Trunks (Sky Blue)', hex: '#6BC7FF' },
  cell: { label: 'Cell (Lime Green)', hex: '#32CD32' },
  majinBuu: { label: 'Majin Buu (Rose)', hex: '#F7768E' },
  beerus: { label: 'Beerus (Gold)', hex: '#FFD700' },
  jiren: { label: 'Jiren (Red)', hex: '#FF2D2D' },
  broly: { label: 'Broly (Mint Green)', hex: '#6BFFB8' },
  android18: { label: 'Android 18 (Ice Blue)', hex: '#6BC7FF' },
  superSaiyanBlue: { label: 'Super Saiyan Blue (Cyan)', hex: '#00BFFF' },
  superSaiyan4: { label: 'Super Saiyan 4 (Crimson)', hex: '#FF4B4B' },
  dragonBall: { label: 'Dragon Ball (Amber)', hex: '#FF9800' }
};

var INACTIVE_BLEND_FACTOR = 0.35;
var ACTIVITY_INACTIVE_BLEND_FACTOR = 0.45;
var CHROME_BLEND_FACTOR = 0.42;
var SIDEBAR_BLEND_FACTOR = 0.82;
var SIDEBAR_HEADER_BLEND_FACTOR = 0.68;
var PANEL_BLEND_FACTOR = 0.86;
var COMFORT_BASE = '#111820';
var MIN_CONTRAST = 4.5;

function normalizeHex(input) {
  if (typeof input !== 'string') {
    return null;
  }
  var trimmed = input.trim();
  var match = HEX_RE.exec(trimmed);
  if (!match) {
    return null;
  }
  var digits = match[1];
  if (digits.length === 3) {
    digits = digits.split('').map(function (c) { return c + c; }).join('');
  }
  return '#' + digits.toUpperCase();
}

function hexToRgb(hex) {
  var normalized = normalizeHex(hex);
  if (!normalized) {
    throw new Error('Invalid hex color: ' + hex);
  }
  return {
    r: parseInt(normalized.substr(1, 2), 16),
    g: parseInt(normalized.substr(3, 2), 16),
    b: parseInt(normalized.substr(5, 2), 16)
  };
}

function rgbToHex(rgb) {
  function channel(v) {
    var clamped = Math.max(0, Math.min(255, Math.round(v)));
    var hex = clamped.toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  }
  return '#' + channel(rgb.r) + channel(rgb.g) + channel(rgb.b);
}

function srgbChannelToLinear(c) {
  var normalized = c / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  var rgb = hexToRgb(hex);
  var r = srgbChannelToLinear(rgb.r);
  var g = srgbChannelToLinear(rgb.g);
  var b = srgbChannelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  var lumA = relativeLuminance(hexA);
  var lumB = relativeLuminance(hexB);
  var lighter = Math.max(lumA, lumB);
  var darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function pickForeground(backgroundHex) {
  var contrastWithWhite = contrastRatio(backgroundHex, '#FFFFFF');
  var contrastWithBlack = contrastRatio(backgroundHex, '#000000');
  return contrastWithWhite >= contrastWithBlack ? '#FFFFFF' : '#000000';
}

function blendRgb(from, to, t) {
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t
  };
}

function blendHex(hexA, hexB, t) {
  return rgbToHex(blendRgb(hexToRgb(hexA), hexToRgb(hexB), t));
}

function deriveInactiveBackground(activeHex, factor) {
  var blendFactor = typeof factor === 'number' ? factor : INACTIVE_BLEND_FACTOR;
  var lum = relativeLuminance(activeHex);
  var target = lum > 0.5 ? '#000000' : '#FFFFFF';
  return blendHex(activeHex, target, blendFactor);
}

function deriveComfortBackground(accentHex, factor) {
  return blendHex(accentHex, COMFORT_BASE, factor);
}

// Blends foreground toward background for a softer "inactive" look, but never below MIN_CONTRAST
// against that same background: binary-search the blend factor down (factor 0 == plain foreground,
// which WCAG relative luminance math guarantees always reaches >= ~4.58:1 against any background).
function deriveInactiveForeground(foregroundHex, backgroundHex, factor) {
  var blendFactor = typeof factor === 'number' ? factor : ACTIVITY_INACTIVE_BLEND_FACTOR;
  var candidate = blendHex(foregroundHex, backgroundHex, blendFactor);
  if (contrastRatio(candidate, backgroundHex) >= MIN_CONTRAST) {
    return candidate;
  }
  var lo = 0;
  var hi = blendFactor;
  var best = foregroundHex;
  for (var i = 0; i < 24; i++) {
    var mid = (lo + hi) / 2;
    var testColor = blendHex(foregroundHex, backgroundHex, mid);
    if (contrastRatio(testColor, backgroundHex) >= MIN_CONTRAST) {
      best = testColor;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

function buildSurfaceColors(accentHex, surfaces) {
  var normalized = normalizeHex(accentHex);
  if (!normalized) {
    throw new Error('Invalid accent hex color: ' + accentHex);
  }
  var selected = surfaces || {};
  var colors = {};
  var chromeBg = deriveComfortBackground(normalized, CHROME_BLEND_FACTOR);

  if (selected.title) {
    var titleActiveBg = chromeBg;
    var titleActiveFg = pickForeground(titleActiveBg);
    var titleInactiveBg = deriveInactiveBackground(titleActiveBg);
    var titleInactiveFg = pickForeground(titleInactiveBg);
    colors['titleBar.activeBackground'] = titleActiveBg;
    colors['titleBar.activeForeground'] = titleActiveFg;
    colors['titleBar.inactiveBackground'] = titleInactiveBg;
    colors['titleBar.inactiveForeground'] = titleInactiveFg;
  }

  if (selected.status) {
    var statusBg = chromeBg;
    var statusFg = pickForeground(statusBg);
    var debugBg = deriveInactiveBackground(statusBg);
    var debugFg = pickForeground(debugBg);
    colors['statusBar.background'] = statusBg;
    colors['statusBar.foreground'] = statusFg;
    colors['statusBar.debuggingBackground'] = debugBg;
    colors['statusBar.debuggingForeground'] = debugFg;
  }

  if (selected.activity) {
    var activityBg = chromeBg;
    var activityFg = pickForeground(activityBg);
    var activityInactiveFg = deriveInactiveForeground(activityFg, activityBg, ACTIVITY_INACTIVE_BLEND_FACTOR);
    colors['activityBar.background'] = activityBg;
    colors['activityBar.foreground'] = activityFg;
    colors['activityBar.inactiveForeground'] = activityInactiveFg;
  }

  if (selected.sidebar) {
    var sidebarBg = deriveComfortBackground(normalized, SIDEBAR_BLEND_FACTOR);
    var sidebarFg = pickForeground(sidebarBg);
    var sidebarHeaderBg = deriveComfortBackground(normalized, SIDEBAR_HEADER_BLEND_FACTOR);
    colors['sideBar.background'] = sidebarBg;
    colors['sideBar.foreground'] = sidebarFg;
    colors['sideBar.border'] = chromeBg;
    colors['sideBarTitle.foreground'] = sidebarFg;
    colors['sideBarSectionHeader.background'] = sidebarHeaderBg;
    colors['sideBarSectionHeader.foreground'] = pickForeground(sidebarHeaderBg);
  }

  if (selected.panel) {
    var panelBg = deriveComfortBackground(normalized, PANEL_BLEND_FACTOR);
    var panelFg = pickForeground(panelBg);
    colors['panel.background'] = panelBg;
    colors['panel.border'] = chromeBg;
    colors['panelTitle.activeBorder'] = chromeBg;
    colors['panelTitle.activeForeground'] = panelFg;
    colors['panelTitle.inactiveForeground'] = deriveInactiveForeground(panelFg, panelBg);
    colors['terminal.background'] = panelBg;
    colors['terminal.foreground'] = panelFg;
  }

  return colors;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidOriginalValue(value) {
  if (value === undefined || value === null) {
    return true;
  }
  var t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean';
}

// Refuses to trust a stored ownership record unless every field/entry matches the exact known
// shape and an allow-listed key set. This is the only thing standing between a malformed/malicious
// record and a blind restore of an arbitrary settings key (e.g. editor.foreground).
function validateOwnershipRecord(record) {
  if (!isPlainObject(record)) {
    return { valid: false, reason: 'ownership record is missing or not an object' };
  }
  if (record.schemaVersion !== SCHEMA_VERSION) {
    return { valid: false, reason: 'unsupported ownership record schema version' };
  }
  if (record.status !== 'pending' && record.status !== 'committed') {
    return { valid: false, reason: 'ownership record has an invalid status' };
  }
  if (typeof record.wholeObjectWasAbsent !== 'boolean') {
    return { valid: false, reason: 'ownership record has an invalid wholeObjectWasAbsent flag' };
  }
  if (!isPlainObject(record.surfaces)) {
    return { valid: false, reason: 'ownership record has invalid surfaces' };
  }
  if (!isPlainObject(record.entries)) {
    return { valid: false, reason: 'ownership record has invalid or missing entries' };
  }
  var keys = Object.keys(record.entries);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (ALL_OWNABLE_KEYS.indexOf(key) === -1) {
      return { valid: false, reason: 'ownership record references an unknown key: ' + key };
    }
    var entry = record.entries[key];
    if (!isPlainObject(entry)) {
      return { valid: false, reason: 'ownership record entry for ' + key + ' is invalid' };
    }
    if (typeof entry.hadValue !== 'boolean') {
      return { valid: false, reason: 'ownership record entry for ' + key + ' has an invalid hadValue flag' };
    }
    if (!isValidOriginalValue(entry.originalValue)) {
      return { valid: false, reason: 'ownership record entry for ' + key + ' has an invalid originalValue' };
    }
    if (entry.hadValue && entry.originalValue === undefined) {
      return { valid: false, reason: 'ownership record entry for ' + key + ' claims a prior value but stores none' };
    }
    if (typeof entry.lastApplied !== 'string' || entry.lastApplied !== normalizeHex(entry.lastApplied)) {
      return { valid: false, reason: 'ownership record entry for ' + key + ' has an invalid lastApplied color' };
    }
    if (entry.lost !== undefined && typeof entry.lost !== 'boolean') {
      return { valid: false, reason: 'ownership record entry for ' + key + ' has an invalid lost flag' };
    }
  }
  return { valid: true };
}

function computeStillOwned(key, base, priorEntry) {
  if (!priorEntry || priorEntry.lost) {
    return false;
  }
  var hasKey = Object.prototype.hasOwnProperty.call(base, key);
  return hasKey && base[key] === priorEntry.lastApplied;
}

function planAcquire(options) {
  var rawWorkspaceValue = options.rawWorkspaceValue;
  var rawGlobalValue = options.rawGlobalValue;
  var plannedColors = options.plannedColors || {};
  var previousOwnership = options.previousOwnership || {};
  var previousWholeObjectWasAbsent = options.previousWholeObjectWasAbsent;

  var base = isPlainObject(rawWorkspaceValue) ? rawWorkspaceValue : {};
  var globalBase = isPlainObject(rawGlobalValue) ? rawGlobalValue : {};
  var plannedKeys = Object.keys(plannedColors);

  var hasPriorOwnership = Object.keys(previousOwnership).length > 0;
  var wholeObjectWasAbsent = hasPriorOwnership && typeof previousWholeObjectWasAbsent === 'boolean'
    ? previousWholeObjectWasAbsent
    : rawWorkspaceValue === undefined;

  // Theme-selector (e.g. "[Some Theme]") overrides always conservatively block the whole affected
  // surface: we never parse/guess which selector is currently active, and never edit selectors.
  // A selector nested only under the inherited/global object still wins over a workspace-level
  // key once that global scope is active, so it blocks the surface too.
  var themeSelectorConflicts = [];
  [base, globalBase].forEach(function (scope) {
    Object.keys(scope).forEach(function (topKey) {
      var value = scope[topKey];
      if (isPlainObject(value)) {
        plannedKeys.forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            themeSelectorConflicts.push({ selector: topKey, key: key });
          }
        });
      }
    });
  });

  var blockedSurfaces = {};
  themeSelectorConflicts.forEach(function (conflict) {
    var surface = KEY_TO_SURFACE[conflict.key];
    if (surface) {
      blockedSurfaces[surface] = true;
    }
  });

  var effectiveKeys = plannedKeys.filter(function (key) {
    var surface = KEY_TO_SURFACE[key];
    return !surface || !blockedSurfaces[surface];
  });

  var conflicts = [];
  var reacquireConflicts = [];
  var globalConflicts = [];

  effectiveKeys.forEach(function (key) {
    var prior = previousOwnership[key];
    if (computeStillOwned(key, base, prior)) {
      return;
    }
    if (prior) {
      // Previously owned (or sticky-lost) key: never silently recreate it, always require an
      // explicit reacquisition decision, whether it was changed or deleted outright.
      var hasCurrentValue = Object.prototype.hasOwnProperty.call(base, key) && !isPlainObject(base[key]);
      reacquireConflicts.push({ key: key, expected: prior.lastApplied, found: hasCurrentValue ? base[key] : undefined });
      return;
    }
    if (Object.prototype.hasOwnProperty.call(base, key) && !isPlainObject(base[key])) {
      conflicts.push({ key: key, existingValue: base[key] });
    }
  });

  effectiveKeys.forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(globalBase, key) && !isPlainObject(globalBase[key])) {
      globalConflicts.push({ key: key, existingValue: globalBase[key] });
    }
  });

  var nextValue = Object.assign({}, base);
  var restoredDroppedKeys = [];

  // A key that was owned before but is not part of this run's plan (a deselected/blocked surface)
  // must be restored to its true original value now, not left behind as a stale accent forever.
  Object.keys(previousOwnership).forEach(function (key) {
    if (effectiveKeys.indexOf(key) !== -1) {
      return;
    }
    var prior = previousOwnership[key];
    if (!computeStillOwned(key, base, prior)) {
      return;
    }
    if (prior.hadValue) {
      nextValue[key] = prior.originalValue;
    } else {
      delete nextValue[key];
    }
    restoredDroppedKeys.push(key);
  });

  effectiveKeys.forEach(function (key) {
    nextValue[key] = plannedColors[key];
  });

  var journalEntries = {};
  effectiveKeys.forEach(function (key) {
    var prior = previousOwnership[key];
    if (computeStillOwned(key, base, prior)) {
      // Recoloring an already-owned key must retain the ORIGINAL baseline, not the color we are
      // about to replace, or repeated recolors would forget what was there before we ever ran.
      journalEntries[key] = {
        hadValue: prior.hadValue,
        originalValue: prior.originalValue,
        lastApplied: plannedColors[key]
      };
    } else {
      var hasValue = Object.prototype.hasOwnProperty.call(base, key) && !isPlainObject(base[key]);
      journalEntries[key] = {
        hadValue: hasValue,
        originalValue: hasValue ? base[key] : undefined,
        lastApplied: plannedColors[key]
      };
    }
  });

  // A dropped surface's own prior entry must survive in the DURABLE pending record (persisted
  // before the settings write is attempted) even though it is no longer part of this run's
  // effective keys: if the write fails or the process dies before it restores that key, the next
  // invocation still needs the original baseline to finish the restoration instead of losing it.
  // Once the write actually succeeds, the caller commits with journalEntries only (this key is
  // truly restored on disk by then and is no longer owned).
  var pendingJournalEntries = Object.assign({}, journalEntries);
  restoredDroppedKeys.forEach(function (key) {
    pendingJournalEntries[key] = previousOwnership[key];
  });

  return {
    wholeObjectWasAbsent: wholeObjectWasAbsent,
    conflicts: conflicts,
    reacquireConflicts: reacquireConflicts,
    globalConflicts: globalConflicts,
    themeSelectorConflicts: themeSelectorConflicts,
    blockedSurfaces: Object.keys(blockedSurfaces),
    restoredDroppedKeys: restoredDroppedKeys,
    nextValue: nextValue,
    journalEntries: journalEntries,
    pendingJournalEntries: pendingJournalEntries
  };
}

function reconcileOwnership(rawWorkspaceValue, journalEntries) {
  var base = isPlainObject(rawWorkspaceValue) ? rawWorkspaceValue : {};
  var stillOwned = [];
  var lost = [];
  Object.keys(journalEntries).forEach(function (key) {
    var entry = journalEntries[key];
    var current = Object.prototype.hasOwnProperty.call(base, key) ? base[key] : undefined;
    if (entry.lost !== true && current === entry.lastApplied) {
      stillOwned.push(key);
    } else {
      lost.push({ key: key, expected: entry.lastApplied, found: current });
    }
  });
  return { stillOwned: stillOwned, lost: lost };
}

function planRestore(options) {
  var rawWorkspaceValue = options.rawWorkspaceValue;
  var journalEntries = options.journalEntries;
  var wholeObjectWasAbsent = options.wholeObjectWasAbsent;
  // force: bypass the current-value ownership check. Used only when the user has explicitly
  // chosen to restore an ambiguous/interrupted pending record, where the live value cannot tell
  // us whether our own write ever took effect; the normal committed-record disable path always
  // leaves this false so genuine external edits are still detected and reported.
  var force = options.force === true;

  var base = isPlainObject(rawWorkspaceValue) ? Object.assign({}, rawWorkspaceValue) : {};
  var lostOwnership = [];
  var restoredKeys = [];

  Object.keys(journalEntries).forEach(function (key) {
    var entry = journalEntries[key];
    var current = Object.prototype.hasOwnProperty.call(base, key) ? base[key] : undefined;
    var stillOwned = force || (entry.lost !== true && current === entry.lastApplied);
    if (!stillOwned) {
      lostOwnership.push({ key: key, expected: entry.lastApplied, found: current });
      return;
    }
    if (entry.hadValue) {
      base[key] = entry.originalValue;
    } else {
      delete base[key];
    }
    restoredKeys.push(key);
  });

  var isEmpty = Object.keys(base).length === 0;
  var removeWholeObject = wholeObjectWasAbsent && isEmpty;

  return {
    restoredKeys: restoredKeys,
    lostOwnership: lostOwnership,
    nextValue: removeWholeObject ? undefined : base,
    removeWholeObject: removeWholeObject
  };
}

module.exports = {
  SCHEMA_VERSION: SCHEMA_VERSION,
  SURFACE_KEYS: SURFACE_KEYS,
  ALL_OWNABLE_KEYS: ALL_OWNABLE_KEYS,
  PRESETS: PRESETS,
  normalizeHex: normalizeHex,
  relativeLuminance: relativeLuminance,
  contrastRatio: contrastRatio,
  pickForeground: pickForeground,
  deriveInactiveBackground: deriveInactiveBackground,
  deriveInactiveForeground: deriveInactiveForeground,
  deriveComfortBackground: deriveComfortBackground,
  blendHex: blendHex,
  buildSurfaceColors: buildSurfaceColors,
  validateOwnershipRecord: validateOwnershipRecord,
  planAcquire: planAcquire,
  reconcileOwnership: reconcileOwnership,
  planRestore: planRestore
};
