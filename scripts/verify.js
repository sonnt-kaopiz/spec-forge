#!/usr/bin/env node
// verify.js — Stack-agnostic verification pipeline (test → analyze → format).
//
// Usage (run from a service repo):
//   node verify.js [--all | --test-only | --analyze-only | --format-only]
//
// Behaviour:
//   - Reads forge-service.yaml in cwd to discover the service's stack profile.
//   - Reads the central forge.yaml from <workspace_root>/.ai-workflow/forge.yaml for stack profile defaults.
//   - Resolves test/analyze/format commands by overlaying any
//     forge-service.yaml > verification overrides on top of the stack profile.
//   - Runs each step in order. Stops on test or analyze failure. Format
//     auto-fixes and continues; the script reports which files were rewritten.
//   - Prints a structured JSON report on stdout. Exits 0 on overall pass,
//     1 on overall fail (or on a script-level error before the pipeline ran).
//
// The script never writes state.yaml. The verification skill consumes the
// JSON report and asks the orchestrating command to record the results.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseYaml } = require('./state-yaml');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
const VALID_FLAGS = new Set(['--all', '--test-only', '--analyze-only', '--format-only']);

function parseArgs(argv) {
  const flags = argv.slice(2).filter((a) => a.startsWith('--'));
  for (const f of flags) {
    if (!VALID_FLAGS.has(f)) {
      throw new Error(`Unknown flag: ${f}. Valid: ${[...VALID_FLAGS].join(', ')}`);
    }
  }
  if (flags.length === 0) return { test: true, analyze: true, format: true };
  if (flags.includes('--all')) return { test: true, analyze: true, format: true };
  return {
    test: flags.includes('--test-only'),
    analyze: flags.includes('--analyze-only'),
    format: flags.includes('--format-only'),
  };
}

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------
function readYamlFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseYaml(raw);
}

function loadForgeConfig(workspaceRoot) {
  const forgeYamlPath = path.join(workspaceRoot, '.ai-workflow', 'forge.yaml');
  const config = readYamlFile(forgeYamlPath);
  if (!config) throw new Error(`forge.yaml not found at: ${forgeYamlPath}`);
  return config;
}

function loadServiceConfig(cwd) {
  const serviceYamlPath = path.join(cwd, 'forge-service.yaml');
  const config = readYamlFile(serviceYamlPath);
  if (!config) {
    throw new Error(
      `forge-service.yaml not found in ${cwd}. Run verify.js from a service repo root.`
    );
  }
  return config;
}

// Build the resolved stack profile by layering forge-service.yaml overrides on
// top of the central stack profile. Service-local stacks (defined under a
// `stacks:` block in forge-service.yaml) take precedence over global ones.
function resolveStackProfile(forge, service) {
  const stackName = service.stack;
  if (!stackName) {
    throw new Error('forge-service.yaml is missing the required "stack" field');
  }

  const localProfile =
    service.stacks && typeof service.stacks === 'object' ? service.stacks[stackName] : null;
  const globalProfile =
    forge.stacks && typeof forge.stacks === 'object' ? forge.stacks[stackName] : null;
  const baseProfile = localProfile || globalProfile;

  if (!baseProfile) {
    const available = Object.keys((forge.stacks) || {}).join(', ') || '<none>';
    throw new Error(
      `Stack profile "${stackName}" not found. Available global profiles: ${available}`
    );
  }

  // Per-step shallow merge: command from override wins, otherwise fall back.
  const baseVerification = (baseProfile.verification && typeof baseProfile.verification === 'object') ? baseProfile.verification : {};
  const overrideVerification = (service.verification && typeof service.verification === 'object') ? service.verification : {};

  const merged = { stack: stackName, verification: {} };
  for (const step of ['test', 'analyze', 'format']) {
    const baseStep = (baseVerification[step] && typeof baseVerification[step] === 'object') ? baseVerification[step] : {};
    const overrideStep = (overrideVerification[step] && typeof overrideVerification[step] === 'object') ? overrideVerification[step] : {};
    merged.verification[step] = {
      command: overrideStep.command || baseStep.command || '',
    };
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------
function runCommand(commandLine, cwd) {
  const started = Date.now();
  // Use a shell so users can write pipelines, env vars, etc. in their config.
  const result = spawnSync(commandLine, {
    cwd,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    command: commandLine,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exit_code: typeof result.status === 'number' ? result.status : 1,
    signal: result.signal || null,
    duration_ms: Date.now() - started,
  };
}

function summarise(text, max = 200) {
  if (!text) return '';
  const trimmed = text.trim().split(/\r?\n/).filter(Boolean);
  if (trimmed.length === 0) return '';
  const last = trimmed[trimmed.length - 1];
  return last.length > max ? `${last.slice(0, max - 3)}...` : last;
}

// ---------------------------------------------------------------------------
// Format step — git-status diffing to detect auto-fixed files
// ---------------------------------------------------------------------------
function gitStatusSnapshot(cwd) {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' });
  if (r.status !== 0) return null; // not a git repo, or git missing
  const out = r.stdout || '';
  const map = new Map();
  for (const line of out.split('\n')) {
    if (!line) continue;
    // Porcelain format: "XY path" — first two chars are status flags.
    const status = line.slice(0, 2);
    const filePath = line.slice(3);
    map.set(filePath, status);
  }
  return map;
}

function diffFilesChanged(before, after) {
  if (!before || !after) return null;
  const changed = [];
  for (const [filePath, status] of after.entries()) {
    if (before.get(filePath) !== status) {
      changed.push(filePath);
    }
  }
  changed.sort();
  return changed;
}

// ---------------------------------------------------------------------------
// Pipeline runner
// ---------------------------------------------------------------------------
function buildSkippedStep() {
  return {
    ran: false,
    status: 'skipped',
    command: '',
    stdout: '',
    stderr: '',
    duration_ms: 0,
    summary: '',
  };
}

function runPipeline(scope, profile, cwd) {
  const report = {
    stack: profile.stack,
    cwd,
    steps: {
      test: buildSkippedStep(),
      analyze: buildSkippedStep(),
      format: buildSkippedStep(),
    },
    overall: 'pass',
    failed_step: null,
  };

  // Step 1 — Test
  if (scope.test) {
    const cmd = profile.verification.test.command;
    if (!cmd) {
      report.steps.test = {
        ran: false,
        status: 'fail',
        command: '',
        stdout: '',
        stderr: 'No test command configured for this stack profile.',
        duration_ms: 0,
        summary: 'No test command configured.',
      };
      report.overall = 'fail';
      report.failed_step = 'test';
      return report;
    }

    const r = runCommand(cmd, cwd);
    const passed = r.exit_code === 0;
    report.steps.test = {
      ran: true,
      status: passed ? 'pass' : 'fail',
      command: r.command,
      stdout: r.stdout,
      stderr: r.stderr,
      duration_ms: r.duration_ms,
      summary: summarise(passed ? r.stdout : (r.stderr || r.stdout)),
    };
    if (!passed) {
      report.overall = 'fail';
      report.failed_step = 'test';
      return report; // STOP on test failure
    }
  }

  // Step 2 — Analyze
  if (scope.analyze) {
    const cmd = profile.verification.analyze.command;
    if (!cmd) {
      report.steps.analyze = {
        ran: false,
        status: 'fail',
        command: '',
        stdout: '',
        stderr: 'No analyze command configured for this stack profile.',
        duration_ms: 0,
        summary: 'No analyze command configured.',
      };
      report.overall = 'fail';
      report.failed_step = 'analyze';
      return report;
    }

    const r = runCommand(cmd, cwd);
    const passed = r.exit_code === 0;
    report.steps.analyze = {
      ran: true,
      status: passed ? 'pass' : 'fail',
      command: r.command,
      stdout: r.stdout,
      stderr: r.stderr,
      duration_ms: r.duration_ms,
      summary: summarise(passed ? r.stdout : (r.stderr || r.stdout)),
    };
    if (!passed) {
      report.overall = 'fail';
      report.failed_step = 'analyze';
      return report; // STOP on analyze failure
    }
  }

  // Step 3 — Format (auto-fix; never blocks)
  if (scope.format) {
    const cmd = profile.verification.format.command;
    if (!cmd) {
      report.steps.format = {
        ran: false,
        status: 'skipped',
        command: '',
        stdout: '',
        stderr: 'No format command configured — skipping.',
        duration_ms: 0,
        summary: 'No format command configured.',
        files_changed: [],
      };
    } else {
      const before = gitStatusSnapshot(cwd);
      const r = runCommand(cmd, cwd);
      const after = gitStatusSnapshot(cwd);
      const changed = diffFilesChanged(before, after);
      const filesChanged = Array.isArray(changed) ? changed : [];
      const status = filesChanged.length > 0 ? 'fixed' : 'pass';
      report.steps.format = {
        ran: true,
        status,
        command: r.command,
        stdout: r.stdout,
        stderr: r.stderr,
        duration_ms: r.duration_ms,
        files_changed: filesChanged,
        summary:
          filesChanged.length > 0
            ? `Auto-fixed ${filesChanged.length} file(s).`
            : summarise(r.stdout || 'No formatting changes.'),
      };
      // Format never sets failed_step. It also never flips overall to fail.
    }
  }

  return report;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
function main() {
  let scope;
  try {
    scope = parseArgs(process.argv);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }

  const cwd = process.cwd();
  let report;
  try {
    const service = loadServiceConfig(cwd);
    const workspaceRoot = service.workspace_root ? path.resolve(service.workspace_root) : cwd;
    const forge = loadForgeConfig(workspaceRoot);
    const profile = resolveStackProfile(forge, service);
    report = runPipeline(scope, profile, cwd);
  } catch (err) {
    const errorReport = {
      stack: null,
      cwd,
      steps: {
        test: buildSkippedStep(),
        analyze: buildSkippedStep(),
        format: buildSkippedStep(),
      },
      overall: 'fail',
      failed_step: null,
      error: err && err.message ? err.message : String(err),
    };
    process.stdout.write(JSON.stringify(errorReport, null, 2));
    process.stdout.write('\n');
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(report, null, 2));
  process.stdout.write('\n');
  process.exit(report.overall === 'pass' ? 0 : 1);
}

main();
