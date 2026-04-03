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
1. If task-id provided, look for `tasks/<task-id>*/state.yaml`
2. If no task-id, scan all `tasks/*/state.yaml` for active tasks, show menu
3. Run context-reconstruction skill
4. Display status dashboard
5. Continue from current state (invoke appropriate phase logic)
