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
  - `tasks/` (build task specs for plugin development only)
- [ ] `LICENSE` (MIT)
- [ ] `.gitignore`

## Schema Reference

```json
{
  "name": "spec-forge",
  "version": "1.0.0",
  "description": "Spec-driven development workflow for microservices. Supports any language or framework via configurable stack profiles.",
  "author": { "name": "sonnt" },
  "license": "MIT",
  "keywords": ["spec-driven", "workflow", "microservices", "multi-language", "agents", "verification"]
}
```

## Notes

- The spec-forge repo is the plugin source only — no runtime output is stored here
- `tasks/` in this repo holds build task specs for developing the plugin itself
- All runtime output (task state, specs, research, etc.) goes to `<workspace_root>/.ai-workflow/` at the central workspace root
