# 06 — State Management Scripts

**Phase**: 1 - Foundation
**Priority**: High
**Depends on**: 04
**Plan reference**: Section 3 (Atomic State Updates)

## Description

Create utility scripts for reading and writing state.yaml atomically.

## Deliverables

- [ ] `scripts/read-state.sh` — reads state.yaml and outputs as structured text or JSON
  - Accepts task slug or path (resolves to `<workspace_root>/.ai-workflow/tasks/<slug>/state.yaml`)
  - Outputs current status, phase, step, services summary
- [ ] `scripts/update-state.sh` — atomic state.yaml updates
  - Accepts field path + new value (e.g., `status phase-execution`)
  - Writes to temp file, then renames (atomic)
  - Updates `updated_at` timestamp automatically
  - Prevents partial writes on interruption

## Notes

- These scripts are called by commands and skills, not directly by users
- All state files live under `<workspace_root>/.ai-workflow/tasks/`
- Must handle YAML safely — consider using `yq` if available, fallback to sed
- Atomic write: write to `state.yaml.tmp`, then `mv state.yaml.tmp state.yaml`
