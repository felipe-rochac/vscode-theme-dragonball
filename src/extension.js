'use strict';

var planner = require('./workspace-colors');

var OWNERSHIP_STATE_KEY = 'dragonBall.workspaceColors.ownership';
var PEACOCK_EXTENSION_ID = 'johnpapa.vscode-peacock';
var CONFIGURE_COMMAND_ID = 'dragonBall.workspaceColors.configure';
var DISABLE_COMMAND_ID = 'dragonBall.workspaceColors.disable';
var LAUNCHER_LABEL = 'Configure Workspace Colors';

function isRecordObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Everything below is written against an injected `vscode`-like API so it can be exercised by
// plain Mocha adapter tests (no Extension Host required) as well as by the real VS Code runtime.
function createExtension(vscode) {
  var observedOwnership = new WeakMap();

  function getEligibleWorkspace() {
    var folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return { eligible: false, reason: 'Open a folder or saved workspace before configuring workspace colors.' };
    }
    var workspaceFile = vscode.workspace.workspaceFile;
    if (workspaceFile && workspaceFile.scheme === 'untitled') {
      return { eligible: false, reason: 'Save this multi-root workspace before configuring workspace colors.' };
    }
    return { eligible: true };
  }

  function getColorCustomizationsInspection() {
    var config = vscode.workspace.getConfiguration();
    return config.inspect('workbench.colorCustomizations');
  }

  // Shallow-copies the top-level object(s) so a later in-place mutation of the live configuration
  // value cannot retroactively change an already-captured snapshot (only top-level string/hex
  // values are ever read from these objects elsewhere in this module).
  function snapshotColorCustomizationsInspection() {
    var inspection = getColorCustomizationsInspection();
    if (!inspection) {
      return inspection;
    }
    return {
      workspaceValue: isRecordObject(inspection.workspaceValue) ? Object.assign({}, inspection.workspaceValue) : inspection.workspaceValue,
      globalValue: isRecordObject(inspection.globalValue) ? Object.assign({}, inspection.globalValue) : inspection.globalValue
    };
  }

  function warnIfPeacockPresent() {
    var peacock = vscode.extensions.getExtension(PEACOCK_EXTENSION_ID);
    if (peacock) {
      vscode.window.showWarningMessage(
        'The Peacock extension is installed. This does not by itself indicate ownership of any color, ' +
        'but conflicting automation between the two extensions is possible.'
      );
    }
  }

  function promptForAccent() {
    var items = [{ label: '$(paintcan) Custom hex color…', kind: 'custom' }];
    Object.keys(planner.PRESETS).forEach(function (presetKey) {
      var preset = planner.PRESETS[presetKey];
      items.push({ label: preset.label, description: preset.hex, kind: 'preset', preset: presetKey });
    });
    return vscode.window.showQuickPick(items, {
      title: 'Dragon Ball: Choose a workspace accent color',
      placeHolder: 'Select a preset or enter a custom hex color'
    }).then(function (picked) {
      if (!picked) {
        return null;
      }
      if (picked.kind === 'preset') {
        return planner.PRESETS[picked.preset].hex;
      }
      return vscode.window.showInputBox({
        title: 'Dragon Ball: Enter a custom hex color',
        placeHolder: '#RRGGBB or #RGB',
        validateInput: function (value) {
          return planner.normalizeHex(value) ? null : 'Enter a valid #RGB or #RRGGBB hex color.';
        }
      }).then(function (hexInput) {
        if (!hexInput) {
          return null;
        }
        return planner.normalizeHex(hexInput);
      });
    });
  }

  function promptForSurfaces() {
    var items = [
      { label: 'Sidebars / Copilot Chat', description: 'Recommended', picked: true, surface: 'sidebar' },
      { label: 'Panels / Terminal', description: 'Recommended', picked: true, surface: 'panel' },
      { label: 'Status Bar', picked: false, surface: 'status' },
      { label: 'Activity Bar', picked: false, surface: 'activity' }
    ];
    return vscode.window.showQuickPick(items, {
      title: 'Dragon Ball: Optional additional surfaces (title bar is always included)',
      canPickMany: true,
      placeHolder: 'Select any additional surfaces, then press Enter (title bar only if none) — Escape cancels'
    }).then(function (picked) {
      // Escape must cancel the whole command, not silently fall back to "title bar only".
      // An explicit Enter with nothing checked returns [] and legitimately means title-only.
      if (picked === undefined) {
        return null;
      }
      var surfaces = { title: true, status: false, activity: false, sidebar: false, panel: false };
      picked.forEach(function (item) {
        surfaces[item.surface] = true;
      });
      return surfaces;
    });
  }

  function confirmConflicts(plan) {
    var totalBlocking = plan.conflicts.length + plan.reacquireConflicts.length + plan.globalConflicts.length;
    if (totalBlocking === 0) {
      return Promise.resolve(true);
    }
    var lines = [];
    if (plan.conflicts.length > 0) {
      lines.push('Existing overrides on: ' + plan.conflicts.map(function (c) { return c.key; }).join(', '));
    }
    if (plan.reacquireConflicts.length > 0) {
      lines.push(
        'Previously owned keys changed outside this extension: ' +
        plan.reacquireConflicts.map(function (c) { return c.key; }).join(', ')
      );
    }
    if (plan.globalConflicts.length > 0) {
      lines.push('Inherited user/global overrides on: ' + plan.globalConflicts.map(function (c) { return c.key; }).join(', '));
    }
    var message = 'Dragon Ball Workspace Colors found conflicting settings.\n' + lines.join('\n');
    return vscode.window.showWarningMessage(message, { modal: true }, 'Overwrite named keys').then(function (choice) {
      return choice === 'Overwrite named keys';
    });
  }

  function plansAreEquivalent(a, b) {
    return JSON.stringify(a.nextValue) === JSON.stringify(b.nextValue) &&
      JSON.stringify(a.conflicts) === JSON.stringify(b.conflicts) &&
      JSON.stringify(a.reacquireConflicts) === JSON.stringify(b.reacquireConflicts) &&
      JSON.stringify(a.globalConflicts) === JSON.stringify(b.globalConflicts) &&
      JSON.stringify(a.themeSelectorConflicts) === JSON.stringify(b.themeSelectorConflicts);
  }

  function loadValidatedRecord(context) {
    var record = context.workspaceState.get(OWNERSHIP_STATE_KEY);
    if (record === undefined) {
      return { present: false };
    }
    var validation = planner.validateOwnershipRecord(record);
    if (!validation.valid) {
      return { present: true, valid: false, reason: validation.reason, record: record };
    }
    return { present: true, valid: true, record: record };
  }

  // Loads the stored ownership record (if any), refusing to trust anything that fails schema
  // validation, and resolves a still-pending (interrupted) record through explicit, bounded user
  // choices rather than any automatic restoration.
  function resolveStoredRecord(context) {
    var loaded = loadValidatedRecord(context);
    if (!loaded.present) {
      return Promise.resolve({ status: 'none' });
    }
    if (!loaded.valid) {
      return Promise.resolve(
        vscode.window.showWarningMessage(
          'Dragon Ball Workspace Colors found a stored ownership record that failed validation (' +
          loaded.reason + '). It will not be used for automatic restoration.',
          { modal: true },
          'Clear record (no settings change)'
        )
      ).then(function (choice) {
        if (choice !== 'Clear record (no settings change)') {
          return { status: 'abort' };
        }
        // Clearing a corrupt record is terminal for this invocation: it must not silently fall
        // through into a fresh accent prompt in the same command run.
        return Promise.resolve(context.workspaceState.update(OWNERSHIP_STATE_KEY, undefined)).then(function () {
          return { status: 'abort' };
        });
      });
    }

    var record = loaded.record;
    if (record.status === 'committed') {
      return Promise.resolve({
        status: 'ok',
        entries: record.entries,
        wholeObjectWasAbsent: record.wholeObjectWasAbsent,
        surfaces: record.surfaces
      });
    }

    var recordSnapshot = JSON.stringify(record);
    var inspection = snapshotColorCustomizationsInspection();
    var base = inspection && isRecordObject(inspection.workspaceValue) ? inspection.workspaceValue : {};
    var allMatch = Object.keys(record.entries).every(function (key) {
      var entry = record.entries[key];
      return Object.prototype.hasOwnProperty.call(base, key) && base[key] === entry.lastApplied;
    });

    if (allMatch) {
      // Deliberately no state write here: promoting a pending-but-matching record to
      // 'committed' before the user has actually continued (and possibly cancels) the flow
      // would mutate stored state on a no-op invocation. The eventual write path (a fresh
      // pending record followed by a real commit) supersedes this record if the user proceeds;
      // if they cancel, the original pending record is left exactly as it was.
      return Promise.resolve({
        status: 'ok',
        entries: record.entries,
        wholeObjectWasAbsent: record.wholeObjectWasAbsent,
        surfaces: record.surfaces
      });
    }

    return Promise.resolve(
      vscode.window.showWarningMessage(
        'Dragon Ball Workspace Colors was interrupted before it could confirm its last change. ' +
        'Choose how to resolve it before continuing.',
        { modal: true },
        'Restore original values', 'Keep current colors as applied'
      )
    ).then(function (choice) {
      if (choice !== 'Restore original values' && choice !== 'Keep current colors as applied') {
        return { status: 'abort' };
      }
      var latestInspection = getColorCustomizationsInspection();
      var latestBase = latestInspection && isRecordObject(latestInspection.workspaceValue) ? latestInspection.workspaceValue : {};
      var recoveryInputsMatch = JSON.stringify(context.workspaceState.get(OWNERSHIP_STATE_KEY)) === recordSnapshot &&
        Object.keys(record.entries).every(function (key) {
          return Object.prototype.hasOwnProperty.call(base, key) === Object.prototype.hasOwnProperty.call(latestBase, key) &&
            base[key] === latestBase[key];
        });
      if (!recoveryInputsMatch) {
        vscode.window.showWarningMessage(
          'Workspace color recovery inputs changed while confirming. The pending record was kept; run the command again.'
        );
        return { status: 'abort' };
      }
      if (choice === 'Restore original values') {
        // Force: the record is ambiguous/interrupted (its lastApplied value didn't match the
        // live one above), so the live value cannot tell us whether our own write ever took
        // effect. The user explicitly chose to restore originals; honor that unconditionally
        // rather than silently leaving the ambiguous value in place.
        var restore = planner.planRestore({
          rawWorkspaceValue: latestInspection ? latestInspection.workspaceValue : undefined,
          journalEntries: record.entries,
          wholeObjectWasAbsent: record.wholeObjectWasAbsent,
          force: true
        });
        var config = vscode.workspace.getConfiguration();
        return Promise.resolve(
          config.update('workbench.colorCustomizations', restore.nextValue, vscode.ConfigurationTarget.Workspace)
        ).then(function () {
          var readBack = getColorCustomizationsInspection();
          var matches = JSON.stringify(readBack ? readBack.workspaceValue : undefined) === JSON.stringify(restore.nextValue);
          if (!matches) {
            vscode.window.showErrorMessage(
              'Dragon Ball Workspace Colors could not confirm the recovery write. The pending record was kept; try again.'
            );
            return { status: 'abort' };
          }
          // Terminal for this invocation: recovering the interrupted record must not fall
          // through into a new accent prompt in the same command run.
          return Promise.resolve(context.workspaceState.update(OWNERSHIP_STATE_KEY, undefined)).then(function () {
            vscode.window.showInformationMessage(
              'Dragon Ball Workspace Colors recovered the interrupted change by restoring original values.'
            );
            return { status: 'abort' };
          });
        });
      }
      if (choice === 'Keep current colors as applied') {
        var keptRecord = Object.assign({}, record, { status: 'committed' });
        return Promise.resolve(context.workspaceState.update(OWNERSHIP_STATE_KEY, keptRecord)).then(function () {
          vscode.window.showInformationMessage(
            'Dragon Ball Workspace Colors kept the current colors as applied. Run the command again to continue.'
          );
          return { status: 'abort' };
        });
      }
      return { status: 'abort' };
    });
  }

  function buildPlan(accentHex, selectedSurfaces, previousOwnership, previousWholeObjectWasAbsent) {
    var plannedColors = planner.buildSurfaceColors(accentHex, selectedSurfaces);
    var inspection = getColorCustomizationsInspection();
    var plan = planner.planAcquire({
      rawWorkspaceValue: inspection ? inspection.workspaceValue : undefined,
      rawGlobalValue: inspection ? inspection.globalValue : undefined,
      plannedColors: plannedColors,
      previousOwnership: observedOwnership.get(previousOwnership) || previousOwnership,
      previousWholeObjectWasAbsent: previousWholeObjectWasAbsent
    });
    return plan;
  }

  function runAcquireAndWrite(context, accentHex, selectedSurfaces, previousOwnership, previousWholeObjectWasAbsent) {
    var plan = buildPlan(accentHex, selectedSurfaces, previousOwnership, previousWholeObjectWasAbsent);

    if (plan.blockedSurfaces.length > 0) {
      vscode.window.showWarningMessage(
        'Dragon Ball Workspace Colors will not apply to: ' + plan.blockedSurfaces.join(', ') +
        ' because a theme-specific override already defines one of these keys. Remove the override to apply this surface.'
      );
    }

    // The title surface is mandatory (always requested); if a theme-selector override blocks it
    // entirely there is nothing sensible left to write. Refuse outright rather than persisting an
    // empty/no-op "success".
    if (plan.blockedSurfaces.indexOf('title') !== -1) {
      vscode.window.showErrorMessage(
        'Dragon Ball Workspace Colors could not apply any color: the title bar keys are fully overridden by a theme-specific selector. Remove that override and try again.'
      );
      return Promise.resolve();
    }

    return confirmConflicts(plan).then(function (confirmed) {
      if (!confirmed) {
        return;
      }

      var recheck = buildPlan(accentHex, selectedSurfaces, previousOwnership, previousWholeObjectWasAbsent);
      if (!plansAreEquivalent(plan, recheck)) {
        vscode.window.showWarningMessage(
          'Workspace color settings changed while confirming. Run the command again to retry.'
        );
        return;
      }

      // Durable pending journal, written and awaited BEFORE the settings mutation: if the process
      // dies between here and the settings write/commit, the record is retained (not cleared) so
      // the next invocation can offer explicit, bounded recovery instead of guessing. It uses
      // pendingJournalEntries (not journalEntries) so a dropped surface's own prior baseline
      // survives a failed/interrupted write instead of being forgotten.
      var priorRecordSnapshot = context.workspaceState.get(OWNERSHIP_STATE_KEY);
      var pendingRecord = {
        schemaVersion: planner.SCHEMA_VERSION,
        status: 'pending',
        wholeObjectWasAbsent: plan.wholeObjectWasAbsent,
        surfaces: selectedSurfaces,
        entries: plan.pendingJournalEntries
      };

      return Promise.resolve(context.workspaceState.update(OWNERSHIP_STATE_KEY, pendingRecord)).then(function () {
        // Recheck immediately before the settings write: the durable persist above can itself
        // take a tick, during which another writer could change configuration. Writing plan's
        // stale nextValue at that point would silently clobber that concurrent edit.
        var preWritePlan = buildPlan(accentHex, selectedSurfaces, previousOwnership, previousWholeObjectWasAbsent);
        if (!plansAreEquivalent(plan, preWritePlan)) {
          return Promise.resolve(context.workspaceState.update(OWNERSHIP_STATE_KEY, priorRecordSnapshot)).then(function () {
            vscode.window.showWarningMessage(
              'Workspace color settings changed while persisting the pending record. Run the command again to retry.'
            );
          });
        }

        var config = vscode.workspace.getConfiguration();
        return Promise.resolve(
          config.update('workbench.colorCustomizations', plan.nextValue, vscode.ConfigurationTarget.Workspace)
        ).then(function () {
          var readBack = getColorCustomizationsInspection();
          var readBackMatches = JSON.stringify(readBack ? readBack.workspaceValue : undefined) === JSON.stringify(plan.nextValue);
          if (!readBackMatches) {
            vscode.window.showErrorMessage(
              'Dragon Ball Workspace Colors could not confirm the write. The pending record was kept; run the command again to resolve it.'
            );
            return;
          }
          var committedRecord = Object.assign({}, pendingRecord, { status: 'committed', entries: plan.journalEntries });
          return Promise.resolve(context.workspaceState.update(OWNERSHIP_STATE_KEY, committedRecord)).then(function () {
            vscode.window.showInformationMessage('Dragon Ball Workspace Colors applied.');
          });
        }, function (err) {
          vscode.window.showErrorMessage(
            'Dragon Ball Workspace Colors failed to write settings. The pending record was kept; run the command again to resolve it.'
          );
          throw err;
        });
      });
    });
  }

  function configureWorkspaceColors(context) {
    var eligibility = getEligibleWorkspace();
    if (!eligibility.eligible) {
      vscode.window.showErrorMessage(eligibility.reason);
      return Promise.resolve();
    }

    warnIfPeacockPresent();

    return resolveStoredRecord(context).then(function (resolved) {
      if (resolved.status === 'abort') {
        return;
      }
      var previousOwnership = resolved.status === 'ok' ? resolved.entries : {};
      var previousWholeObjectWasAbsent = resolved.status === 'ok' ? resolved.wholeObjectWasAbsent : undefined;

      return promptForAccent().then(function (accentHex) {
        if (!accentHex) {
          return;
        }
        return promptForSurfaces().then(function (selectedSurfaces) {
          if (!selectedSurfaces) {
            return;
          }
          return runAcquireAndWrite(context, accentHex, selectedSurfaces, previousOwnership, previousWholeObjectWasAbsent);
        });
      });
    });
  }

  function disableWorkspaceColors(context) {
    var eligibility = getEligibleWorkspace();
    if (!eligibility.eligible) {
      vscode.window.showErrorMessage(eligibility.reason);
      return Promise.resolve();
    }

    return resolveStoredRecord(context).then(function (resolved) {
      if (resolved.status === 'abort') {
        return;
      }
      if (resolved.status !== 'ok') {
        vscode.window.showInformationMessage('Dragon Ball Workspace Colors is not currently enabled.');
        return;
      }

      var inspection = getColorCustomizationsInspection();
      var restore = planner.planRestore({
        rawWorkspaceValue: inspection ? inspection.workspaceValue : undefined,
        journalEntries: resolved.entries,
        wholeObjectWasAbsent: resolved.wholeObjectWasAbsent
      });

      var config = vscode.workspace.getConfiguration();
      return Promise.resolve(
        config.update('workbench.colorCustomizations', restore.nextValue, vscode.ConfigurationTarget.Workspace)
      ).then(function () {
        var readBack = getColorCustomizationsInspection();
        var readBackMatches = JSON.stringify(readBack ? readBack.workspaceValue : undefined) === JSON.stringify(restore.nextValue);
        if (!readBackMatches) {
          vscode.window.showErrorMessage(
            'Dragon Ball Workspace Colors could not confirm the restore write. The ownership record was kept; run the command again.'
          );
          return;
        }
        return Promise.resolve(context.workspaceState.update(OWNERSHIP_STATE_KEY, undefined)).then(function () {
          if (restore.lostOwnership.length > 0) {
            vscode.window.showWarningMessage(
              'Dragon Ball Workspace Colors restored owned keys but could not restore (externally changed): ' +
              restore.lostOwnership.map(function (item) { return item.key; }).join(', ')
            );
          } else {
            vscode.window.showInformationMessage('Dragon Ball Workspace Colors disabled and restored.');
          }
        });
      }, function (err) {
        vscode.window.showErrorMessage(
          'Dragon Ball Workspace Colors failed to write the restore. The ownership record was kept; run the command again.'
        );
        throw err;
      });
    });
  }

  // Detects external edits/deletions of owned keys while the extension is active and marks them
  // "lost" (sticky) so a later coincidental value match cannot silently reclaim ownership.
  // `snapshotInspection`, when supplied, is the configuration inspection captured synchronously at
  // the moment the change event fired, not whatever is live once this task is actually dequeued
  // (a transient external loss+restore during an open picker would otherwise go undetected).
  function trackExternalLoss(context, snapshotInspection, observedRecord) {
    var loaded = loadValidatedRecord(context);
    if (!loaded.present || !loaded.valid || loaded.record.status !== 'committed' ||
        (observedRecord && loaded.record.entries !== observedRecord.entries)) {
      return Promise.resolve();
    }
    var inspection = snapshotInspection !== undefined ? snapshotInspection : getColorCustomizationsInspection();
    var reconciliation = planner.reconcileOwnership(
      inspection ? inspection.workspaceValue : undefined,
      observedOwnership.get(loaded.record.entries) || loaded.record.entries
    );
    var newlyLost = reconciliation.lost.filter(function (item) {
      var entry = loaded.record.entries[item.key];
      return !(entry && entry.lost === true);
    });
    if (newlyLost.length === 0) {
      return Promise.resolve();
    }
    var updatedEntries = Object.assign({}, loaded.record.entries);
    newlyLost.forEach(function (item) {
      updatedEntries[item.key] = Object.assign({}, updatedEntries[item.key], { lost: true });
    });
    var updatedRecord = Object.assign({}, loaded.record, { entries: updatedEntries });
    return Promise.resolve(context.workspaceState.update(OWNERSHIP_STATE_KEY, updatedRecord)).then(function () {
      vscode.window.showWarningMessage(
        'Dragon Ball Workspace Colors detected an external change to owned key(s): ' +
        newlyLost.map(function (item) { return item.key; }).join(', ') +
        '. Reconfigure to reacquire them.'
      );
    });
  }

  function createCommandQueue() {
    var queue = Promise.resolve();
    return function enqueue(task) {
      var settled = queue.then(task, task);
      // Failure-tolerant: a rejected command must not stall commands queued behind it.
      queue = settled.then(function () {}, function () {});
      return settled;
    };
  }

  // Single lazily-created launcher: purely presentational, registered once at activation and
  // never touched by configure/disable/surface changes. No settings/state reads or writes here.
  function createLauncher() {
    var item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    item.text = '$(paintcan)';
    item.command = CONFIGURE_COMMAND_ID;
    item.tooltip = LAUNCHER_LABEL;
    item.accessibilityInformation = { label: LAUNCHER_LABEL };
    item.show();
    return item;
  }

  function activate(context) {
    var enqueue = createCommandQueue();

    context.subscriptions.push(createLauncher());

    context.subscriptions.push(
      vscode.commands.registerCommand(CONFIGURE_COMMAND_ID, function () {
        return enqueue(function () { return configureWorkspaceColors(context); });
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand(DISABLE_COMMAND_ID, function () {
        return enqueue(function () { return disableWorkspaceColors(context); });
      })
    );
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(function (e) {
        if (!e.affectsConfiguration('workbench.colorCustomizations')) {
          return;
        }
        // Capture the snapshot synchronously, at fire time, not when this task is eventually
        // dequeued: a transient external loss+restore that both happen while an earlier command
        // (e.g. an open accent picker) still occupies the queue must still be observed as a loss.
        var snapshotInspection = snapshotColorCustomizationsInspection();
        var loaded = loadValidatedRecord(context);
        if (!loaded.present || !loaded.valid || loaded.record.status !== 'committed') {
          return;
        }
        var entries = loaded.record.entries;
        var observedEntries = observedOwnership.get(entries) || entries;
        var reconciliation = planner.reconcileOwnership(
          snapshotInspection ? snapshotInspection.workspaceValue : undefined, observedEntries
        );
        var updatedEntries = Object.assign({}, observedEntries);
        reconciliation.lost.forEach(function (item) {
          updatedEntries[item.key] = Object.assign({}, updatedEntries[item.key], { lost: true });
        });
        observedOwnership.set(entries, updatedEntries);
        enqueue(function () { return trackExternalLoss(context, snapshotInspection, loaded.record); });
      })
    );
  }

  function deactivate() {}

  return {
    activate: activate,
    deactivate: deactivate,
    // Exposed only for adapter-level unit tests exercising this module with a fake `vscode`.
    configureWorkspaceColors: configureWorkspaceColors,
    disableWorkspaceColors: disableWorkspaceColors,
    trackExternalLoss: trackExternalLoss,
    resolveStoredRecord: resolveStoredRecord,
    OWNERSHIP_STATE_KEY: OWNERSHIP_STATE_KEY
  };
}

var realExtension;
function getRealExtension() {
  if (!realExtension) {
    // Deferred require: outside a real Extension Host, the 'vscode' module does not exist. This
    // keeps the module requireable (and testable via createExtension) from plain Mocha.
    realExtension = createExtension(require('vscode'));
  }
  return realExtension;
}

module.exports = {
  activate: function (context) { return getRealExtension().activate(context); },
  deactivate: function () { return getRealExtension().deactivate(); },
  createExtension: createExtension
};
