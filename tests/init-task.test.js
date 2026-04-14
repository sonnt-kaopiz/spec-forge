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
  assertDirExists,
  assertFileExists,
  assertFileContains,
  assertFileNotContains,
} = require('./helpers/common');

const SCRIPT = path.join(SCRIPTS_DIR, 'init-task.js');

// ---------------------------------------------------------------------------
// Helper: run the script as a subprocess, return { status, output }
// `output` combines stdout + stderr (mirrors BATS `run` behaviour).
// ---------------------------------------------------------------------------
function run(args) {
  const result = spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
  return {
    status: result.status,
    output: (result.stdout || '') + (result.stderr || ''),
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

// ---------------------------------------------------------------------------
// Per-test isolated workspace
// ---------------------------------------------------------------------------
let workspace;

beforeEach(() => { workspace = setupWorkspace(); });
afterEach(() => { teardownWorkspace(workspace); });

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('input validation', () => {
  it('exits with error when no slug is provided', () => {
    const r = run(['', workspace]);
    assert.strictEqual(r.status, 1);
    assert.match(r.output, /task-slug is required/);
  });

  it('exits with error when manual mode has no short description', () => {
    const r = run(['--manual', '', workspace]);
    assert.strictEqual(r.status, 1);
    assert.match(r.output, /manual slug generation requires a short description/);
  });

  it('accepts uppercase letters in the prefix segment', () => {
    const r = run(['Add-feature', workspace]);
    assert.strictEqual(r.status, 0);
  });

  it('exits with error when slug starts with a hyphen', () => {
    const r = run(['-bad-slug', workspace]);
    assert.strictEqual(r.status, 1);
  });

  it('exits with error when slug ends with a hyphen', () => {
    const r = run(['bad-slug-', workspace]);
    assert.strictEqual(r.status, 1);
  });

  it('exits with error when slug contains spaces', () => {
    const r = run(['bad slug', workspace]);
    assert.strictEqual(r.status, 1);
  });

  it('exits with error when slug contains special characters', () => {
    const r = run(['bad_slug!', workspace]);
    assert.strictEqual(r.status, 1);
  });

  it('exits with error when suffix contains uppercase letters', () => {
    const r = run(['task-ABC', workspace]);
    assert.strictEqual(r.status, 1);
  });

  it('exits with error when slug has no hyphen separator', () => {
    const r = run(['a', workspace]);
    assert.strictEqual(r.status, 1);
  });

  it('accepts a slug with digits in the suffix', () => {
    const r = run(['fix-42', workspace]);
    assert.strictEqual(r.status, 0);
  });
});

// ---------------------------------------------------------------------------
// Directory structure
// ---------------------------------------------------------------------------

describe('directory structure', () => {
  it('creates .ai-workflow/tasks/ when it does not exist', () => {
    const r = run(['new-feature', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(tasksDir(workspace));
  });

  it('creates task directory named SF-001-<slug> for the first task', () => {
    const r = run(['new-feature', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(path.join(tasksDir(workspace), 'SF-001-new-feature'));
  });

  it('creates services/ subdirectory', () => {
    const r = run(['new-feature', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'services'));
  });

  it('creates phases/ subdirectory', () => {
    const r = run(['new-feature', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'phases'));
  });

  it('creates logs/ subdirectory', () => {
    const r = run(['new-feature', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'logs'));
  });

  it('creates a generated manual slug directory', () => {
    const r = run(['--manual', 'Add notifications', workspace]);
    assert.strictEqual(r.status, 0);

    const match = r.output.match(/Task directory: (.+SF-001-(sf-[a-z0-9]{6}addnotifications))/);
    assert.ok(match, `Expected generated manual slug in output.\nActual output:\n${r.output}`);
    assertDirExists(match[1]);
  });
});

// ---------------------------------------------------------------------------
// Template files installed
// ---------------------------------------------------------------------------

describe('template files installed', () => {
  it('creates spec.md', () => {
    run(['new-feature', workspace]);
    assertFileExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'spec.md'));
  });

  it('creates research.md', () => {
    run(['new-feature', workspace]);
    assertFileExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'research.md'));
  });

  it('creates external-research.md', () => {
    run(['new-feature', workspace]);
    assertFileExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'external-research.md'));
  });

  it('creates architecture.md', () => {
    run(['new-feature', workspace]);
    assertFileExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'architecture.md'));
  });

  it('creates plan.md', () => {
    run(['new-feature', workspace]);
    assertFileExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'plan.md'));
  });

  it('creates state.yaml', () => {
    run(['new-feature', workspace]);
    assertFileExists(path.join(tasksDir(workspace), 'SF-001-new-feature', 'state.yaml'));
  });
});

// ---------------------------------------------------------------------------
// Placeholder substitution
// ---------------------------------------------------------------------------

describe('placeholder substitution', () => {
  const taskDir = () => path.join(tasksDir(workspace), 'SF-001-new-feature');

  it('state.yaml contains the correct task ID', () => {
    run(['new-feature', workspace]);
    assertFileContains(path.join(taskDir(), 'state.yaml'), 'id: "SF-001"');
  });

  it('state.yaml contains the correct slug', () => {
    run(['new-feature', workspace]);
    assertFileContains(path.join(taskDir(), 'state.yaml'), 'slug: "new-feature"');
  });

  it('state.yaml has status set to discovery', () => {
    run(['new-feature', workspace]);
    assertFileContains(path.join(taskDir(), 'state.yaml'), 'status: "discovery"');
  });

  it('state.yaml has created_at populated (not a raw placeholder)', () => {
    run(['new-feature', workspace]);
    assertFileNotContains(path.join(taskDir(), 'state.yaml'), '{{CREATED_AT}}');
  });

  it('state.yaml has slug in branch comment', () => {
    run(['new-feature', workspace]);
    assertFileContains(path.join(taskDir(), 'state.yaml'), 'feature/new-feature');
  });

  it('spec.md contains the correct task ID', () => {
    run(['new-feature', workspace]);
    assertFileContains(path.join(taskDir(), 'spec.md'), 'SF-001');
  });

  it('spec.md contains the correct slug', () => {
    run(['new-feature', workspace]);
    assertFileContains(path.join(taskDir(), 'spec.md'), 'new-feature');
  });

  it('no file contains unreplaced {{TASK_ID}} placeholder', () => {
    run(['new-feature', workspace]);
    const dir = taskDir();
    for (const f of [...fs.readdirSync(dir).filter(n => n.endsWith('.md')).map(n => path.join(dir, n)), path.join(dir, 'state.yaml')]) {
      assertFileNotContains(f, '{{TASK_ID}}');
    }
  });

  it('no file contains unreplaced {{TASK_SLUG}} placeholder', () => {
    run(['new-feature', workspace]);
    const dir = taskDir();
    for (const f of [...fs.readdirSync(dir).filter(n => n.endsWith('.md')).map(n => path.join(dir, n)), path.join(dir, 'state.yaml')]) {
      assertFileNotContains(f, '{{TASK_SLUG}}');
    }
  });
});

describe('manual slug generation', () => {
  it('uses the task prefix and a random suffix in generated manual slugs', () => {
    const r = run(['--manual', 'Add notifications', workspace]);
    assert.strictEqual(r.status, 0);
    assert.match(r.output, /Slug : sf-[a-z0-9]{6}addnotifications/);
  });

  it('sanitizes manual descriptions before generating the slug', () => {
    const r = run(['--manual', 'Add_notifications!!! now', workspace]);
    assert.strictEqual(r.status, 0);
    assert.match(r.output, /Slug : sf-[a-z0-9]{6}addnotificationsnow/);
  });

  it('writes the generated manual slug into state.yaml', () => {
    const r = run(['--manual', 'Add notifications', workspace]);
    assert.strictEqual(r.status, 0);

    const match = r.output.match(/Slug : (sf-[a-z0-9]{6}addnotifications)/);
    assert.ok(match, `Expected generated slug in output.\nActual output:\n${r.output}`);

    const taskDir = path.join(tasksDir(workspace), `SF-001-${match[1]}`);
    assertFileContains(path.join(taskDir, 'state.yaml'), `slug: "${match[1]}"`);
  });
});

// ---------------------------------------------------------------------------
// Auto-increment task ID
// ---------------------------------------------------------------------------

describe('auto-increment task ID', () => {
  it('second task gets ID SF-002', () => {
    run(['first-task', workspace]);
    const r = run(['second-task', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(path.join(tasksDir(workspace), 'SF-002-second-task'));
  });

  it('third task gets ID SF-003 when two already exist', () => {
    run(['task-one', workspace]);
    run(['task-two', workspace]);
    const r = run(['task-three', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(path.join(tasksDir(workspace), 'SF-003-task-three'));
  });

  it('auto-increment skips gaps (resumes after highest existing ID)', () => {
    fs.mkdirSync(path.join(tasksDir(workspace), 'SF-005-old-task'), { recursive: true });
    const r = run(['new-task', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(path.join(tasksDir(workspace), 'SF-006-new-task'));
  });

  it('task IDs are zero-padded to three digits', () => {
    const r = run(['pad-1', workspace]);
    assert.strictEqual(r.status, 0);
    assertDirExists(path.join(tasksDir(workspace), 'SF-001-pad-1'));
  });
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe('idempotency', () => {
  it('running twice for the same slug succeeds without error', () => {
    run(['my-task', workspace]);
    const r = run(['my-task', workspace]);
    assert.strictEqual(r.status, 0);
  });

  it('running twice does not create a second directory for the same slug', () => {
    run(['my-task', workspace]);
    run(['my-task', workspace]);
    const matches = fs.readdirSync(tasksDir(workspace)).filter(d => /^SF-\d+-my-task$/.test(d));
    assert.strictEqual(matches.length, 1);
  });

  it('running twice preserves original state.yaml content', () => {
    run(['my-task', workspace]);
    const stateFile = path.join(tasksDir(workspace), 'SF-001-my-task', 'state.yaml');
    fs.writeFileSync(stateFile, 'sentinel\n');
    run(['my-task', workspace]);
    assert.strictEqual(fs.readFileSync(stateFile, 'utf8'), 'sentinel\n');
  });

  it('running twice preserves existing spec.md content', () => {
    run(['my-task', workspace]);
    const specFile = path.join(tasksDir(workspace), 'SF-001-my-task', 'spec.md');
    fs.writeFileSync(specFile, 'custom spec content\n');
    run(['my-task', workspace]);
    assert.strictEqual(fs.readFileSync(specFile, 'utf8'), 'custom spec content\n');
  });

  it('second run does not bump the task ID for the same slug', () => {
    run(['my-task', workspace]);
    run(['my-task', workspace]);
    assertDirExists(path.join(tasksDir(workspace), 'SF-001-my-task'));
    assert.ok(!fs.existsSync(path.join(tasksDir(workspace), 'SF-002-my-task')));
  });

  it('second run reports idempotent mode in output', () => {
    run(['my-task', workspace]);
    const r = run(['my-task', workspace]);
    assert.strictEqual(r.status, 0);
    assert.match(r.output, /already exists/);
  });
});

// ---------------------------------------------------------------------------
// Output / reporting
// ---------------------------------------------------------------------------

describe('output and reporting', () => {
  it('success output includes task ID', () => {
    const r = run(['new-feature', workspace]);
    assert.strictEqual(r.status, 0);
    assert.match(r.output, /SF-001/);
  });

  it('success output includes the slug', () => {
    const r = run(['new-feature', workspace]);
    assert.strictEqual(r.status, 0);
    assert.match(r.output, /new-feature/);
  });

  it('success output includes the task directory path', () => {
    const r = run(['new-feature', workspace]);
    assert.strictEqual(r.status, 0);
    assert.match(r.output, /\.ai-workflow\/tasks/);
  });
});
