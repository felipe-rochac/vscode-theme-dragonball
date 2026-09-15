'use strict';

var assert = require('assert');
var timers = require('timers');
var vscode = require('vscode');
var planner = require('../../src/workspace-colors');

var CONFIG_KEY = 'workbench.colorCustomizations';

function resetConfig() {
  var config = vscode.workspace.getConfiguration();
  return Promise.resolve(config.update(CONFIG_KEY, undefined, vscode.ConfigurationTarget.Workspace)).then(function () {
    return config.update(CONFIG_KEY, undefined, vscode.ConfigurationTarget.Global);
  });
}

describe('Dragon Ball Workspace Colors Extension Host integration', function () {
  this.timeout(20000);

  afterEach(function () {
    return resetConfig();
  });

  it('automatically activates after startup without requesting activation or executing a command', function () {
    var extension = vscode.extensions.getExtension('kyrone.vscode-theme-dragonball');
    assert.ok(extension, 'extension under test was not found by id');
    var before = vscode.workspace.getConfiguration().inspect(CONFIG_KEY);
    var beforeValues = JSON.stringify({ workspace: before.workspaceValue, global: before.globalValue });
    return new Promise(function (resolve, reject) {
      var deadline = Date.now() + 15000;
      var timer = timers.setInterval(function () {
        if (extension.isActive) {
          timers.clearInterval(timer);
          resolve();
        } else if (Date.now() >= deadline) {
          timers.clearInterval(timer);
          reject(new Error('onStartupFinished did not activate the extension within 15 seconds'));
        }
      }, 50);
    }).then(function () {
      var after = vscode.workspace.getConfiguration().inspect(CONFIG_KEY);
      assert.strictEqual(JSON.stringify({ workspace: after.workspaceValue, global: after.globalValue }), beforeValues);
      return vscode.commands.getCommands(true);
    }).then(function (commands) {
      assert.ok(commands.indexOf('dragonBall.workspaceColors.configure') !== -1);
      assert.ok(commands.indexOf('dragonBall.workspaceColors.disable') !== -1);
    });
  });

  it('supports explicit activation and registers both commands', function () {
    var extension = vscode.extensions.getExtension('kyrone.vscode-theme-dragonball');
    assert.ok(extension, 'extension under test was not found by id');
    return Promise.resolve(extension.activate()).then(function () {
      return vscode.commands.getCommands(true);
    }).then(function (commands) {
      assert.ok(commands.indexOf('dragonBall.workspaceColors.configure') !== -1,
        'configure command was not registered');
      assert.ok(commands.indexOf('dragonBall.workspaceColors.disable') !== -1,
        'disable command was not registered');
    });
  });

  it('writes to workspace scope only, leaving global settings untouched', function () {
    var config = vscode.workspace.getConfiguration();
    return Promise.resolve(
      config.update(CONFIG_KEY, { 'titleBar.activeBackground': '#1976D2' }, vscode.ConfigurationTarget.Workspace)
    ).then(function () {
      var inspection = config.inspect(CONFIG_KEY);
      assert.deepStrictEqual(inspection.workspaceValue, { 'titleBar.activeBackground': '#1976D2' });
      assert.strictEqual(inspection.globalValue, undefined);
    });
  });

  it('acquires and restores real workspace configuration without disturbing unrelated keys', function () {
    var config = vscode.workspace.getConfiguration();
    return Promise.resolve(
      config.update(CONFIG_KEY, { 'editor.foreground': '#ABCDEF' }, vscode.ConfigurationTarget.Workspace)
    ).then(function () {
      var inspection = config.inspect(CONFIG_KEY);
      var plannedColors = planner.buildSurfaceColors('#1976D2', { title: true, status: false, activity: false });
      var plan = planner.planAcquire({
        rawWorkspaceValue: inspection.workspaceValue,
        plannedColors: plannedColors
      });
      assert.deepStrictEqual(plan.conflicts, []);
      return Promise.resolve(
        config.update(CONFIG_KEY, plan.nextValue, vscode.ConfigurationTarget.Workspace)
      ).then(function () {
        var afterAcquire = vscode.workspace.getConfiguration().inspect(CONFIG_KEY);
        assert.strictEqual(afterAcquire.workspaceValue['editor.foreground'], '#ABCDEF');
        assert.strictEqual(
          afterAcquire.workspaceValue['titleBar.activeBackground'],
          plannedColors['titleBar.activeBackground']
        );

        var restore = planner.planRestore({
          rawWorkspaceValue: afterAcquire.workspaceValue,
          journalEntries: plan.journalEntries,
          wholeObjectWasAbsent: plan.wholeObjectWasAbsent
        });
        return Promise.resolve(
          vscode.workspace.getConfiguration().update(CONFIG_KEY, restore.nextValue, vscode.ConfigurationTarget.Workspace)
        ).then(function () {
          var afterRestore = vscode.workspace.getConfiguration().inspect(CONFIG_KEY);
          assert.deepStrictEqual(afterRestore.workspaceValue, { 'editor.foreground': '#ABCDEF' });
        });
      });
    });
  });
});
