#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseYaml } = require('./state-yaml');

function usage() {
  const cmd = path.basename(process.argv[1]);
  process.stderr.write(`Usage: node ${cmd} <task-slug-or-path> [workspace_root]\n`);
}

function resolveStatePath(taskArg, workspaceRoot) {
  if (!taskArg) throw new Error('task slug or path is required');

  const abs = path.isAbsolute(taskArg) ? taskArg : path.resolve(process.cwd(), taskArg);
  if (fs.existsSync(abs)) {
    const st = fs.statSync(abs);
    if (st.isFile() && abs.endsWith('state.yaml')) return abs;
    if (st.isDirectory()) return path.join(abs, 'state.yaml');
  }

  const tasksDir = path.join(workspaceRoot, '.ai-workflow', 'tasks');
  const slug = taskArg;
  if (!fs.existsSync(tasksDir)) throw new Error(`tasks directory not found: ${tasksDir}`);

  // Prefer exact directory name match first (caller may pass "SF-001-slug")
  const direct = path.join(tasksDir, slug, 'state.yaml');
  if (fs.existsSync(direct)) return direct;

  const matches = fs.readdirSync(tasksDir).filter((d) => {
    const full = path.join(tasksDir, d);
    if (!fs.statSync(full).isDirectory()) return false;
    return new RegExp(`^SF-\\d+-${slug}$`).test(d);
  });
  if (matches.length === 0) throw new Error(`no task directory found for slug: ${slug}`);
  if (matches.length > 1) {
    // Choose the highest numeric ID deterministically.
    matches.sort((a, b) => {
      const na = Number.parseInt(a.match(/^SF-(\d+)/)[1], 10);
      const nb = Number.parseInt(b.match(/^SF-(\d+)/)[1], 10);
      return nb - na;
    });
  }
  return path.join(tasksDir, matches[0], 'state.yaml');
}

try {
  const taskArg = process.argv[2] || '';
  const workspaceRoot = process.argv[3] || process.cwd();
  if (!taskArg) {
    usage();
    process.exit(1);
  }

  const statePath = resolveStatePath(taskArg, workspaceRoot);
  if (!fs.existsSync(statePath)) throw new Error(`state.yaml not found: ${statePath}`);

  const stateRaw = fs.readFileSync(statePath, 'utf8');
  const state = parseYaml(stateRaw);

  process.stdout.write(JSON.stringify(state, null, 2));
  process.stdout.write('\n');
} catch (err) {
  process.stderr.write(`Error: ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
}

