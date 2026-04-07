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

## Decisions

> Discussed on 2026-04-07

### Field path syntax and array operations

`update-state.js` uses dot-notation with numeric segment for array indexing (e.g. `phases.0.status in-progress`, `current_phase 2`). It supports two array operations: append a new item to an array field, and update an item by index. Callers must know the index when targeting array items. Replace-entire-array is out of scope.

### YAML manipulation strategy

Both scripts use a full round-trip approach: read the file, parse YAML to a plain JS object using a minimal built-in parser (no npm packages), apply the mutation via a dot-path setter, serialize back to YAML, write to a `.tmp` file, then atomic rename. Comments in the live state file are not required to survive a rewrite — the template is the canonical source of documentation. This approach correctly handles all nested structures (objects nested within arrays) without risking partial corruption.

### Output contract for read-state.js

`read-state.js` always outputs the full state object as JSON to stdout (no text/human format, no `--field` selector). Callers use `JSON.parse()` to extract whatever fields they need. Errors go to stderr with a non-zero exit code.
