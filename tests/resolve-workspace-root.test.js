const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function mkTmpDir(prefix) {
  const created = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return fs.realpathSync(created);
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function runResolveWorkspaceRoot({ startDir, cwd }) {
  const scriptPath = path.resolve(__dirname, '..', 'scripts', 'resolve-workspace-root.js');
  const args = [scriptPath];
  if (startDir != null) args.push(startDir);

  const res = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
  });

  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

function parseJsonStdout(stdout) {
  return JSON.parse(stdout);
}

test('defaults to cwd when forge-service.yaml is absent', () => {
  const dir = mkTmpDir('spec-forge-wsroot-');
  const res = runResolveWorkspaceRoot({ cwd: dir });

  assert.equal(res.status, 0, res.stderr);
  const out = parseJsonStdout(res.stdout);
  assert.equal(out.start_dir, dir);
  assert.equal(out.workspace_root, dir);
  assert.equal(out.source, 'cwd');
  assert.equal(out.forge_service_path, null);
});

test('uses absolute workspace_root from forge-service.yaml', () => {
  const dir = mkTmpDir('spec-forge-wsroot-');
  const absRoot = mkTmpDir('spec-forge-absroot-');
  writeFile(
    path.join(dir, 'forge-service.yaml'),
    `service_name: "svc"\nworkspace_root: "${absRoot}"\nstack: "express"\n`
  );

  const res = runResolveWorkspaceRoot({ cwd: dir });
  assert.equal(res.status, 0, res.stderr);

  const out = parseJsonStdout(res.stdout);
  assert.equal(out.start_dir, dir);
  assert.equal(out.workspace_root, absRoot);
  assert.equal(out.source, 'forge-service.yaml');
  assert.equal(out.forge_service_path, path.join(dir, 'forge-service.yaml'));
});

test('resolves relative workspace_root from forge-service.yaml relative to start_dir', () => {
  const parent = mkTmpDir('spec-forge-parent-');
  const startDirCandidate = path.join(parent, 'service-a');
  fs.mkdirSync(startDirCandidate, { recursive: true });
  const startDir = fs.realpathSync(startDirCandidate);

  writeFile(
    path.join(startDir, 'forge-service.yaml'),
    `workspace_root: ".."\n`
  );

  const res = runResolveWorkspaceRoot({ cwd: startDir });
  assert.equal(res.status, 0, res.stderr);

  const out = parseJsonStdout(res.stdout);
  assert.equal(out.start_dir, startDir);
  assert.equal(out.workspace_root, parent);
  assert.equal(out.source, 'forge-service.yaml');
});

test('errors when forge-service.yaml exists but workspace_root is missing', () => {
  const dir = mkTmpDir('spec-forge-wsroot-');
  writeFile(path.join(dir, 'forge-service.yaml'), `service_name: "svc"\n`);

  const res = runResolveWorkspaceRoot({ cwd: dir });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /missing workspace_root/i);
});

test('errors when start_dir arg is not a directory', () => {
  const cwd = mkTmpDir('spec-forge-wsroot-');
  const missing = path.join(cwd, 'does-not-exist');

  const res = runResolveWorkspaceRoot({ cwd, startDir: missing });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /start_dir is not a directory/i);
});

