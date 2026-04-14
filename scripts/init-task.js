#!/usr/bin/env node
// init-task.js — Initialize a new task directory under <workspace_root>/.ai-workflow/tasks/
//
// Usage:
//   node init-task.js <task-slug> [workspace_root]
//   node init-task.js --manual "<short-description>" [workspace_root]
//
// Arguments:
//   task-slug           Short kebab-case label (e.g. "add-user-notifications")
//   --manual <desc>     Generate a slug as <task_prefix>-<random6>-<desc>
//   workspace_root      Path to the service repo root. Defaults to process.cwd().
//
// Behaviour:
//   - Auto-increments task ID by scanning existing SF-* directories
//   - Idempotent: safe to run multiple times; never overwrites existing files
//   - Creates all required subdirectories and populates files from templates

'use strict';

const fs = require('fs');
const path = require('path');
const { parseYaml } = require('./state-yaml');

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function printUsage() {
  const cmd = path.basename(process.argv[1]);
  process.stderr.write(`Usage: node ${cmd} <task-slug> [workspace_root]\n`);
  process.stderr.write(`   or: node ${cmd} --manual "<short-description>" [workspace_root]\n`);
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
let workspaceRoot = process.cwd();
let manualDescription = '';

if (args[0] === '--manual') {
  manualDescription = args[1] || '';
  workspaceRoot = args[2] || process.cwd();
} else {
  slug = args[0] || '';
  workspaceRoot = args[1] || process.cwd();
}

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
// Auto-increment task ID
// ---------------------------------------------------------------------------
function getNextTaskId() {
  let max = 0;
  if (fs.existsSync(tasksDir)) {
    for (const entry of fs.readdirSync(tasksDir)) {
      const full = path.join(tasksDir, entry);
      if (!fs.statSync(full).isDirectory()) continue;
      const match = entry.match(new RegExp('^' + prefix + '-(\\d+)'));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
  }
  return max + 1;
}

// ---------------------------------------------------------------------------
// Guard: if a directory for this slug already exists at any SF-* number, reuse it
// ---------------------------------------------------------------------------
let taskDir;
let taskId;

if (fs.existsSync(tasksDir)) {
  const existing = fs.readdirSync(tasksDir).find((entry) => {
    const full = path.join(tasksDir, entry);
    return fs.statSync(full).isDirectory() && new RegExp('^' + prefix + '-\\d+-' + slug + '$').test(entry);
  });

  if (existing) {
    taskDir = path.join(tasksDir, existing);
    taskId = existing.match(/^(SF-\d+)/)[1];
    console.log(`Task directory already exists: ${taskDir}`);
    console.log('Ensuring all files and subdirectories are present (idempotent mode).');
  }
}

if (!taskDir) {
  const taskNum = getNextTaskId();
  taskId = `${prefix}-${String(taskNum).padStart(3, '0')}`;
  taskDir = path.join(tasksDir, `${taskId}-${slug}`);
}

const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// ---------------------------------------------------------------------------
// Create directory structure
// ---------------------------------------------------------------------------
for (const sub of ['services', 'phases', 'logs']) {
  fs.mkdirSync(path.join(taskDir, sub), { recursive: true });
}

console.log(`Task directory: ${taskDir}`);

// ---------------------------------------------------------------------------
// Helper: copy a template file if the destination does not already exist.
// Substitutes: {{TASK_ID}}, {{TASK_SLUG}}, {{TASK_TITLE}}, {{CREATED_AT}},
//              {{CREATED_DATE}} (date-only portion of CREATED_AT)
// ---------------------------------------------------------------------------
function installTemplate(templateFile, destFile) {
  if (fs.existsSync(destFile)) {
    console.log(`  [skip]   ${destFile} (already exists)`);
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
  console.log(`  [create] ${destFile}`);
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
// Done
// ---------------------------------------------------------------------------
console.log('');
console.log('Task initialised successfully.');
console.log(`  ID   : ${taskId}`);
console.log(`  Slug : ${slug}`);
console.log(`  Dir  : ${taskDir}`);
console.log('');
console.log('Next step: fill in spec.md, then run /forge:spec to generate a full specification.');
