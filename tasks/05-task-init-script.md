# 05 — Task Init Script

**Phase**: 1 - Foundation
**Priority**: Critical
**Depends on**: 04
**Plan reference**: Section 1 (Task Documentation Structure)

## Description

Create the Node.js script that initializes a new task's directory structure.

## Deliverables

- [ ] `scripts/init-task.js` — accepts task slug and workspace root, creates:
  ```
  <workspace_root>/.ai-workflow/tasks/<task-slug>/
  ├── spec.md          (from template)
  ├── research.md      (from template)
  ├── external-research.md (from template)
  ├── architecture.md  (from template)
  ├── plan.md          (from template)
  ├── state.yaml       (from template, with task ID/slug populated)
  ├── services/
  ├── phases/
  └── logs/
  ```

## Notes

- Script should auto-increment task ID by scanning existing `<workspace_root>/.ai-workflow/tasks/SF-*` directories
- Must create `.ai-workflow/tasks/` if it does not exist
- Must be idempotent — running twice should not destroy existing data
- Populate state.yaml with initial values (status: discovery, timestamps, etc.)
