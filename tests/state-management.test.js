'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  SCRIPTS_DIR,
  setupWorkspace,
  teardownWorkspace,
  tasksDir,
  assertFileExists,
} = require('./helpers/common');

const INIT = path.join(SCRIPTS_DIR, 'init-task.js');
const READ = path.join(SCRIPTS_DIR, 'read-state.js');
const UPDATE = path.join(SCRIPTS_DIR, 'update-state.js');

function run(script, args, opts = {}) {
  const r = spawnSync('node', [script, ...args], { encoding: 'utf8', ...opts });
  return {
    status: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    output: (r.stdout || '') + (r.stderr || ''),
  };
}

let workspace;

beforeEach(() => { workspace = setupWorkspace(); });
afterEach(() => { teardownWorkspace(workspace); });

describe('read-state.js', () => {
  it('outputs full state JSON for a task slug', () => {
    const init = run(INIT, ['my-task', workspace]);
    assert.equal(init.status, 0);

    const r = run(READ, ['my-task', workspace]);
    assert.equal(r.status, 0);
    const state = JSON.parse(r.stdout);
    assert.equal(state.status, 'discovery');
    assert.equal(state.current_phase, 0);
    assert.equal(state.current_step, 'discussion');
    assert.equal(state.task.slug, 'my-task');
  });

  it('accepts an explicit state.yaml path', () => {
    run(INIT, ['my-task', workspace]);
    const statePath = path.join(tasksDir(workspace), 'SF-001-my-task', 'state.yaml');
    assertFileExists(statePath);

    const r = run(READ, [statePath]);
    assert.equal(r.status, 0);
    const state = JSON.parse(r.stdout);
    assert.equal(state.task.id, 'SF-001');
  });
});

describe('update-state.js', () => {
  it('updates a scalar field by dot-path and bumps task.updated_at', () => {
    run(INIT, ['my-task', workspace]);

    const before = JSON.parse(run(READ, ['my-task', workspace]).stdout);
    assert.ok(before.task.updated_at);

    const u = run(UPDATE, ['my-task', 'status', 'phase-execution', workspace]);
    assert.equal(u.status, 0);
    assert.match(u.stdout, /ok/);

    const after = JSON.parse(run(READ, ['my-task', workspace]).stdout);
    assert.equal(after.status, 'phase-execution');
    assert.notEqual(after.task.updated_at, before.task.updated_at);

    const stateFile = path.join(tasksDir(workspace), 'SF-001-my-task', 'state.yaml');
    assert.ok(!fs.existsSync(`${stateFile}.tmp`));
  });

  it('updates array item fields by numeric path segment', () => {
    run(INIT, ['my-task', workspace]);

    // Append a phase, then update its status.
    const phase = JSON.stringify({ id: 1, name: 'Phase 1', status: 'pending' });
    assert.equal(run(UPDATE, ['my-task', 'phases[]', phase, workspace]).status, 0);
    assert.equal(run(UPDATE, ['my-task', 'phases.0.status', 'in-progress', workspace]).status, 0);

    const state = JSON.parse(run(READ, ['my-task', workspace]).stdout);
    assert.equal(state.phases.length, 1);
    assert.equal(state.phases[0].status, 'in-progress');
  });

  it('appends to array fields using [] suffix', () => {
    run(INIT, ['my-task', workspace]);

    const service = JSON.stringify({ name: 'api', status: 'pending' });
    const u = run(UPDATE, ['my-task', 'services[]', service, workspace]);
    assert.equal(u.status, 0);

    const state = JSON.parse(run(READ, ['my-task', workspace]).stdout);
    assert.equal(state.services.length, 1);
    assert.equal(state.services[0].name, 'api');
  });

  it('fails with non-zero exit code on unknown task slug', () => {
    run(INIT, ['some-task', workspace]);
    const u = run(UPDATE, ['missing-task', 'status', 'spec', workspace]);
    assert.notEqual(u.status, 0);
    assert.match(u.stderr, /no task directory found/);
  });
});

