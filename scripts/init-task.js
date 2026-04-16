#!/usr/bin/env node
// init-task.js — Initialize a new task directory under <workspace_root>/.ai-workflow/tasks/
//
// Usage:
//   node init-task.js <task-slug> [start_dir]
//   node init-task.js --manual "<short-description>" [start_dir]
//
// Arguments:
//   task-slug           Short kebab-case label (e.g. "add-user-notifications")
//   --manual <desc>     Generate a slug as <task_prefix>-<random6><desc>
//   start_dir           Directory used to resolve workspace root. Defaults to process.cwd().
//
// Behaviour:
//   - Idempotent: safe to run multiple times; never overwrites existing files
//   - Creates all required subdirectories and populates files from templates
//
// Output:
//   stdout — single JSON object: { task_dir, task_id, task_slug, idempotent }
//   stderr — diagnostic/progress messages

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseYaml } = require('./state-yaml');

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function printUsage() {
  const cmd = path.basename(process.argv[1]);
  process.stderr.write(`Usage: node ${cmd} <task-slug> [start_dir]\n`);
  process.stderr.write(`   or: node ${cmd} --manual "<short-description>" [start_dir]\n`);
}

function sanitizeDescription(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function randomString(length) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

let slug = '';
let manualDescription = '';
let startDir = process.cwd();

if (args[0] === '--manual') {
  manualDescription = args[1] || '';
  startDir = args[2] || process.cwd();
} else {
  slug = args[0] || '';
  startDir = args[1] || process.cwd();
}

function resolveWorkspaceRoot(startDirArg) {
  const startDirAbs = path.resolve(process.cwd(), startDirArg || process.cwd());
  const resolverPath = path.join(__dirname, 'resolve-workspace-root.js');

  const stdout = execFileSync(process.execPath, [resolverPath, startDirAbs], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (err) {
    throw new Error(`Failed to parse resolve-workspace-root output as JSON: ${String(err && err.message ? err.message : err)}`);
  }

  if (!parsed || typeof parsed.workspace_root !== 'string' || parsed.workspace_root.trim().length === 0) {
    throw new Error('resolve-workspace-root did not return workspace_root');
  }

  return parsed.workspace_root;
}

const workspaceRoot = resolveWorkspaceRoot(startDir);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const tasksDir = path.join(workspaceRoot, '.ai-workflow', 'tasks');
const forgeDir = path.resolve(__dirname, '..');
const templatesDir = path.join(forgeDir, 'templates');

// ---------------------------------------------------------------------------
// Task prefix — read from <workspaceRoot>/.ai-workflow/forge.yaml; fall back to 'SF'
// ---------------------------------------------------------------------------
function getTaskPrefix() {
  try {
    const forgeYamlPath = path.join(workspaceRoot, '.ai-workflow', 'forge.yaml');
    const raw = fs.readFileSync(forgeYamlPath, 'utf8');
    const config = parseYaml(raw);
    return (config && config.task_prefix) ? String(config.task_prefix) : 'SF';
  } catch {
    return 'SF';
  }
}

const prefix = getTaskPrefix();

if (args[0] === '--manual') {
  const shortDescription = sanitizeDescription(manualDescription);
  if (!shortDescription) {
    process.stderr.write('Error: manual slug generation requires a short description.\n');
    printUsage();
    process.exit(1);
  }

  slug = `${String(prefix).toLowerCase()}-${randomString(6)}${shortDescription}`;
}

if (!slug) {
  process.stderr.write('Error: task-slug is required.\n');
  printUsage();
  process.exit(1);
}

// Validate slug — letters before hyphen, lowercase letters/digits after hyphen
if (!/^[a-zA-Z]+-[a-z0-9]+$/.test(slug)) {
  process.stderr.write('Error: task-slug must match <letters>-<lowercase letters or digits> (e.g. task-123).\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Guard: if a directory for this slug already exists, reuse it
// ---------------------------------------------------------------------------
let taskDir;
let taskId;
let isIdempotent = false;

if (fs.existsSync(tasksDir)) {
  const existing = fs.readdirSync(tasksDir).find((entry) => {
    const full = path.join(tasksDir, entry);
    return fs.statSync(full).isDirectory() && entry === slug;
  });

  if (existing) {
    taskDir = path.join(tasksDir, existing);
    taskId = slug;
    isIdempotent = true;
    process.stderr.write(`Task directory already exists: ${taskDir}\n`);
    process.stderr.write('Ensuring all files and subdirectories are present (idempotent mode).\n');
  }
}

if (!taskDir) {
  taskId = slug;
  taskDir = path.join(tasksDir, slug);
}

const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// ---------------------------------------------------------------------------
// Create directory structure
// ---------------------------------------------------------------------------
for (const sub of ['services', 'phases', 'logs']) {
  fs.mkdirSync(path.join(taskDir, sub), { recursive: true });
}

process.stderr.write(`Task directory: ${taskDir}\n`);

// ---------------------------------------------------------------------------
// Helper: copy a template file if the destination does not already exist.
// Substitutes: {{TASK_ID}}, {{TASK_SLUG}}, {{TASK_TITLE}}, {{CREATED_AT}},
//              {{CREATED_DATE}} (date-only portion of CREATED_AT)
// ---------------------------------------------------------------------------
function installTemplate(templateFile, destFile) {
  if (fs.existsSync(destFile)) {
    process.stderr.write(`  [skip]   ${destFile} (already exists)\n`);
    return;
  }

  if (!fs.existsSync(templateFile)) {
    process.stderr.write(`  [warn]   Template not found: ${templateFile} — creating empty file\n`);
    fs.writeFileSync(destFile, '');
    return;
  }

  const dateOnly = now.slice(0, 10);
  const content = fs.readFileSync(templateFile, 'utf8')
    .replaceAll('{{TASK_ID}}', taskId)
    .replaceAll('{{TASK_SLUG}}', slug)
    .replaceAll('{{TASK_TITLE}}', slug)
    .replaceAll('{{CREATED_AT}}', now)
    .replaceAll('{{CREATED_DATE}}', dateOnly);

  fs.writeFileSync(destFile, content);
  process.stderr.write(`  [create] ${destFile}\n`);
}

// ---------------------------------------------------------------------------
// Install all templates (markdown docs + state.yaml)
// ---------------------------------------------------------------------------
installTemplate(path.join(templatesDir, 'spec.md'),               path.join(taskDir, 'spec.md'));
installTemplate(path.join(templatesDir, 'research.md'),           path.join(taskDir, 'research.md'));
installTemplate(path.join(templatesDir, 'external-research.md'),  path.join(taskDir, 'external-research.md'));
installTemplate(path.join(templatesDir, 'architecture.md'),       path.join(taskDir, 'architecture.md'));
installTemplate(path.join(templatesDir, 'plan.md'),               path.join(taskDir, 'plan.md'));
installTemplate(path.join(templatesDir, 'state.yaml'),            path.join(taskDir, 'state.yaml'));

// ---------------------------------------------------------------------------
// Done — emit JSON result to stdout
// ---------------------------------------------------------------------------
process.stderr.write('\nTask initialised successfully.\n');
process.stdout.write(JSON.stringify({ task_dir: taskDir, task_id: taskId, task_slug: slug, idempotent: isIdempotent }) + '\n');
