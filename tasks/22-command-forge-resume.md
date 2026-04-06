# 22 — Command: /forge resume

**Phase**: 5 - Commands
**Priority**: Critical
**Depends on**: 04, 20
**Plan reference**: Section 7 (/forge resume)

## Description

Create the resume command that continues a task from saved state.

## Deliverables

- [ ] `commands/forge/resume.md`

## Specification

```yaml
description: Resume a spec-forge task from saved state
argument-hint: [task-id]
```

**Workflow**:
1. Resolve `workspace_root` from forge.yaml config
2. If task-id provided, look for `<workspace_root>/.ai-workflow/tasks/<task-id>*/state.yaml`
3. If no task-id, scan all `<workspace_root>/.ai-workflow/tasks/*/state.yaml` for active tasks, show menu
4. Run context-reconstruction skill
5. Display status dashboard
6. Continue from current state (invoke appropriate phase logic)
