'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { setupWorkspace, teardownWorkspace } = require('./helpers/common');

const VERIFY_SCRIPT = path.resolve(__dirname, '..', 'scripts', 'verify.js');

// ---------------------------------------------------------------------------
// Helper: run verify.js from a given service directory
// ---------------------------------------------------------------------------
function run(flags = [], serviceDir) {
  const r = spawnSync('node', [VERIFY_SCRIPT, ...flags], {
    cwd: serviceDir,
    encoding: 'utf8',
  });
  return {
    status: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    output: (r.stdout || '') + (r.stderr || ''),
  };
}

function parseReport(r) {
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error(
      `Could not parse JSON report.\nStatus: ${r.status}\nStdout: ${r.stdout}\nStderr: ${r.stderr}`
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: write forge-service.yaml using a local stack override so tests do
// not rely on external tooling installed on the host machine.
// ---------------------------------------------------------------------------
function writeServiceConfig(dir, testCmd, analyzeCmd, formatCmd) {
  const testCommand = testCmd === undefined ? 'true' : testCmd;
  const analyzeCommand = analyzeCmd === undefined ? 'true' : analyzeCmd;
  const formatCommand = formatCmd === undefined ? 'true' : formatCmd;

  // Use a service-local stack override so forge.yaml is not modified.
  const yaml = [
    'stack: test-stack',
    'stacks:',
    '  test-stack:',
    '    language: javascript',
    '    framework: test',
    '    version: 1',
    '    manifest: package.json',
    '    paths:',
    '      models: src/models',
    '      services: src/services',
    '      controllers: src/controllers',
    '      migrations: db',
    '      tests_unit: test/unit',
    '      tests_feature: test/integration',
    '    verification:',
    `      test:`,
    `        command: "${testCommand}"`,
    `      analyze:`,
    `        command: "${analyzeCommand}"`,
    `      format:`,
    `        command: "${formatCommand}"`,
  ].join('\n');

  fs.writeFileSync(path.join(dir, 'forge-service.yaml'), yaml, 'utf8');
}

let workspace;

beforeEach(() => { workspace = setupWorkspace(); });
afterEach(() => { teardownWorkspace(workspace); });

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

describe('argument parsing', () => {
  it('rejects unknown flags with exit code 1 and error message', () => {
    writeServiceConfig(workspace);
    const r = run(['--bad-flag'], workspace);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /Unknown flag/);
  });

  it('accepts --all flag without error', () => {
    writeServiceConfig(workspace);
    const r = run(['--all'], workspace);
    // Status may be 0 or 1 depending on the commands, but should not crash
    const report = parseReport(r);
    assert.ok(report.steps.test.ran || report.steps.test.status === 'skipped');
  });

  it('accepts --test-only flag', () => {
    writeServiceConfig(workspace);
    const r = run(['--test-only'], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.test.ran, true);
    assert.strictEqual(report.steps.analyze.status, 'skipped');
    assert.strictEqual(report.steps.format.status, 'skipped');
  });

  it('accepts --analyze-only flag', () => {
    writeServiceConfig(workspace);
    const r = run(['--analyze-only'], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.test.status, 'skipped');
    assert.strictEqual(report.steps.analyze.ran, true);
    assert.strictEqual(report.steps.format.status, 'skipped');
  });

  it('accepts --format-only flag', () => {
    writeServiceConfig(workspace);
    const r = run(['--format-only'], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.test.status, 'skipped');
    assert.strictEqual(report.steps.analyze.status, 'skipped');
    assert.strictEqual(report.steps.format.ran, true);
  });

  it('default (no flags) runs all three steps', () => {
    writeServiceConfig(workspace);
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.test.ran, true);
    assert.strictEqual(report.steps.analyze.ran, true);
    assert.strictEqual(report.steps.format.ran, true);
  });
});

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

describe('config loading', () => {
  it('fails with exit 1 when forge-service.yaml is missing', () => {
    // workspace has no forge-service.yaml
    const r = run([], workspace);
    assert.strictEqual(r.status, 1);
    const report = parseReport(r);
    assert.ok(report.error);
    assert.match(report.error, /forge-service\.yaml not found/);
  });

  it('fails when the referenced stack profile does not exist', () => {
    const yaml = 'stack: nonexistent-stack\n';
    fs.writeFileSync(path.join(workspace, 'forge-service.yaml'), yaml, 'utf8');
    const r = run([], workspace);
    assert.strictEqual(r.status, 1);
    const report = parseReport(r);
    assert.ok(report.error);
    assert.match(report.error, /Stack profile.*not found/);
  });

  it('uses service-local stacks block over global forge.yaml profile', () => {
    // Provide a local stack that overrides any global profile with the same name.
    writeServiceConfig(workspace, 'true', 'true', 'true');
    const r = run([], workspace);
    assert.strictEqual(r.status, 0);
    const report = parseReport(r);
    assert.strictEqual(report.stack, 'test-stack');
  });
});

// ---------------------------------------------------------------------------
// Pipeline — all steps pass
// ---------------------------------------------------------------------------

describe('all steps pass', () => {
  it('exits 0 when all steps succeed', () => {
    writeServiceConfig(workspace, 'true', 'true', 'true');
    const r = run([], workspace);
    assert.strictEqual(r.status, 0);
  });

  it('overall field is "pass"', () => {
    writeServiceConfig(workspace, 'true', 'true', 'true');
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.overall, 'pass');
  });

  it('failed_step is null when all steps pass', () => {
    writeServiceConfig(workspace, 'true', 'true', 'true');
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.failed_step, null);
  });

  it('each step has status "pass"', () => {
    writeServiceConfig(workspace, 'true', 'true', 'true');
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.test.status, 'pass');
    assert.strictEqual(report.steps.analyze.status, 'pass');
    // format is 'pass' or 'fixed'
    assert.ok(['pass', 'fixed'].includes(report.steps.format.status));
  });
});

// ---------------------------------------------------------------------------
// Pipeline — test step failure
// ---------------------------------------------------------------------------

describe('test step failure', () => {
  it('exits 1 when test step fails', () => {
    writeServiceConfig(workspace, 'false', 'true', 'true');
    const r = run([], workspace);
    assert.strictEqual(r.status, 1);
  });

  it('overall is "fail" when test fails', () => {
    writeServiceConfig(workspace, 'false', 'true', 'true');
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.overall, 'fail');
  });

  it('failed_step is "test" when test fails', () => {
    writeServiceConfig(workspace, 'false', 'true', 'true');
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.failed_step, 'test');
  });

  it('stops after test — analyze and format are skipped', () => {
    writeServiceConfig(workspace, 'false', 'true', 'true');
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.test.status, 'fail');
    assert.strictEqual(report.steps.analyze.status, 'skipped');
    assert.strictEqual(report.steps.format.status, 'skipped');
  });
});

// ---------------------------------------------------------------------------
// Pipeline — analyze step failure
// ---------------------------------------------------------------------------

describe('analyze step failure', () => {
  it('exits 1 when analyze step fails', () => {
    writeServiceConfig(workspace, 'true', 'false', 'true');
    const r = run([], workspace);
    assert.strictEqual(r.status, 1);
  });

  it('failed_step is "analyze" when analyze fails', () => {
    writeServiceConfig(workspace, 'true', 'false', 'true');
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.failed_step, 'analyze');
  });

  it('test ran but format is skipped when analyze fails', () => {
    writeServiceConfig(workspace, 'true', 'false', 'true');
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.test.status, 'pass');
    assert.strictEqual(report.steps.analyze.status, 'fail');
    assert.strictEqual(report.steps.format.status, 'skipped');
  });
});

// ---------------------------------------------------------------------------
// Format step — does not block pipeline
// ---------------------------------------------------------------------------

describe('format step', () => {
  it('overall remains "pass" even when format command exits non-zero', () => {
    // Format failure is tolerated — it auto-fixes and continues.
    writeServiceConfig(workspace, 'true', 'true', 'false');
    const r = run([], workspace);
    // format failing still sets overall to pass (format doesn't set failed_step)
    const report = parseReport(r);
    assert.strictEqual(report.overall, 'pass');
    assert.strictEqual(report.failed_step, null);
  });

  it('format step has ran: true when format-only flag is used', () => {
    writeServiceConfig(workspace, 'true', 'true', 'true');
    const r = run(['--format-only'], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.format.ran, true);
  });

  it('format step reports files_changed as an array', () => {
    writeServiceConfig(workspace, 'true', 'true', 'true');
    const r = run(['--format-only'], workspace);
    const report = parseReport(r);
    assert.ok(Array.isArray(report.steps.format.files_changed));
  });
});

// ---------------------------------------------------------------------------
// Report structure
// ---------------------------------------------------------------------------

describe('JSON report structure', () => {
  it('report contains stack field matching the service config', () => {
    writeServiceConfig(workspace);
    const r = run([], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.stack, 'test-stack');
  });

  it('report contains cwd field', () => {
    writeServiceConfig(workspace);
    const r = run([], workspace);
    const report = parseReport(r);
    assert.ok(typeof report.cwd === 'string');
  });

  it('report contains steps with test, analyze, and format', () => {
    writeServiceConfig(workspace);
    const r = run([], workspace);
    const report = parseReport(r);
    assert.ok('test' in report.steps);
    assert.ok('analyze' in report.steps);
    assert.ok('format' in report.steps);
  });

  it('each step has ran, status, command, stdout, stderr, duration_ms', () => {
    writeServiceConfig(workspace);
    const r = run([], workspace);
    const report = parseReport(r);
    for (const step of ['test', 'analyze', 'format']) {
      const s = report.steps[step];
      assert.ok('ran' in s, `${step} missing 'ran'`);
      assert.ok('status' in s, `${step} missing 'status'`);
      assert.ok('command' in s, `${step} missing 'command'`);
      assert.ok('stdout' in s, `${step} missing 'stdout'`);
      assert.ok('stderr' in s, `${step} missing 'stderr'`);
      assert.ok('duration_ms' in s, `${step} missing 'duration_ms'`);
    }
  });

  it('stdout is valid JSON (not empty)', () => {
    writeServiceConfig(workspace);
    const r = run([], workspace);
    assert.ok(r.stdout.trim().startsWith('{'));
    // Should not throw
    JSON.parse(r.stdout);
  });

  it('error report is valid JSON when config fails', () => {
    const r = run([], workspace); // no forge-service.yaml
    assert.strictEqual(r.status, 1);
    const report = parseReport(r);
    assert.ok(report.error);
    assert.strictEqual(report.overall, 'fail');
  });
});

// ---------------------------------------------------------------------------
// Verification overrides in forge-service.yaml
// ---------------------------------------------------------------------------

describe('verification command overrides', () => {
  it('service-level verification override takes precedence over stack profile', () => {
    // Stack profile uses 'false' for test, but service override uses 'true'.
    const yaml = [
      'stack: test-stack',
      'stacks:',
      '  test-stack:',
      '    language: javascript',
      '    framework: test',
      '    version: 1',
      '    manifest: package.json',
      '    paths:',
      '      models: src',
      '      services: src',
      '      controllers: src',
      '      migrations: db',
      '      tests_unit: test',
      '      tests_feature: test',
      '    verification:',
      '      test:',
      '        command: "false"',
      '      analyze:',
      '        command: "true"',
      '      format:',
      '        command: "true"',
      'verification:',
      '  test:',
      '    command: "true"',
    ].join('\n');
    fs.writeFileSync(path.join(workspace, 'forge-service.yaml'), yaml, 'utf8');

    const r = run(['--test-only'], workspace);
    const report = parseReport(r);
    assert.strictEqual(report.steps.test.status, 'pass');
  });
});
