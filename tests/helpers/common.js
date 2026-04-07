'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPTS_DIR = path.resolve(__dirname, '..', '..', 'scripts');
const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'templates');

/**
 * Create an isolated temp workspace directory.
 * Returns the workspace path.
 */
function setupWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'spec-forge-test-'));
}

/**
 * Remove the temp workspace created by setupWorkspace.
 */
function teardownWorkspace(workspace) {
  if (workspace && fs.existsSync(workspace)) {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

/**
 * Return the tasks directory path inside a workspace.
 */
function tasksDir(workspace) {
  return path.join(workspace, '.ai-workflow', 'tasks');
}

function assertDirExists(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Expected directory to exist: ${dir}`);
  }
}

function assertFileExists(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`Expected file to exist: ${file}`);
  }
}

function assertFileContains(file, pattern) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(pattern)) {
    throw new Error(`Expected '${file}' to contain: ${pattern}\nActual contents:\n${content}`);
  }
}

function assertFileNotContains(file, pattern) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(pattern)) {
    throw new Error(`Expected '${file}' NOT to contain: ${pattern}`);
  }
}

module.exports = {
  SCRIPTS_DIR,
  TEMPLATES_DIR,
  setupWorkspace,
  teardownWorkspace,
  tasksDir,
  assertDirExists,
  assertFileExists,
  assertFileContains,
  assertFileNotContains,
};
