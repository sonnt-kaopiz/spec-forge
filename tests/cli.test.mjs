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

      const specForgeDir = path.join(tmp, '.claude', '.spec-forge');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'VERSION')), 'VERSION file missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'forge.yaml')), 'forge.yaml missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'scripts')), 'scripts/ missing');
      assert.ok(fs.existsSync(path.join(specForgeDir, 'templates')), 'templates/ missing');

      // skills and agents must NOT be inside .spec-forge
      assert.ok(!fs.existsSync(path.join(specForgeDir, 'skills')), 'skills/ should not be in .spec-forge');
      assert.ok(!fs.existsSync(path.join(specForgeDir, 'agents')), 'agents/ should not be in .spec-forge');
      assert.ok(!fs.existsSync(path.join(specForgeDir, 'commands')), 'commands/ should not be in .spec-forge');

      assert.ok(fs.existsSync(path.join(tmp, '.claude', 'commands', 'forge')), '.claude/commands/forge/ missing');
      assert.ok(fs.existsSync(path.join(tmp, '.claude', 'skills')), '.claude/skills/ missing');
      assert.ok(fs.existsSync(path.join(tmp, '.claude', 'agents')), '.claude/agents/ missing');

      const installed = fs.readFileSync(path.join(specForgeDir, 'VERSION'), 'utf8').trim();
      assert.equal(installed, PKG.version);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('install copies all 10 forge command files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });
      const commands = fs.readdirSync(path.join(tmp, '.claude', 'commands', 'forge'));
      assert.ok(commands.length >= 10, `Expected ≥10 command files, got ${commands.length}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('commands reference .claude/.spec-forge paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });
      const forgeDir = path.join(tmp, '.claude', 'commands', 'forge');
      for (const f of fs.readdirSync(forgeDir)) {
        const content = fs.readFileSync(path.join(forgeDir, f), 'utf8');
        if (content.includes('scripts/')) {
          assert.ok(
            content.includes('.claude/.spec-forge'),
            `${f} does not reference .claude/.spec-forge`
          );
        }
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('skills reference .claude/.spec-forge paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
    try {
      execSync(`node "${CLI}" install`, { cwd: tmp });
      const skillsDir = path.join(tmp, '.claude', 'skills');
      const walkAndCheck = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkAndCheck(full);
          } else {
            const content = fs.readFileSync(full, 'utf8');
            assert.ok(
              !content.includes('<plugin_root>'),
              `${entry.name} still contains unresolved <plugin_root>`
            );
          }
        }
      };
      walkAndCheck(skillsDir);
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
      const versionFile = path.join(tmp, '.claude', '.spec-forge', 'VERSION');
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
      const forgeYaml = path.join(tmp, '.claude', '.spec-forge', 'forge.yaml');
      fs.rmSync(forgeYaml);
      assert.ok(!fs.existsSync(forgeYaml), 'forge.yaml should be gone');
      execSync(`node "${CLI}" install --force`, { cwd: tmp });
      assert.ok(fs.existsSync(forgeYaml), 'forge.yaml should be restored by --force');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
