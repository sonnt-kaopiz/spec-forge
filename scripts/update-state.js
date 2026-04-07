#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { isoNowNoMillis, parseYaml, dumpYaml, setByDotPath, appendByDotPath } = require('./state-yaml');

function usage() {
  const cmd = path.basename(process.argv[1]);
  process.stderr.write(`Usage:\n`);
  process.stderr.write(`  node ${cmd} <task-slug-or-path> <field.path|field.path[]> <value>\n`);
  process.stderr.write(`  node ${cmd} <task-slug-or-path> <field.path|field.path[]> <value> [workspace_root]\n`);
  process.stderr.write(`\n`);
  process.stderr.write(`Examples:\n`);
  process.stderr.write(`  node ${cmd} SF-001-my-task status phase-execution\n`);
  process.stderr.write(`  node ${cmd} my-task phases.0.status in-progress\n`);
  process.stderr.write(`  node ${cmd} my-task services[] '{"name":"api","status":"pending"}'\n`);
}

function resolveStatePath(taskArg, workspaceRoot) {
  const abs = path.isAbsolute(taskArg) ? taskArg : path.resolve(process.cwd(), taskArg);
  if (fs.existsSync(abs)) {
    const st = fs.statSync(abs);
    if (st.isFile() && abs.endsWith('state.yaml')) return abs;
    if (st.isDirectory()) return path.join(abs, 'state.yaml');
  }

  const tasksDir = path.join(workspaceRoot, '.ai-workflow', 'tasks');
  if (!fs.existsSync(tasksDir)) throw new Error(`tasks directory not found: ${tasksDir}`);

  const direct = path.join(tasksDir, taskArg, 'state.yaml');
  if (fs.existsSync(direct)) return direct;

  const matches = fs.readdirSync(tasksDir).filter((d) => {
    const full = path.join(tasksDir, d);
    if (!fs.statSync(full).isDirectory()) return false;
    return new RegExp(`^SF-\\d+-${taskArg}$`).test(d);
  });
  if (matches.length === 0) throw new Error(`no task directory found for slug: ${taskArg}`);
  if (matches.length > 1) {
    matches.sort((a, b) => {
      const na = Number.parseInt(a.match(/^SF-(\d+)/)[1], 10);
      const nb = Number.parseInt(b.match(/^SF-(\d+)/)[1], 10);
      return nb - na;
    });
  }
  return path.join(tasksDir, matches[0], 'state.yaml');
}

function parseCliValue(raw) {
  const s = String(raw);
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number.parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return Number.parseFloat(s);
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']')) || (s.startsWith('"') && s.endsWith('"'))) {
    try {
      return JSON.parse(s);
    } catch {
      // fall through: treat as string
    }
  }
  return s;
}

function atomicWriteFileSync(targetPath, content) {
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath);
  const tmpPath = path.join(dir, `${base}.tmp`);

  const fd = fs.openSync(tmpPath, 'w', 0o600);
  try {
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  fs.renameSync(tmpPath, targetPath);
}

try {
  const taskArg = process.argv[2] || '';
  const fieldPathRaw = process.argv[3] || '';
  const valueRaw = process.argv[4];
  const workspaceRoot = process.argv[5] || process.cwd();

  if (!taskArg || !fieldPathRaw || typeof valueRaw === 'undefined') {
    usage();
    process.exit(1);
  }

  const statePath = resolveStatePath(taskArg, workspaceRoot);
  if (!fs.existsSync(statePath)) throw new Error(`state.yaml not found: ${statePath}`);

  const yaml = fs.readFileSync(statePath, 'utf8');
  const state = parseYaml(yaml);

  const prevUpdatedAt = state && state.task && typeof state.task === 'object' ? state.task.updated_at : null;
  let now = isoNowNoMillis();
  if (prevUpdatedAt && prevUpdatedAt === now) {
    now = new Date(Date.now() + 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  const isAppend = fieldPathRaw.endsWith('[]');
  const fieldPath = isAppend ? fieldPathRaw.slice(0, -2) : fieldPathRaw;
  const newValue = parseCliValue(valueRaw);

  if (isAppend) {
    appendByDotPath(state, fieldPath, newValue);
  } else {
    setByDotPath(state, fieldPath, newValue);
  }

  // Always bump updated_at.
  if (!state.task || typeof state.task !== 'object') state.task = {};
  state.task.updated_at = now;

  const out = dumpYaml(state);
  atomicWriteFileSync(statePath, out);

  process.stdout.write('ok\n');
} catch (err) {
  process.stderr.write(`Error: ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
}

