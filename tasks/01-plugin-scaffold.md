# 01 — Plugin Scaffold

**Phase**: 1 - Foundation
**Priority**: Critical
**Depends on**: None
**Plan reference**: Section 1 (Plugin Directory Structure), Plugin Manifest

## Description

Create the base plugin directory structure and metadata files.

## Deliverables

- [ ] `.claude-plugin/plugin.json` — plugin metadata (name, version, description, author, keywords)
- [ ] Create empty directory structure:
  - `commands/forge/`
  - `agents/`
  - `skills/`
  - `hooks/`
  - `scripts/`
  - `templates/`
  - `tasks/.gitkeep`
- [ ] `LICENSE` (MIT)
- [ ] `.gitignore`

## Schema Reference

```json
{
  "name": "spec-forge",
  "version": "1.0.0",
  "description": "Spec-driven development workflow for PHP microservices...",
  "author": { "name": "sonnt" },
  "license": "MIT",
  "keywords": ["php", "laravel", "yii2", "spec-driven", "workflow", "microservices"]
}
```

## Notes

- The spec-forge repo is BOTH the plugin source AND the task documentation hub
- `tasks/` directory is only meaningful in the central repo, not when installed as a plugin in service repos
