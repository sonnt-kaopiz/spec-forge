#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseYaml } = require('./state-yaml');

function usage() {
  const cmd = path.basename(process.argv[1]);
  process.stderr.write(`Usage: node ${cmd} [start_dir]\n`);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function resolveWorkspaceRootFromForgeService(startDirAbs) {
  const forgeServicePath = path.join(startDirAbs, 'forge-service.yaml');
  if (!fs.existsSync(forgeServicePath)) return null;

  const raw = fs.readFileSync(forgeServicePath, 'utf8');
  const parsed = parseYaml(raw);
  const candidate = parsed ? parsed.workspace_root : undefined;
  if (!isNonEmptyString(candidate)) {
    throw new Error(`forge-service.yaml missing workspace_root: ${forgeServicePath}`);
  }

  const workspaceRoot = path.isAbsolute(candidate)
    ? candidate
    : path.resolve(startDirAbs, candidate);

  return {
    workspace_root: workspaceRoot,
    source: 'forge-service.yaml',
    forge_service_path: forgeServicePath,
  };
}

try {
  const startDirArg = process.argv[2] || process.cwd();
  if (startDirArg === '--help' || startDirArg === '-h') {
    usage();
    process.exit(0);
  }

  const startDirAbs = path.resolve(process.cwd(), startDirArg);
  if (!fs.existsSync(startDirAbs) || !fs.statSync(startDirAbs).isDirectory()) {
    throw new Error(`start_dir is not a directory: ${startDirAbs}`);
  }

  const fromForgeService = resolveWorkspaceRootFromForgeService(startDirAbs);
  const result = fromForgeService || {
    workspace_root: startDirAbs,
    source: 'cwd',
    forge_service_path: null,
  };

  process.stdout.write(JSON.stringify({ start_dir: startDirAbs, ...result }, null, 2));
  process.stdout.write('\n');
} catch (err) {
  process.stderr.write(`Error: ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
}

