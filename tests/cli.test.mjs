import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', 'bin', 'cli.js');
const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

describe('spec-forge CLI', () => {
  it('version prints package version', () => {
    const out = execSync(`node "${CLI}" version`).toString().trim();
    assert.equal(out, PKG.version);
  });

  it('install creates expected dirs and files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });

      const specForgeDir = path.join(tmp, '.cursor', '.spec-forge');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'VERSION')), 'VERSION file missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'forge.yaml')), 'forge.yaml missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'skills')), 'skills/ missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'agents')), 'agents/ missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'scripts')), 'scripts/ missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'templates')), 'templates/ missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'commands', 'forge')), 'commands/forge/ missing');

      const cursorCommands = path.join(tmp, '.cursor', 'commands', 'forge');
      assert.ok(fs.existsSync(cursorCommands), '.cursor/commands/forge/ missing');

      const installed = fs.readFileSync(path.join(specForgeDir, 'VERSION'), 'utf8').trim();
      assert.equal(installed, PKG.version);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('install copies all 10 Cursor command wrappers', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });
      const wrappers = fs.readdirSync(path.join(tmp, '.cursor', 'commands', 'forge'));
      assert.ok(wrappers.length >= 10, `Expected ≥10 wrapper files, got ${wrappers.length}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('cursor wrappers reference .cursor/.spec-forge paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });
      const forgeDir = path.join(tmp, '.cursor', 'commands', 'forge');
      for (const w of fs.readdirSync(forgeDir)) {
        const content = fs.readFileSync(path.join(forgeDir, w), 'utf8');
        assert.ok(
          content.includes('.cursor/.spec-forge'),
          `${w} does not reference .cursor/.spec-forge`
        );
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('install is idempotent — skips when same version is present', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });
      const out = execSync(`node "${CLI}" install`, { cwd: tmp }).toString();
      assert.ok(out.includes('already installed'), 'Expected "already installed" message');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('update refreshes files when VERSION is stale', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });
      const versionFile = path.join(tmp, '.cursor', '.spec-forge', 'VERSION');
      fs.writeFileSync(versionFile, '0.0.1\n');
      execSync(`node "${CLI}" update`, { cwd: tmp });
      const updated = fs.readFileSync(versionFile, 'utf8').trim();
      assert.equal(updated, PKG.version);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('--force reinstalls even when same version', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });
      // Delete a file to simulate corruption
      const forgeYaml = path.join(tmp, '.cursor', '.spec-forge', 'forge.yaml');
      fs.rmSync(forgeYaml);
      assert.ok(!fs.existsSync(forgeYaml), 'forge.yaml should be gone');
      execSync(`node "${CLI}" install --force`, { cwd: tmp });
      assert.ok(fs.existsSync(forgeYaml), 'forge.yaml should be restored by --force');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
