'use strict';

var assert = require('assert');
var wc = require('../src/workspace-colors');
var extensionModule = require('../src/extension');
var verifyVsix = require('../scripts/verify-vsix');

function createFakeContext(opts) {
  opts = opts || {};
  var store = {};
  var stateUpdateCalls = [];
  return {
    stateUpdateCalls: stateUpdateCalls,
    workspaceState: {
      get: function (key) { return store[key]; },
      update: function (key, value) {
        stateUpdateCalls.push({ key: key, value: value });
        store[key] = value;
        if (opts.onStateUpdate) {
          // Allows tests to inject a concurrent external mutation, or a rejection, during the
          // gap between this durable persist resolving and whatever the caller awaits next.
          return Promise.resolve().then(function () { return opts.onStateUpdate(key, value); });
        }
        return Promise.resolve();
      }
    },
    subscriptions: []
  };
}

// A minimal fake `vscode` API sufficient to exercise src/extension.js's adapter logic
// (createExtension) without a real Extension Host.
function createFakeVscode(opts) {
  opts = opts || {};
  var state = { workspaceValue: opts.workspaceValue, globalValue: opts.globalValue };
  var updateCalls = [];
  var quickPicks = (opts.quickPicks || []).slice();
  var quickPickCalls = [];
  var inputs = (opts.inputBoxes || []).slice();
  var warningReplies = (opts.warningReplies || []).slice();
  var messages = { warnings: [], errors: [], infos: [] };
  var configListeners = [];
  var registeredCommands = {};
  var statusBarItems = [];

  var vscode = {
    workspace: {
      workspaceFolders: opts.workspaceFolders !== undefined ? opts.workspaceFolders : [{}],
      workspaceFile: opts.workspaceFile,
      getConfiguration: function () {
        return {
          inspect: function () {
            return { workspaceValue: state.workspaceValue, globalValue: state.globalValue };
          },
          update: function (key, value, target) {
            var call = { key: key, value: value, target: target };
            updateCalls.push(call);
            var applyValue = function () {
              if (target === vscode.ConfigurationTarget.Workspace) {
                state.workspaceValue = value;
              } else if (target === vscode.ConfigurationTarget.Global) {
                state.globalValue = value;
              }
            };
            if (opts.updateBehavior) {
              return Promise.resolve().then(function () { return opts.updateBehavior(call, state, applyValue); });
            }
            applyValue();
            return Promise.resolve();
          }
        };
      },
      onDidChangeConfiguration: function (listener) {
        configListeners.push(listener);
        return { dispose: function () {} };
      }
    },
    window: {
      showQuickPick: function (items, options) {
        quickPickCalls.push({ items: items, options: options });
        var next = quickPicks.shift();
        if (typeof next === 'function') {
          return next(items, options);
        }
        return Promise.resolve(next);
      },
      showInputBox: function () {
        return Promise.resolve(inputs.shift());
      },
      showWarningMessage: function (message) {
        messages.warnings.push(message);
        var reply = warningReplies.shift();
        return typeof reply === 'function' ? reply() : Promise.resolve(reply);
      },
      showErrorMessage: function (message) {
        messages.errors.push(message);
        return Promise.resolve();
      },
      showInformationMessage: function (message) {
        messages.infos.push(message);
        return Promise.resolve();
      },
      createStatusBarItem: function (alignment) {
        var item = {
          alignment: alignment,
          text: undefined,
          command: undefined,
          tooltip: undefined,
          accessibilityInformation: undefined,
          shown: false,
          disposed: false,
          show: function () { item.shown = true; },
          hide: function () { item.shown = false; },
          dispose: function () { item.disposed = true; }
        };
        statusBarItems.push(item);
        return item;
      }
    },
    extensions: {
      getExtension: function (id) { return (opts.extensions || {})[id]; }
    },
    commands: {
      registerCommand: function (id, handler) {
        registeredCommands[id] = handler;
        return { dispose: function () {} };
      }
    },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ConfigurationTarget: { Workspace: 'WORKSPACE', Global: 'GLOBAL' }
  };

  return {
    vscode: vscode,
    state: state,
    updateCalls: updateCalls,
    quickPickCalls: quickPickCalls,
    messages: messages,
    registeredCommands: registeredCommands,
    statusBarItems: statusBarItems,
    fireConfigChange: function () {
      return Promise.all(configListeners.map(function (listener) {
        return listener({ affectsConfiguration: function () { return true; } });
      }));
    }
  };
}

describe('normalizeHex', function () {
  it('accepts #RRGGBB and uppercases it', function () {
    assert.strictEqual(wc.normalizeHex('#1976d2'), '#1976D2');
  });

  it('expands #RGB shorthand', function () {
    assert.strictEqual(wc.normalizeHex('#0f0'), '#00FF00');
  });

  it('rejects alpha channel hex', function () {
    assert.strictEqual(wc.normalizeHex('#1976D2FF'), null);
  });

  it('rejects named colors', function () {
    assert.strictEqual(wc.normalizeHex('cornflowerblue'), null);
  });

  it('rejects malformed input', function () {
    assert.strictEqual(wc.normalizeHex('#GGGGGG'), null);
  });

  it('rejects empty input', function () {
    assert.strictEqual(wc.normalizeHex(''), null);
    assert.strictEqual(wc.normalizeHex(null), null);
    assert.strictEqual(wc.normalizeHex(undefined), null);
  });
});

describe('presets', function () {
  it('matches all 15 contributed themes and their declared accents', function () {
    assert.deepStrictEqual(Object.keys(wc.PRESETS), [
      'goku', 'vegeta', 'frieza', 'piccolo', 'gohan', 'trunks', 'cell', 'majinBuu',
      'beerus', 'jiren', 'broly', 'android18', 'superSaiyanBlue', 'superSaiyan4', 'dragonBall'
    ]);
    assert.deepStrictEqual(Object.keys(wc.PRESETS).map(function (key) { return wc.PRESETS[key].hex; }), [
      '#F47C2C', '#1976D2', '#FF6FD8', '#7FFF00', '#A084CA', '#6BC7FF', '#32CD32', '#F7768E',
      '#FFD700', '#FF2D2D', '#6BFFB8', '#6BC7FF', '#00BFFF', '#FF4B4B', '#FF9800'
    ]);
  });
});

describe('Quick Pick contract (Revision 3)', function () {
  it('presents only sidebar/chat and panel/terminal as picked and cancels without writes', async function () {
    var fake = createFakeVscode({ quickPicks: [{ kind: 'preset', preset: 'goku' }, undefined] });
    var context = createFakeContext();
    extensionModule.createExtension(fake.vscode).activate(context);

    await fake.registeredCommands['dragonBall.workspaceColors.configure']();

    assert.strictEqual(fake.quickPickCalls.length, 2);
    var surfaces = fake.quickPickCalls[1];
    assert.strictEqual(surfaces.options.canPickMany, true);
    assert.deepStrictEqual(surfaces.items.map(function (item) {
      return { label: item.label, surface: item.surface, picked: item.picked };
    }), [
      { label: 'Sidebars / Copilot Chat', surface: 'sidebar', picked: true },
      { label: 'Panels / Terminal', surface: 'panel', picked: true },
      { label: 'Status Bar', surface: 'status', picked: false },
      { label: 'Activity Bar', surface: 'activity', picked: false }
    ]);
    assert.deepStrictEqual(fake.updateCalls, []);
    assert.deepStrictEqual(context.stateUpdateCalls, []);
    assert.strictEqual(fake.state.workspaceValue, undefined);
  });

  it('offers custom hex plus all 15 data-driven presets and cancels without writes', async function () {
    var fake = createFakeVscode({ quickPicks: [undefined] });
    var context = createFakeContext();
    extensionModule.createExtension(fake.vscode).activate(context);

    await fake.registeredCommands['dragonBall.workspaceColors.configure']();

    assert.strictEqual(fake.quickPickCalls.length, 1);
    var items = fake.quickPickCalls[0].items;
    assert.strictEqual(items.length, 16);
    assert.strictEqual(items[0].kind, 'custom');
    assert.deepStrictEqual(items.slice(1), Object.keys(wc.PRESETS).map(function (presetKey) {
      var preset = wc.PRESETS[presetKey];
      return { label: preset.label, description: preset.hex, kind: 'preset', preset: presetKey };
    }));
    assert.deepStrictEqual(fake.updateCalls, []);
    assert.deepStrictEqual(context.stateUpdateCalls, []);
  });

  it('applies recommended surfaces only after the user confirms the picker', async function () {
    var context = createFakeContext();
    var fake = createFakeVscode({ quickPicks: [
      { kind: 'preset', preset: 'goku' },
      function (items) {
        assert.deepStrictEqual(fake.updateCalls, []);
        assert.deepStrictEqual(context.stateUpdateCalls, []);
        return Promise.resolve(items.filter(function (item) { return item.picked; }));
      }
    ] });
    extensionModule.createExtension(fake.vscode).activate(context);

    await fake.registeredCommands['dragonBall.workspaceColors.configure']();

    assert.deepStrictEqual(fake.state.workspaceValue, wc.buildSurfaceColors(wc.PRESETS.goku.hex, {
      title: true, sidebar: true, panel: true, status: false, activity: false
    }));
    assert.strictEqual(fake.updateCalls.length, 1);
    assert.strictEqual(fake.updateCalls[0].target, fake.vscode.ConfigurationTarget.Workspace);
  });

  Object.keys(wc.PRESETS).forEach(function (presetKey) {
    it('applies the displayed ' + presetKey + ' preset with explicit title-only selection', async function () {
      var fake = createFakeVscode({ quickPicks: [
        function (items) {
          var picked = items.find(function (item) { return item.preset === presetKey; });
          assert.ok(picked, 'preset must be available in the actual picker');
          return Promise.resolve(picked);
        },
        []
      ] });
      var context = createFakeContext();
      extensionModule.createExtension(fake.vscode).activate(context);

      await fake.registeredCommands['dragonBall.workspaceColors.configure']();

      assert.deepStrictEqual(fake.state.workspaceValue, wc.buildSurfaceColors(wc.PRESETS[presetKey].hex, { title: true }));
      assert.strictEqual(fake.updateCalls.length, 1);
      assert.strictEqual(fake.updateCalls[0].target, fake.vscode.ConfigurationTarget.Workspace);
      assert.strictEqual(fake.state.globalValue, undefined);
    });
  });
});

describe('pickForeground contrast', function () {
  var samples = ['#000000', '#FFFFFF', '#808080', '#1976D2', '#F47C2C', '#7FFF00', '#123456', '#ABCDEF'];

  samples.forEach(function (bg) {
    it('reaches 4.5:1 contrast for background ' + bg, function () {
      var fg = wc.pickForeground(bg);
      var ratio = wc.contrastRatio(bg, fg);
      assert.ok(ratio >= 4.5, 'contrast ' + ratio + ' below 4.5 for ' + bg + '/' + fg);
    });
  });
});

describe('deriveInactiveBackground', function () {
  it('produces a background distinct from the active background', function () {
    ['#1976D2', '#F47C2C', '#000000', '#FFFFFF', '#808080'].forEach(function (hex) {
      var inactive = wc.deriveInactiveBackground(hex);
      assert.notStrictEqual(inactive, hex);
    });
  });

  it('keeps the inactive foreground at 4.5:1 contrast', function () {
    ['#1976D2', '#F47C2C', '#7FFF00'].forEach(function (hex) {
      var inactiveBg = wc.deriveInactiveBackground(hex);
      var inactiveFg = wc.pickForeground(inactiveBg);
      assert.ok(wc.contrastRatio(inactiveBg, inactiveFg) >= 4.5);
    });
  });
});

describe('buildSurfaceColors', function () {
  it('restrains vivid accents on large chrome surfaces', function () {
    var colors = wc.buildSurfaceColors('#66FF00', { title: true, status: true, activity: true });
    assert.notStrictEqual(colors['titleBar.activeBackground'], '#66FF00');
    assert.notStrictEqual(colors['statusBar.background'], '#66FF00');
    assert.notStrictEqual(colors['activityBar.background'], '#66FF00');
    assert.ok(wc.contrastRatio(colors['titleBar.activeBackground'], colors['titleBar.activeForeground']) >= 4.5);
  });

  it('creates a dark hue-matched Sidebar and Copilot Chat surface', function () {
    var colors = wc.buildSurfaceColors('#66FF00', { title: true, sidebar: true });
    assert.deepStrictEqual(
      Object.keys(colors).filter(function (key) { return wc.SURFACE_KEYS.sidebar.indexOf(key) !== -1; }).sort(),
      wc.SURFACE_KEYS.sidebar.slice().sort()
    );
    assert.ok(wc.relativeLuminance(colors['sideBar.background']) < 0.12);
    assert.ok(wc.contrastRatio(colors['sideBar.background'], colors['sideBar.foreground']) >= 4.5);
    assert.ok(wc.contrastRatio(colors['sideBarSectionHeader.background'], colors['sideBarSectionHeader.foreground']) >= 4.5);
  });

  it('creates a dark Panels and Terminal surface without owning ANSI or editor colors', function () {
    var colors = wc.buildSurfaceColors('#FF2D2D', { title: true, panel: true });
    assert.deepStrictEqual(
      Object.keys(colors).filter(function (key) { return wc.SURFACE_KEYS.panel.indexOf(key) !== -1; }).sort(),
      wc.SURFACE_KEYS.panel.slice().sort()
    );
    assert.ok(wc.relativeLuminance(colors['panel.background']) < 0.12);
    assert.strictEqual(colors['terminal.background'], colors['panel.background']);
    assert.ok(wc.contrastRatio(colors['terminal.background'], colors['terminal.foreground']) >= 4.5);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(colors, 'terminal.ansiRed'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(colors, 'editor.background'), false);
  });

  it('only includes keys for selected surfaces', function () {
    var colors = wc.buildSurfaceColors('#1976D2', { title: true, status: false, activity: false });
    assert.deepStrictEqual(Object.keys(colors).sort(), wc.SURFACE_KEYS.title.slice().sort());
  });

  it('includes all three surfaces when all selected', function () {
    var colors = wc.buildSurfaceColors('#1976D2', { title: true, status: true, activity: true });
    var expected = wc.SURFACE_KEYS.title.concat(wc.SURFACE_KEYS.status, wc.SURFACE_KEYS.activity).sort();
    assert.deepStrictEqual(Object.keys(colors).sort(), expected);
  });

  it('throws on an invalid accent', function () {
    assert.throws(function () {
      wc.buildSurfaceColors('not-a-color', { title: true });
    });
  });
});

describe('planAcquire', function () {
  it('builds a plan from an absent workspace object and preserves nothing else', function () {
    var planned = { 'titleBar.activeBackground': '#1976D2' };
    var plan = wc.planAcquire({ rawWorkspaceValue: undefined, plannedColors: planned });
    assert.strictEqual(plan.wholeObjectWasAbsent, true);
    assert.deepStrictEqual(plan.conflicts, []);
    assert.deepStrictEqual(plan.themeSelectorConflicts, []);
    assert.strictEqual(plan.nextValue['titleBar.activeBackground'], '#1976D2');
  });

  it('preserves unrelated root keys and nested theme-selector objects', function () {
    var raw = {
      'editor.foreground': '#EEEEEE',
      '[Some Theme]': { 'editor.background': '#000000' }
    };
    var planned = { 'titleBar.activeBackground': '#1976D2' };
    var plan = wc.planAcquire({ rawWorkspaceValue: raw, plannedColors: planned });
    assert.strictEqual(plan.nextValue['editor.foreground'], '#EEEEEE');
    assert.deepStrictEqual(plan.nextValue['[Some Theme]'], { 'editor.background': '#000000' });
    assert.strictEqual(plan.wholeObjectWasAbsent, false);
  });

  it('flags a theme-selector conflict without silently editing the selector', function () {
    var raw = { '[Some Theme]': { 'titleBar.activeBackground': '#111111' } };
    var planned = { 'titleBar.activeBackground': '#1976D2' };
    var plan = wc.planAcquire({ rawWorkspaceValue: raw, plannedColors: planned });
    assert.strictEqual(plan.themeSelectorConflicts.length, 1);
    assert.strictEqual(plan.themeSelectorConflicts[0].selector, '[Some Theme]');
    assert.deepStrictEqual(raw['[Some Theme]'], { 'titleBar.activeBackground': '#111111' });
    assert.strictEqual(Object.prototype.hasOwnProperty.call(plan.nextValue, 'titleBar.activeBackground'), false);
  });

  it('flags a direct existing override as a conflict requiring confirmation', function () {
    var raw = { 'titleBar.activeBackground': '#EE0000' };
    var planned = { 'titleBar.activeBackground': '#1976D2' };
    var plan = wc.planAcquire({ rawWorkspaceValue: raw, plannedColors: planned });
    assert.strictEqual(plan.conflicts.length, 1);
    assert.strictEqual(plan.conflicts[0].key, 'titleBar.activeBackground');
  });

  it('does not flag a conflict when recoloring an already-owned key', function () {
    var raw = { 'titleBar.activeBackground': '#1976D2' };
    var planned = { 'titleBar.activeBackground': '#F47C2C' };
    var previousOwnership = { 'titleBar.activeBackground': { lastApplied: '#1976D2' } };
    var plan = wc.planAcquire({ rawWorkspaceValue: raw, plannedColors: planned, previousOwnership: previousOwnership });
    assert.deepStrictEqual(plan.conflicts, []);
    assert.strictEqual(plan.nextValue['titleBar.activeBackground'], '#F47C2C');
  });
});

describe('reconcileOwnership', function () {
  it('detects keys that are still owned and keys that were lost', function () {
    var journal = {
      'titleBar.activeBackground': { lastApplied: '#1976D2' },
      'titleBar.activeForeground': { lastApplied: '#FFFFFF' }
    };
    var raw = { 'titleBar.activeBackground': '#1976D2', 'titleBar.activeForeground': '#000000' };
    var result = wc.reconcileOwnership(raw, journal);
    assert.deepStrictEqual(result.stillOwned, ['titleBar.activeBackground']);
    assert.strictEqual(result.lost.length, 1);
    assert.strictEqual(result.lost[0].key, 'titleBar.activeForeground');
  });
});

describe('planRestore', function () {
  it('restores an originally-present key to its original value', function () {
    var journal = { 'titleBar.activeBackground': { hadValue: true, originalValue: '#000000', lastApplied: '#1976D2' } };
    var raw = { 'titleBar.activeBackground': '#1976D2', 'editor.foreground': '#EEEEEE' };
    var result = wc.planRestore({ rawWorkspaceValue: raw, journalEntries: journal, wholeObjectWasAbsent: false });
    assert.strictEqual(result.nextValue['titleBar.activeBackground'], '#000000');
    assert.strictEqual(result.nextValue['editor.foreground'], '#EEEEEE');
    assert.deepStrictEqual(result.lostOwnership, []);
  });

  it('deletes a key that was originally absent', function () {
    var journal = { 'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2' } };
    var raw = { 'titleBar.activeBackground': '#1976D2' };
    var result = wc.planRestore({ rawWorkspaceValue: raw, journalEntries: journal, wholeObjectWasAbsent: true });
    assert.strictEqual(Object.prototype.hasOwnProperty.call(result.nextValue || {}, 'titleBar.activeBackground'), false);
  });

  it('reports lost ownership and leaves an externally changed key untouched', function () {
    var journal = { 'titleBar.activeBackground': { hadValue: true, originalValue: '#000000', lastApplied: '#1976D2' } };
    var raw = { 'titleBar.activeBackground': '#EE0000' };
    var result = wc.planRestore({ rawWorkspaceValue: raw, journalEntries: journal, wholeObjectWasAbsent: false });
    assert.strictEqual(result.lostOwnership.length, 1);
    assert.strictEqual(result.nextValue['titleBar.activeBackground'], '#EE0000');
  });

  it('removes the whole object only when originally absent and now empty', function () {
    var journal = { 'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2' } };
    var raw = { 'titleBar.activeBackground': '#1976D2' };
    var result = wc.planRestore({ rawWorkspaceValue: raw, journalEntries: journal, wholeObjectWasAbsent: true });
    assert.strictEqual(result.removeWholeObject, true);
    assert.strictEqual(result.nextValue, undefined);
  });

  it('preserves an originally-empty object instead of removing it', function () {
    var journal = { 'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2' } };
    var raw = { 'titleBar.activeBackground': '#1976D2' };
    var result = wc.planRestore({ rawWorkspaceValue: raw, journalEntries: journal, wholeObjectWasAbsent: false });
    assert.strictEqual(result.removeWholeObject, false);
    assert.deepStrictEqual(result.nextValue, {});
  });

  it('preserves unrelated members added by another actor after our object becomes empty', function () {
    var journal = { 'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2' } };
    var raw = { 'titleBar.activeBackground': '#1976D2', 'editor.foreground': '#EEEEEE' };
    var result = wc.planRestore({ rawWorkspaceValue: raw, journalEntries: journal, wholeObjectWasAbsent: true });
    assert.strictEqual(result.removeWholeObject, false);
    assert.deepStrictEqual(result.nextValue, { 'editor.foreground': '#EEEEEE' });
  });

  it('does not restore (and reports lost) a key sticky-marked lost even if the value coincidentally matches', function () {
    var journal = { 'titleBar.activeBackground': { hadValue: true, originalValue: '#000000', lastApplied: '#1976D2', lost: true } };
    var raw = { 'titleBar.activeBackground': '#1976D2' };
    var result = wc.planRestore({ rawWorkspaceValue: raw, journalEntries: journal, wholeObjectWasAbsent: false });
    assert.strictEqual(result.lostOwnership.length, 1);
    assert.strictEqual(result.nextValue['titleBar.activeBackground'], '#1976D2');
  });
});

describe('deriveInactiveForeground contrast (review1 P2 #9)', function () {
  var backgrounds = ['#000000', '#FFFFFF', '#808080', '#1976D2', '#F47C2C', '#7FFF00', '#123456', '#ABCDEF', '#7F7F7F', '#404040', '#C0C0C0'];

  backgrounds.forEach(function (bg) {
    it('reaches 4.5:1 contrast for activity inactive foreground over background ' + bg, function () {
      var fg = wc.pickForeground(bg);
      var inactiveFg = wc.deriveInactiveForeground(fg, bg, 0.45);
      var ratio = wc.contrastRatio(inactiveFg, bg);
      assert.ok(ratio >= 4.5, 'contrast ' + ratio + ' below 4.5 for inactive foreground ' + inactiveFg + ' over ' + bg);
    });
  });

  it('still blends toward the background when the plain blend already satisfies contrast', function () {
    var fg = wc.pickForeground('#000000');
    var blended = wc.deriveInactiveForeground(fg, '#000000', 0.45);
    assert.notStrictEqual(blended, fg);
  });
});

describe('buildSurfaceColors activity surface contrast', function () {
  it('produces an activity inactive foreground that reaches 4.5:1 against the background', function () {
    ['#1976D2', '#F47C2C', '#7FFF00', '#808080', '#123456'].forEach(function (hex) {
      var colors = wc.buildSurfaceColors(hex, { title: false, status: false, activity: true });
      var ratio = wc.contrastRatio(colors['activityBar.inactiveForeground'], colors['activityBar.background']);
      assert.ok(ratio >= 4.5, 'contrast ' + ratio + ' below 4.5 for accent ' + hex);
    });
  });
});

describe('validateOwnershipRecord (review1 P1 #4)', function () {
  function validRecord() {
    return {
      schemaVersion: wc.SCHEMA_VERSION,
      status: 'committed',
      wholeObjectWasAbsent: false,
      surfaces: { title: true, status: false, activity: false },
      entries: {
        'titleBar.activeBackground': { hadValue: true, originalValue: '#000000', lastApplied: '#1976D2' }
      }
    };
  }

  it('accepts a well-formed record', function () {
    assert.strictEqual(wc.validateOwnershipRecord(validRecord()).valid, true);
  });

  it('rejects null without crashing', function () {
    assert.strictEqual(wc.validateOwnershipRecord(null).valid, false);
  });

  it('rejects a record with entries set to null without crashing', function () {
    var record = validRecord();
    record.entries = null;
    assert.strictEqual(wc.validateOwnershipRecord(record).valid, false);
  });

  it('rejects an unknown/foreign key such as editor.foreground', function () {
    var record = validRecord();
    record.entries['editor.foreground'] = { hadValue: true, originalValue: '#EEEEEE', lastApplied: '#1976D2' };
    assert.strictEqual(wc.validateOwnershipRecord(record).valid, false);
  });

  it('rejects a missing schemaVersion', function () {
    var record = validRecord();
    delete record.schemaVersion;
    assert.strictEqual(wc.validateOwnershipRecord(record).valid, false);
  });

  it('rejects an invalid/unknown status', function () {
    var record = validRecord();
    record.status = 'corrupted';
    assert.strictEqual(wc.validateOwnershipRecord(record).valid, false);
  });

  it('accepts a pending status', function () {
    var record = validRecord();
    record.status = 'pending';
    assert.strictEqual(wc.validateOwnershipRecord(record).valid, true);
  });

  it('rejects a non-hex lastApplied value (e.g. an injected non-color)', function () {
    var record = validRecord();
    record.entries['titleBar.activeBackground'].lastApplied = 'javascript:alert(1)';
    assert.strictEqual(wc.validateOwnershipRecord(record).valid, false);
  });

  it('rejects an entry claiming hadValue true with no stored originalValue', function () {
    var record = validRecord();
    record.entries['titleBar.activeBackground'].originalValue = undefined;
    assert.strictEqual(wc.validateOwnershipRecord(record).valid, false);
  });

  it('rejects a non-boolean lost flag', function () {
    var record = validRecord();
    record.entries['titleBar.activeBackground'].lost = 'yes';
    assert.strictEqual(wc.validateOwnershipRecord(record).valid, false);
  });
});

describe('planAcquire baseline retention across recolors (review1 P1 #2)', function () {
  it('keeps the true original baseline through repeated recolors, not the previously applied color', function () {
    var plannedFirst = { 'titleBar.activeBackground': '#1976D2' };
    var firstPlan = wc.planAcquire({ rawWorkspaceValue: undefined, plannedColors: plannedFirst, previousOwnership: {} });
    assert.strictEqual(firstPlan.journalEntries['titleBar.activeBackground'].hadValue, false);

    var plannedSecond = { 'titleBar.activeBackground': '#F47C2C' };
    var secondPlan = wc.planAcquire({
      rawWorkspaceValue: firstPlan.nextValue,
      plannedColors: plannedSecond,
      previousOwnership: firstPlan.journalEntries,
      previousWholeObjectWasAbsent: firstPlan.wholeObjectWasAbsent
    });
    assert.strictEqual(secondPlan.journalEntries['titleBar.activeBackground'].hadValue, false);
    assert.strictEqual(secondPlan.journalEntries['titleBar.activeBackground'].originalValue, undefined);

    var plannedThird = { 'titleBar.activeBackground': '#7FFF00' };
    var thirdPlan = wc.planAcquire({
      rawWorkspaceValue: secondPlan.nextValue,
      plannedColors: plannedThird,
      previousOwnership: secondPlan.journalEntries,
      previousWholeObjectWasAbsent: secondPlan.wholeObjectWasAbsent
    });

    var restore = wc.planRestore({
      rawWorkspaceValue: thirdPlan.nextValue,
      journalEntries: thirdPlan.journalEntries,
      wholeObjectWasAbsent: thirdPlan.wholeObjectWasAbsent
    });
    assert.strictEqual(Object.prototype.hasOwnProperty.call(restore.nextValue || {}, 'titleBar.activeBackground'), false);
    assert.strictEqual(restore.removeWholeObject, true);
  });

  it('retains a real prior value (not "absent") across recolors when one existed before first acquire', function () {
    var plannedFirst = { 'titleBar.activeBackground': '#1976D2' };
    var firstPlan = wc.planAcquire({
      rawWorkspaceValue: { 'titleBar.activeBackground': '#000000' },
      plannedColors: plannedFirst,
      previousOwnership: {}
    });
    assert.strictEqual(firstPlan.journalEntries['titleBar.activeBackground'].hadValue, true);
    assert.strictEqual(firstPlan.journalEntries['titleBar.activeBackground'].originalValue, '#000000');

    var plannedSecond = { 'titleBar.activeBackground': '#F47C2C' };
    var secondPlan = wc.planAcquire({
      rawWorkspaceValue: firstPlan.nextValue,
      plannedColors: plannedSecond,
      previousOwnership: firstPlan.journalEntries,
      previousWholeObjectWasAbsent: firstPlan.wholeObjectWasAbsent
    });
    assert.strictEqual(secondPlan.journalEntries['titleBar.activeBackground'].hadValue, true);
    assert.strictEqual(secondPlan.journalEntries['titleBar.activeBackground'].originalValue, '#000000');
  });
});

describe('planAcquire dropped-surface restoration (review1 P1 #3)', function () {
  it('restores a still-owned key whose surface is no longer selected instead of leaving a stale accent', function () {
    var plannedAll = { 'titleBar.activeBackground': '#1976D2', 'activityBar.background': '#1976D2', 'activityBar.foreground': '#FFFFFF', 'activityBar.inactiveForeground': '#CCCCCC' };
    var firstPlan = wc.planAcquire({ rawWorkspaceValue: undefined, plannedColors: plannedAll, previousOwnership: {} });

    var plannedTitleOnly = { 'titleBar.activeBackground': '#F47C2C' };
    var secondPlan = wc.planAcquire({
      rawWorkspaceValue: firstPlan.nextValue,
      plannedColors: plannedTitleOnly,
      previousOwnership: firstPlan.journalEntries,
      previousWholeObjectWasAbsent: firstPlan.wholeObjectWasAbsent
    });

    assert.strictEqual(Object.prototype.hasOwnProperty.call(secondPlan.nextValue, 'activityBar.background'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(secondPlan.nextValue, 'activityBar.foreground'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(secondPlan.journalEntries, 'activityBar.background'), false);
    assert.ok(secondPlan.restoredDroppedKeys.indexOf('activityBar.background') !== -1);
  });

  it('restores a dropped surface key to a real prior value, not deletes it, when one existed before', function () {
    var plannedAll = { 'activityBar.background': '#1976D2' };
    var firstPlan = wc.planAcquire({
      rawWorkspaceValue: { 'activityBar.background': '#010101' },
      plannedColors: plannedAll,
      previousOwnership: {}
    });
    var secondPlan = wc.planAcquire({
      rawWorkspaceValue: firstPlan.nextValue,
      plannedColors: {},
      previousOwnership: firstPlan.journalEntries,
      previousWholeObjectWasAbsent: firstPlan.wholeObjectWasAbsent
    });
    assert.strictEqual(secondPlan.nextValue['activityBar.background'], '#010101');
  });
});

describe('planAcquire reacquisition after loss (review1 P1 #5)', function () {
  it('requires explicit reacquisition confirmation instead of silently recreating a deleted owned key', function () {
    var firstPlan = wc.planAcquire({ rawWorkspaceValue: undefined, plannedColors: { 'titleBar.activeBackground': '#1976D2' }, previousOwnership: {} });
    var deletedRaw = {}; // key externally deleted
    var secondPlan = wc.planAcquire({
      rawWorkspaceValue: deletedRaw,
      plannedColors: { 'titleBar.activeBackground': '#F47C2C' },
      previousOwnership: firstPlan.journalEntries,
      previousWholeObjectWasAbsent: firstPlan.wholeObjectWasAbsent
    });
    // The planner always proposes the full plan; the adapter gates the actual write on explicit
    // confirmation of reacquireConflicts. Reacquiring uses a fresh baseline (absent), not the stale one.
    assert.strictEqual(secondPlan.reacquireConflicts.length, 1);
    assert.strictEqual(secondPlan.reacquireConflicts[0].key, 'titleBar.activeBackground');
    assert.strictEqual(secondPlan.journalEntries['titleBar.activeBackground'].hadValue, false);
    assert.strictEqual(secondPlan.journalEntries['titleBar.activeBackground'].originalValue, undefined);
  });

  it('requires reacquisition confirmation for a key sticky-marked lost even if its value now matches', function () {
    var journal = { 'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2', lost: true } };
    var plan = wc.planAcquire({
      rawWorkspaceValue: { 'titleBar.activeBackground': '#1976D2' },
      plannedColors: { 'titleBar.activeBackground': '#F47C2C' },
      previousOwnership: journal
    });
    assert.strictEqual(plan.reacquireConflicts.length, 1);
    assert.deepStrictEqual(plan.conflicts, []);
  });
});

describe('planAcquire global (inherited user) overrides (review1 P1 #8)', function () {
  it('flags an inherited global-scope value as a conflict requiring confirmation', function () {
    var plan = wc.planAcquire({
      rawWorkspaceValue: undefined,
      rawGlobalValue: { 'titleBar.activeBackground': '#334455' },
      plannedColors: { 'titleBar.activeBackground': '#1976D2' }
    });
    assert.strictEqual(plan.globalConflicts.length, 1);
    assert.strictEqual(plan.globalConflicts[0].key, 'titleBar.activeBackground');
  });

  it('does not require reading global scope to still detect workspace-level conflicts', function () {
    var plan = wc.planAcquire({
      rawWorkspaceValue: { 'titleBar.activeBackground': '#334455' },
      plannedColors: { 'titleBar.activeBackground': '#1976D2' }
    });
    assert.strictEqual(plan.conflicts.length, 1);
    assert.deepStrictEqual(plan.globalConflicts, []);
  });
});

describe('planAcquire conservative refusal of theme-selector conflicts (review1 P1 #8)', function () {
  it('excludes the blocked surface entirely from nextValue rather than writing a key the selector will still win over', function () {
    var raw = { '[Some Theme]': { 'titleBar.activeBackground': '#111111' } };
    var planned = { 'titleBar.activeBackground': '#1976D2', 'titleBar.activeForeground': '#FFFFFF' };
    var plan = wc.planAcquire({ rawWorkspaceValue: raw, plannedColors: planned });
    assert.strictEqual(plan.blockedSurfaces.indexOf('title') !== -1, true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(plan.nextValue, 'titleBar.activeBackground'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(plan.nextValue, 'titleBar.activeForeground'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(plan.journalEntries, 'titleBar.activeBackground'), false);
  });

  it('still applies an unaffected surface while blocking only the conflicting one', function () {
    var raw = { '[Some Theme]': { 'titleBar.activeBackground': '#111111' } };
    var planned = { 'titleBar.activeBackground': '#1976D2', 'statusBar.background': '#1976D2' };
    var plan = wc.planAcquire({ rawWorkspaceValue: raw, plannedColors: planned });
    assert.strictEqual(plan.nextValue['statusBar.background'], '#1976D2');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(plan.nextValue, 'titleBar.activeBackground'), false);
  });
});

describe('status bar launcher (Revision 2)', function () {
  function activateWithStoredRecord(record) {
    var fake = createFakeVscode({});
    var context = createFakeContext();
    if (record !== undefined) {
      context.workspaceState.update(extensionModule.createExtension(fake.vscode).OWNERSHIP_STATE_KEY, record);
    }
    var writesBeforeActivation = context.stateUpdateCalls.length;
    extensionModule.createExtension(fake.vscode).activate(context);
    return { fake: fake, context: context, writesBeforeActivation: writesBeforeActivation };
  }

  it('creates exactly one right-aligned $(paintcan) item bound to the configure command with the required tooltip/accessibility label', function () {
    var result = activateWithStoredRecord(undefined);
    assert.strictEqual(result.fake.statusBarItems.length, 1);
    var item = result.fake.statusBarItems[0];
    assert.strictEqual(item.alignment, result.fake.vscode.StatusBarAlignment.Right);
    assert.strictEqual(item.text, '$(paintcan)');
    assert.strictEqual(item.command, 'dragonBall.workspaceColors.configure');
    assert.strictEqual(item.tooltip, 'Configure Workspace Colors');
    assert.deepStrictEqual(item.accessibilityInformation, { label: 'Configure Workspace Colors' });
    assert.strictEqual(item.shown, true);
    assert.strictEqual(item.disposed, false);
  });

  ['missing', 'committed', 'pending', 'corrupt'].forEach(function (kind) {
    it('activation makes no settings or ownership-state writes/prompts with a ' + kind + ' stored record', function () {
      var record;
      if (kind === 'committed') {
        record = { schemaVersion: wc.SCHEMA_VERSION, status: 'committed', wholeObjectWasAbsent: true, surfaces: { title: true, status: false, activity: false }, entries: {} };
      } else if (kind === 'pending') {
        record = { schemaVersion: wc.SCHEMA_VERSION, status: 'pending', wholeObjectWasAbsent: true, surfaces: { title: true, status: false, activity: false }, entries: {} };
      } else if (kind === 'corrupt') {
        record = { not: 'a valid record' };
      }
      var result = activateWithStoredRecord(record);
      assert.strictEqual(result.fake.updateCalls.length, 0);
      assert.strictEqual(result.context.stateUpdateCalls.length, result.writesBeforeActivation, 'activation must not write ownership state, even an unchanged value');
      assert.deepStrictEqual(result.context.workspaceState.get('dragonBall.workspaceColors.ownership'), record);
      assert.strictEqual(result.fake.messages.warnings.length, 0);
      assert.strictEqual(result.fake.messages.errors.length, 0);
      assert.strictEqual(result.fake.messages.infos.length, 0);
      assert.strictEqual(result.fake.statusBarItems.length, 1);
    });
  });

  it('extension disposal (context.subscriptions) removes the launcher', function () {
    var result = activateWithStoredRecord(undefined);
    result.context.subscriptions.forEach(function (sub) { sub.dispose(); });
    assert.strictEqual(result.fake.statusBarItems[0].disposed, true);
  });

  it('a fresh reactivation after disposal creates exactly one new item, never a duplicate on the old one', function () {
    var fake = createFakeVscode({});
    var context1 = createFakeContext();
    var ext = extensionModule.createExtension(fake.vscode);
    ext.activate(context1);
    context1.subscriptions.forEach(function (sub) { sub.dispose(); });
    var context2 = createFakeContext();
    ext.activate(context2);
    assert.strictEqual(fake.statusBarItems.length, 2);
    assert.strictEqual(fake.statusBarItems[0].disposed, true);
    assert.strictEqual(fake.statusBarItems[1].disposed, false);
    assert.strictEqual(fake.statusBarItems[1].shown, true);
  });

  it('remains present and unchanged through configure cancellation and disable when unsupported/disabled', function () {
    var fake = createFakeVscode({ workspaceFolders: [] });
    var context = createFakeContext();
    var ext = extensionModule.createExtension(fake.vscode);
    ext.activate(context);
    return ext.configureWorkspaceColors(context).then(function () {
      return ext.disableWorkspaceColors(context);
    }).then(function () {
      assert.strictEqual(fake.statusBarItems.length, 1);
      assert.strictEqual(fake.statusBarItems[0].disposed, false);
      assert.strictEqual(fake.statusBarItems[0].shown, true);
    });
  });
});

describe('resolveStoredRecord terminal recovery, no mutation on cancel (Revision2 substep risk1)', function () {
  it('does not commit a pending allMatch record before the accent prompt; cancelling the accent prompt leaves the original pending record untouched', function () {
    var pending = {
      schemaVersion: wc.SCHEMA_VERSION,
      status: 'pending',
      wholeObjectWasAbsent: true,
      surfaces: { title: true, status: false, activity: false },
      entries: { 'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2' } }
    };
    var fake = createFakeVscode({
      workspaceValue: { 'titleBar.activeBackground': '#1976D2' },
      quickPicks: [undefined] // cancel the accent prompt immediately
    });
    var context = createFakeContext();
    var ext = extensionModule.createExtension(fake.vscode);
    context.workspaceState.update(ext.OWNERSHIP_STATE_KEY, pending);
    return ext.configureWorkspaceColors(context).then(function () {
      assert.strictEqual(fake.updateCalls.length, 0);
      assert.deepStrictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), pending);
    });
  });

  it('clearing an invalid/corrupt record is terminal: it does not fall through into the accent prompt in the same invocation', function () {
    var accentPromptCalls = 0;
    var fake = createFakeVscode({
      workspaceValue: {},
      warningReplies: ['Clear record (no settings change)'],
      quickPicks: [function () { accentPromptCalls++; return Promise.resolve(undefined); }]
    });
    var context = createFakeContext();
    var ext = extensionModule.createExtension(fake.vscode);
    context.workspaceState.update(ext.OWNERSHIP_STATE_KEY, { not: 'a valid record' });
    return ext.configureWorkspaceColors(context).then(function () {
      assert.strictEqual(accentPromptCalls, 0, 'clearing a corrupt record must not fall through into a new accent prompt');
      assert.strictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), undefined);
    });
  });

  it('choosing to restore original values for an interrupted pending record is terminal: it does not fall through into a new accent prompt', function () {
    var accentPromptCalls = 0;
    var pending = {
      schemaVersion: wc.SCHEMA_VERSION,
      status: 'pending',
      wholeObjectWasAbsent: true,
      surfaces: { title: true, status: false, activity: false },
      entries: { 'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2' } }
    };
    var fake = createFakeVscode({
      workspaceValue: { 'titleBar.activeBackground': '#F47C2C' }, // does not match lastApplied -> ambiguous/interrupted
      warningReplies: ['Restore original values'],
      quickPicks: [function () { accentPromptCalls++; return Promise.resolve(undefined); }]
    });
    var context = createFakeContext();
    var ext = extensionModule.createExtension(fake.vscode);
    context.workspaceState.update(ext.OWNERSHIP_STATE_KEY, pending);
    return ext.configureWorkspaceColors(context).then(function () {
      assert.strictEqual(accentPromptCalls, 0, 'recovering an interrupted pending record must not fall through into a new accent prompt');
      assert.strictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), undefined);
      assert.strictEqual(Object.prototype.hasOwnProperty.call(fake.state.workspaceValue || {}, 'titleBar.activeBackground'), false);
    });
  });
});

describe('escalation recovery confirmation races', function () {
  ['unrelated addition', 'owned value change', 'record replacement'].forEach(function (change) {
    it('handles ' + change + ' during delayed pending recovery confirmation', async function () {
      var releasePrompt;
      var promptOpened;
      var opened = new Promise(function (resolve) { promptOpened = resolve; });
      var pending = {
        schemaVersion: wc.SCHEMA_VERSION,
        status: 'pending',
        wholeObjectWasAbsent: true,
        surfaces: { title: true, status: false, activity: false },
        entries: { 'titleBar.activeBackground': { hadValue: false, lastApplied: '#1976D2' } }
      };
      var fake = createFakeVscode({
        workspaceValue: { 'titleBar.activeBackground': '#F47C2C' },
        warningReplies: [function () {
          promptOpened();
          return new Promise(function (resolve) { releasePrompt = resolve; });
        }]
      });
      var context = createFakeContext();
      var ext = extensionModule.createExtension(fake.vscode);
      await context.workspaceState.update(ext.OWNERSHIP_STATE_KEY, pending);
      var recovery = ext.configureWorkspaceColors(context);
      await opened;
      fake.state.workspaceValue = Object.assign({}, fake.state.workspaceValue, {
        'editor.foreground': '#EEEEEE', '[Some Theme]': { 'editor.background': '#222222' }
      });
      if (change === 'owned value change') {
        fake.state.workspaceValue['titleBar.activeBackground'] = '#000000';
      }
      if (change === 'record replacement') {
        await context.workspaceState.update(ext.OWNERSHIP_STATE_KEY, Object.assign({}, pending, { wholeObjectWasAbsent: false }));
      }
      var currentRecord = context.workspaceState.get(ext.OWNERSHIP_STATE_KEY);
      releasePrompt('Restore original values');
      await recovery;
      assert.strictEqual((fake.state.workspaceValue || {})['editor.foreground'], '#EEEEEE', 'recovery must preserve unrelated additions');
      assert.deepStrictEqual(fake.state.workspaceValue['[Some Theme]'], { 'editor.background': '#222222' });
      if (change === 'unrelated addition') {
        assert.strictEqual(fake.updateCalls.length, 1);
        assert.strictEqual(Object.hasOwn(fake.state.workspaceValue, 'titleBar.activeBackground'), false);
        assert.strictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), undefined);
      } else {
        assert.strictEqual(fake.updateCalls.length, 0, 'changed recovery inputs must invalidate confirmation');
        assert.deepStrictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), currentRecord);
        assert.ok(fake.messages.warnings.some(function (message) { return message.includes('changed while'); }));
      }
    });
  });
});

describe('escalation ownership generation ordering', function () {
  [false, true].forEach(function (transientLoss) {
    it('preserves the new generation after successful recoloring with ' + (transientLoss ? 'transient ownership loss' : 'an unrelated event'), async function () {
      var vegetaTitle = wc.buildSurfaceColors(wc.PRESETS.vegeta.hex, { title: true })['titleBar.activeBackground'];
      var gokuTitle = wc.buildSurfaceColors(wc.PRESETS.goku.hex, { title: true })['titleBar.activeBackground'];
      var releasePicker;
      var pickerOpened;
      var opened = new Promise(function (resolve) { pickerOpened = resolve; });
      var fake = createFakeVscode({
        quickPicks: [
          { kind: 'preset', preset: 'vegeta' }, [],
          function () {
            pickerOpened();
            return new Promise(function (resolve) { releasePicker = resolve; });
          }, []
        ],
        warningReplies: ['Overwrite named keys']
      });
      var context = createFakeContext();
      var ext = extensionModule.createExtension(fake.vscode);
      ext.activate(context);
      var configure = fake.registeredCommands['dragonBall.workspaceColors.configure'];
      await configure();
      var recolor = configure();
      await opened;
      fake.state.workspaceValue = Object.assign({}, fake.state.workspaceValue, { 'editor.foreground': '#EEEEEE' });
      if (transientLoss) {
        fake.state.workspaceValue['titleBar.activeBackground'] = '#000000';
      }
      fake.fireConfigChange();
      if (transientLoss) {
        fake.state.workspaceValue['titleBar.activeBackground'] = vegetaTitle;
        fake.fireConfigChange();
      }
      releasePicker({ kind: 'preset', preset: 'goku' });
      await recolor;
      assert.strictEqual(fake.state.workspaceValue['titleBar.activeBackground'], gokuTitle);
      if (transientLoss) {
        assert.ok(fake.messages.warnings.some(function (message) {
          return message.includes('Previously owned keys changed outside this extension: titleBar.activeBackground');
        }), 'transient loss must require confirmation before acquiring the new generation');
      }
      await fake.registeredCommands['dragonBall.workspaceColors.disable']();
      assert.strictEqual(fake.messages.warnings.some(function (message) { return message.includes('could not restore'); }), false,
        'an old observation must not mark the new accent lost');
      assert.strictEqual(fake.state.workspaceValue['editor.foreground'], '#EEEEEE');
      assert.strictEqual(fake.state.workspaceValue['titleBar.activeBackground'], transientLoss ? vegetaTitle : undefined);
      assert.strictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), undefined);
    });
  });
});

describe('runAcquireAndWrite retains dropped-surface baselines across a failed write (Revision2 substep risk1)', function () {
  it('keeps a dropped surface\'s prior original baseline in the pending record if the settings write fails, instead of losing it', function () {
    var updateShouldFail = false;
    var fake = createFakeVscode({
      workspaceValue: undefined,
      quickPicks: [
        { kind: 'custom' }, [{ surface: 'activity' }], // step 1: title + activity
        { kind: 'custom' }, [] // step 2: title only, dropping activity, with a failing write
      ],
      inputBoxes: ['#1976D2', '#F47C2C'],
      updateBehavior: function (call, state, applyValue) {
        if (updateShouldFail) {
          return Promise.reject(new Error('simulated write failure'));
        }
        applyValue();
      }
    });
    var context = createFakeContext();
    var ext = extensionModule.createExtension(fake.vscode);

    return ext.configureWorkspaceColors(context).then(function () {
      var recordAfterFirst = context.workspaceState.get(ext.OWNERSHIP_STATE_KEY);
      assert.strictEqual(recordAfterFirst.status, 'committed');
      assert.ok(Object.prototype.hasOwnProperty.call(recordAfterFirst.entries, 'activityBar.background'));

      updateShouldFail = true;
      return ext.configureWorkspaceColors(context).then(function () {
        throw new Error('expected the settings write to fail');
      }, function (err) {
        assert.ok(err);
      });
    }).then(function () {
      var recordAfterFailedDrop = context.workspaceState.get(ext.OWNERSHIP_STATE_KEY);
      assert.strictEqual(recordAfterFailedDrop.status, 'pending');
      assert.ok(
        Object.prototype.hasOwnProperty.call(recordAfterFailedDrop.entries, 'activityBar.background'),
        'the dropped activity surface baseline must be retained in the pending record after a failed write'
      );
    });
  });
});

describe('runAcquireAndWrite rechecks configuration immediately before config.update (Revision2 substep risk2)', function () {
  it('detects a settings change that happened during the durable pending-record persist and does not stale-overwrite it', function () {
    var mutated = false;
    var fake = createFakeVscode({
      workspaceValue: undefined,
      quickPicks: [{ kind: 'custom' }, []],
      inputBoxes: ['#1976D2']
    });
    var context = createFakeContext({
      onStateUpdate: function (key) {
        var ext = extensionModule.createExtension(fake.vscode);
        if (key === ext.OWNERSHIP_STATE_KEY && !mutated) {
          mutated = true;
          // Simulate an external actor writing an unrelated key while our pending journal persists.
          fake.state.workspaceValue = Object.assign({}, fake.state.workspaceValue, { 'editor.foreground': '#EEEEEE' });
        }
      }
    });
    var ext = extensionModule.createExtension(fake.vscode);
    return ext.configureWorkspaceColors(context).then(function () {
      assert.strictEqual(fake.updateCalls.length, 0, 'must not write settings after detecting the race');
      assert.strictEqual(fake.state.workspaceValue['editor.foreground'], '#EEEEEE', 'must preserve the unrelated concurrent edit');
      assert.strictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), undefined, 'must roll back to the prior (absent) record rather than staling a plan that was never applied');
    });
  });
});

describe('planAcquire blocks on global-scope nested theme-selector conflicts too (Revision2 substep risk3)', function () {
  it('blocks the affected surface when only the inherited/global value has a matching nested theme-selector override', function () {
    var plan = wc.planAcquire({
      rawWorkspaceValue: undefined,
      rawGlobalValue: { '[Some Theme]': { 'titleBar.activeBackground': '#111111' } },
      plannedColors: { 'titleBar.activeBackground': '#1976D2', 'titleBar.activeForeground': '#FFFFFF' }
    });
    assert.ok(plan.blockedSurfaces.indexOf('title') !== -1);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(plan.nextValue, 'titleBar.activeBackground'), false);
  });
});

describe('configureWorkspaceColors refuses when every planned surface is conflict-blocked (Revision2 substep risk3)', function () {
  it('does not write empty/false-success settings or state when the mandatory title surface is fully blocked by a theme-selector override', function () {
    var fake = createFakeVscode({
      workspaceValue: {
        '[Some Theme]': {
          'titleBar.activeBackground': '#111111',
          'titleBar.activeForeground': '#111111',
          'titleBar.inactiveBackground': '#111111',
          'titleBar.inactiveForeground': '#111111'
        }
      },
      quickPicks: [{ kind: 'custom' }, []],
      inputBoxes: ['#1976D2']
    });
    var context = createFakeContext();
    var ext = extensionModule.createExtension(fake.vscode);
    return ext.configureWorkspaceColors(context).then(function () {
      assert.strictEqual(fake.updateCalls.length, 0);
      assert.strictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), undefined);
      assert.ok(fake.messages.errors.length > 0);
    });
  });
});

describe('external configuration-change observation during an open picker (Revision2 substep risk4)', function () {
  it('captures the configuration snapshot at event-fire time so a transient external loss+restore during an open picker is still detected as lost', function () {
    var fake = createFakeVscode({ workspaceValue: undefined });
    var context = createFakeContext();
    var ext = extensionModule.createExtension(fake.vscode);
    ext.activate(context);

    var committed = {
      schemaVersion: wc.SCHEMA_VERSION,
      status: 'committed',
      wholeObjectWasAbsent: true,
      surfaces: { title: true, status: false, activity: false },
      entries: {
        'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2' },
        'titleBar.activeForeground': { hadValue: false, originalValue: undefined, lastApplied: '#FFFFFF' },
        'titleBar.inactiveBackground': { hadValue: false, originalValue: undefined, lastApplied: '#0F4C99' },
        'titleBar.inactiveForeground': { hadValue: false, originalValue: undefined, lastApplied: '#FFFFFF' }
      }
    };
    context.workspaceState.update(ext.OWNERSHIP_STATE_KEY, committed);
    fake.state.workspaceValue = {
      'titleBar.activeBackground': '#1976D2',
      'titleBar.activeForeground': '#FFFFFF',
      'titleBar.inactiveBackground': '#0F4C99',
      'titleBar.inactiveForeground': '#FFFFFF'
    };

    var releasePicker;
    var pickerPromise = new Promise(function (resolve) { releasePicker = resolve; });
    fake.vscode.window.showQuickPick = function () { return pickerPromise; };

    // Occupy the command queue with an open (unresolved) accent picker.
    var configurePromise = fake.registeredCommands['dragonBall.workspaceColors.configure']();

    // External writer: accent -> X -> accent, all while the picker above is still open.
    fake.state.workspaceValue['titleBar.activeBackground'] = '#000000';
    fake.fireConfigChange();
    fake.state.workspaceValue['titleBar.activeBackground'] = '#1976D2';
    fake.fireConfigChange();

    releasePicker(undefined); // user cancels the accent picker

    return configurePromise.then(function () {
      return fake.registeredCommands['dragonBall.workspaceColors.disable']();
    }).then(function () {
      assert.ok(
        fake.messages.warnings.some(function (msg) { return msg.indexOf('titleBar.activeBackground') !== -1; }),
        'the transient external loss must have stuck; disable must report it instead of silently treating the coincidentally-restored value as still owned'
      );
    });
  });

  it('does not leak an unhandled rejection when the queued external-loss task itself fails, and the command queue keeps working afterward', function () {
    var shouldFail = false;
    var fake = createFakeVscode({ workspaceValue: {} });
    var context = createFakeContext({
      onStateUpdate: function () {
        if (shouldFail) {
          shouldFail = false;
          return Promise.reject(new Error('simulated state write failure'));
        }
      }
    });
    var ext = extensionModule.createExtension(fake.vscode);
    ext.activate(context);

    context.workspaceState.update(ext.OWNERSHIP_STATE_KEY, {
      schemaVersion: wc.SCHEMA_VERSION,
      status: 'committed',
      wholeObjectWasAbsent: true,
      surfaces: { title: true, status: false, activity: false },
      entries: { 'titleBar.activeBackground': { hadValue: false, originalValue: undefined, lastApplied: '#1976D2' } }
    });
    fake.state.workspaceValue = { 'titleBar.activeBackground': '#000000' };
    shouldFail = true;
    fake.fireConfigChange();

    return fake.registeredCommands['dragonBall.workspaceColors.disable']().then(function () {
      // The queue must still be usable after the failed background task; disable ran and completed.
      assert.strictEqual(context.workspaceState.get(ext.OWNERSHIP_STATE_KEY), undefined);
    });
  });
});

describe('scripts/verify-vsix validatePackagedArchive (review1 P1 #10 archive verifier)', function () {
  function themeEntries(count) {
    var themes = [];
    var entries = [];
    for (var i = 0; i < count; i++) {
      var themePath = './themes/theme-' + i + '-color-theme.json';
      themes.push({ label: 'Theme ' + i, uiTheme: 'vs-dark', path: themePath });
      entries.push('extension/themes/theme-' + i + '-color-theme.json');
    }
    return { themes: themes, entries: entries };
  }

  function validManifestAndEntries() {
    var fixture = themeEntries(15);
    var manifest = {
      main: './dist/extension.js',
      icon: 'images/logo.png',
      contributes: { themes: fixture.themes }
    };
    var entries = [
      'extension/package.json',
      'extension/LICENSE.txt',
      'extension/README.md',
      'extension/CHANGELOG.md',
      'extension/dist/extension.js',
      'extension/dist/workspace-colors.js',
      'extension/images/logo.png'
    ].concat(fixture.entries);
    return { manifest: manifest, entries: entries };
  }

  it('accepts a well-formed packaged archive with all 15 themes, main and icon present', function () {
    var fixture = validManifestAndEntries();
    var result = verifyVsix.validatePackagedArchive(fixture.entries, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), true);
  });

  it('rejects a malformed (non-JSON) packaged manifest', function () {
    var fixture = validManifestAndEntries();
    var result = verifyVsix.validatePackagedArchive(fixture.entries, '{ not: valid json');
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.manifestError);
  });

  it('rejects when the packaged manifest declares a "main" that has no matching archive entry', function () {
    var fixture = validManifestAndEntries();
    var entriesWithoutMain = fixture.entries.filter(function (name) { return name !== 'extension/dist/extension.js'; });
    var result = verifyVsix.validatePackagedArchive(entriesWithoutMain, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.missing.indexOf('extension/dist/extension.js') !== -1);
  });

  it('rejects when the packaged manifest declares an "icon" that has no matching archive entry', function () {
    var fixture = validManifestAndEntries();
    var entriesWithoutIcon = fixture.entries.filter(function (name) { return name !== 'extension/images/logo.png'; });
    var result = verifyVsix.validatePackagedArchive(entriesWithoutIcon, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.missing.indexOf('extension/images/logo.png') !== -1);
  });

  it('reports missing themes when fewer than 15 are present in the packaged manifest', function () {
    var fixture = validManifestAndEntries();
    var shortManifest = Object.assign({}, fixture.manifest, { contributes: { themes: fixture.manifest.contributes.themes.slice(0, 14) } });
    var result = verifyVsix.validatePackagedArchive(fixture.entries, JSON.stringify(shortManifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.strictEqual(result.missingThemes.length, 1);
  });

  it('flags an unexpected .py file as forbidden even though it is not in any known-bad directory', function () {
    var fixture = validManifestAndEntries();
    var withStray = fixture.entries.concat(['extension/rogue.py']);
    var result = verifyVsix.validatePackagedArchive(withStray, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.forbidden.indexOf('extension/rogue.py') !== -1);
  });

  it('flags a nested .vsix embedded in the archive as forbidden', function () {
    var fixture = validManifestAndEntries();
    var withNested = fixture.entries.concat(['extension/inner/nested.vsix']);
    var result = verifyVsix.validatePackagedArchive(withNested, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.forbidden.indexOf('extension/inner/nested.vsix') !== -1);
  });

  it('flags excluded source-only paths (test/scripts/docs) as forbidden', function () {
    var fixture = validManifestAndEntries();
    var withExcluded = fixture.entries.concat(['extension/test/workspace-colors.test.js', 'extension/scripts/build.js', 'extension/docs/rfc/workspace-colors.md']);
    var result = verifyVsix.validatePackagedArchive(withExcluded, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.strictEqual(result.forbidden.length, 3);
  });

  it('accepts the real vsce-generated root metadata entries alongside the extension payload', function () {
    var fixture = validManifestAndEntries();
    var withRootMetadata = ['extension.vsixmanifest', '[Content_Types].xml'].concat(fixture.entries);
    var result = verifyVsix.validatePackagedArchive(withRootMetadata, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), true);
    assert.strictEqual(result.forbidden.length, 0);
  });

  it('rejects a root-level entry that only resembles the exact metadata filenames', function () {
    var fixture = validManifestAndEntries();
    var withLookalike = fixture.entries.concat(['extension.vsixmanifest.bak', 'Content_Types.xml']);
    var result = verifyVsix.validatePackagedArchive(withLookalike, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.strictEqual(result.forbidden.length, 2);
  });

  it('rejects an unapproved filename dropped directly in dist/ (regression: dist/[^/]+ was too broad)', function () {
    var fixture = validManifestAndEntries();
    var withRogueDist = fixture.entries.concat(['extension/dist/rogue.vsix']);
    var result = verifyVsix.validatePackagedArchive(withRogueDist, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.forbidden.indexOf('extension/dist/rogue.vsix') !== -1);
  });

  it('rejects an unapproved filename dropped directly in images/ (regression: images/[^/]+ was too broad)', function () {
    var fixture = validManifestAndEntries();
    var withRogueImage = fixture.entries.concat(['extension/images/rogue.png']);
    var result = verifyVsix.validatePackagedArchive(withRogueImage, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.forbidden.indexOf('extension/images/rogue.png') !== -1);
  });

  it('rejects a themes/ entry that does not match the *-color-theme.json naming convention (regression: themes/[^/]+ was too broad)', function () {
    var fixture = validManifestAndEntries();
    var withRogueTheme = fixture.entries.concat(['extension/themes/rogue.vsix']);
    var result = verifyVsix.validatePackagedArchive(withRogueTheme, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.forbidden.indexOf('extension/themes/rogue.vsix') !== -1);
  });

  it('rejects when the required extension/CHANGELOG.md entry is missing', function () {
    var fixture = validManifestAndEntries();
    var entriesWithoutChangelog = fixture.entries.filter(function (name) { return name !== 'extension/CHANGELOG.md'; });
    var result = verifyVsix.validatePackagedArchive(entriesWithoutChangelog, JSON.stringify(fixture.manifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.missing.indexOf('extension/CHANGELOG.md') !== -1);
  });

  it('rejects a packaged manifest that parses to a non-object (e.g. an array) instead of crashing', function () {
    var fixture = validManifestAndEntries();
    var result = verifyVsix.validatePackagedArchive(fixture.entries, JSON.stringify([1, 2, 3]));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.manifestError);
  });

  it('rejects a packaged manifest that parses to null instead of crashing', function () {
    var fixture = validManifestAndEntries();
    var result = verifyVsix.validatePackagedArchive(fixture.entries, 'null');
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.manifestError);
  });

  it('rejects when "contributes.themes" is not an array instead of crashing', function () {
    var fixture = validManifestAndEntries();
    var malformedManifest = Object.assign({}, fixture.manifest, { contributes: { themes: 'not-an-array' } });
    var result = verifyVsix.validatePackagedArchive(fixture.entries, JSON.stringify(malformedManifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.missingThemes.length > 0);
  });

  it('rejects a theme entry with a missing/non-string "path" instead of crashing', function () {
    var fixture = validManifestAndEntries();
    var themesWithNullPath = fixture.manifest.contributes.themes.slice(0, 14).concat([{ label: 'Broken', uiTheme: 'vs-dark' }]);
    var malformedManifest = Object.assign({}, fixture.manifest, { contributes: { themes: themesWithNullPath } });
    var result = verifyVsix.validatePackagedArchive(fixture.entries, JSON.stringify(malformedManifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.missingThemes.length > 0);
  });

  it('rejects a "main" that attempts path traversal outside the extension root', function () {
    var fixture = validManifestAndEntries();
    var malformedManifest = Object.assign({}, fixture.manifest, { main: '../../etc/passwd' });
    var result = verifyVsix.validatePackagedArchive(fixture.entries, JSON.stringify(malformedManifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.missing.some(function (entry) { return entry.indexOf('main') !== -1; }));
  });

  it('rejects an "icon" given as an absolute path', function () {
    var fixture = validManifestAndEntries();
    var malformedManifest = Object.assign({}, fixture.manifest, { icon: '/etc/passwd' });
    var result = verifyVsix.validatePackagedArchive(fixture.entries, JSON.stringify(malformedManifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.missing.some(function (entry) { return entry.indexOf('icon') !== -1; }));
  });

  it('rejects a theme "path" that attempts path traversal outside the extension root', function () {
    var fixture = validManifestAndEntries();
    var themesWithTraversal = fixture.manifest.contributes.themes.slice(0, 14).concat([{ label: 'Broken', uiTheme: 'vs-dark', path: '../../secret-color-theme.json' }]);
    var malformedManifest = Object.assign({}, fixture.manifest, { contributes: { themes: themesWithTraversal } });
    var result = verifyVsix.validatePackagedArchive(fixture.entries, JSON.stringify(malformedManifest));
    assert.strictEqual(verifyVsix.isValidResult(result), false);
    assert.ok(result.missingThemes.length > 0);
  });
});
