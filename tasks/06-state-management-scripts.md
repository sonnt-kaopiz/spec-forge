# 06 — State Management Scripts

**Phase**: 1 - Foundation
**Priority**: High
**Depends on**: 04
**Plan reference**: Section 3 (Atomic State Updates)

## Description

Create Node.js utility scripts for reading and writing state.yaml atomically.

## Deliverables

- [ ] `scripts/read-state.js` — reads state.yaml and outputs as structured text or JSON
  - Accepts task slug or path (resolves to `<workspace_root>/.ai-workflow/tasks/<slug>/state.yaml`)
  - Outputs current status, phase, step, services summary
- [ ] `scripts/update-state.js` — atomic state.yaml updates
  - Accepts field path + new value (e.g., `status phase-execution`)
  - Writes to temp file using `fs.writeFileSync`, then renames with `fs.renameSync` (atomic)
  - Updates `updated_at` timestamp automatically
  - Prevents partial writes on interruption

## Notes

- These scripts are called by commands and skills, not directly by users
- All state files live under `<workspace_root>/.ai-workflow/tasks/`
- Must handle YAML safely — use Node.js built-in `fs` for file I/O; parse/serialise YAML with a lightweight regex-based approach or line-by-line replacement (no external npm packages)
- Atomic write: write to `state.yaml.tmp`, then `fs.renameSync('state.yaml.tmp', 'state.yaml')`
