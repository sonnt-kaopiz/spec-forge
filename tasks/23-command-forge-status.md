# 23 — Command: /forge:status

**Phase**: 5 - Commands
**Priority**: High
**Depends on**: 04
**Plan reference**: Section 7 (/forge:status)

## Description

Create the status command that displays a task/phase dashboard.

## Deliverables

- [ ] `commands/forge/status.md`

## Specification

```yaml
description: Display spec-forge task and phase status dashboard
argument-hint: [task-id]
```

**Workflow**:
1. Read state.yaml (current or specified task)
2. Display formatted dashboard showing:
   - Task title and overall status
   - All phases with completion status (completed/in-progress/pending)
   - Current step within current phase
   - Services involved and their status
   - Active blockers (if any)
