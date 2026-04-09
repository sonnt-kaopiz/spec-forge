#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

const PACKAGE_ROOT = path.join(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
const VERSION = PKG.version;

const [, , command, ...args] = process.argv;

switch (command) {
  case 'install':
    install(process.cwd(), { force: args.includes('--force') });
    break;
  case 'update':
    update(process.cwd(), { force: args.includes('--force') });
    break;
  case 'version':
  case '--version':
  case '-v':
    console.log(VERSION);
    break;
  default:
    printHelp();
    process.exit(command ? 1 : 0);
}

function install(targetDir, { force } = {}) {
  const specForgeDir = path.join(targetDir, '.cursor', '.spec-forge');
  const cursorCommandsDir = path.join(targetDir, '.cursor', 'commands', 'forge');
  const versionFile = path.join(specForgeDir, 'VERSION');

  if (!force && fs.existsSync(versionFile)) {
    const installed = fs.readFileSync(versionFile, 'utf8').trim();
    if (installed === VERSION) {
      console.log(`spec-forge ${VERSION} already installed. Run 'npx spec-forge@latest update' to upgrade.`);
      return;
    }
  }

  console.log(`Installing spec-forge ${VERSION} into ${targetDir}...`);

  // Copy runtime files to .cursor/.spec-forge/
  copyDir(path.join(PACKAGE_ROOT, 'commands', 'forge'), path.join(specForgeDir, 'commands', 'forge'));
  copyDir(path.join(PACKAGE_ROOT, 'skills'), path.join(specForgeDir, 'skills'));
  copyDir(path.join(PACKAGE_ROOT, 'agents'), path.join(specForgeDir, 'agents'));
  copyDir(path.join(PACKAGE_ROOT, 'scripts'), path.join(specForgeDir, 'scripts'));
  copyDir(path.join(PACKAGE_ROOT, 'templates'), path.join(specForgeDir, 'templates'));
  copyFile(path.join(PACKAGE_ROOT, 'forge.yaml'), path.join(specForgeDir, 'forge.yaml'));
  fs.writeFileSync(versionFile, VERSION + '\n');

  // Copy Cursor command wrappers to .cursor/commands/forge/
  copyDir(path.join(PACKAGE_ROOT, '.cursor', 'commands', 'forge'), cursorCommandsDir);

  console.log(`\nspec-forge ${VERSION} installed.\n`);
  console.log('Next steps:');
  console.log('  1. Add .cursor/.spec-forge/ to your .gitignore');
  console.log('  2. Copy .cursor/.spec-forge/templates/forge-service.yaml to your service repo root and fill it in');
  console.log('  3. Open Cursor and type /forge to see available commands');
  console.log('  4. Run: npx spec-forge@latest update   to upgrade when a new version is released');
}

function update(targetDir, { force } = {}) {
  const versionFile = path.join(targetDir, '.cursor', '.spec-forge', 'VERSION');

  if (!force && fs.existsSync(versionFile)) {
    const installed = fs.readFileSync(versionFile, 'utf8').trim();
    if (installed === VERSION) {
      console.log(`Already on spec-forge ${VERSION}. Nothing to update.`);
      return;
    }
    console.log(`Updating spec-forge ${installed} → ${VERSION}...`);
  }

  install(targetDir, { force: true });
}

function printHelp() {
  console.log(`spec-forge CLI v${VERSION}

Usage:
  npx spec-forge install         Install spec-forge for Cursor in the current project
  npx spec-forge update          Update to the latest package version
  npx spec-forge version         Print the installed package version

Flags:
  --force   Re-install even if the same version is already present
`);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
