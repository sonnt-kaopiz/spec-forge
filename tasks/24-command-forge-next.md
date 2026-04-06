# 24 — Command: /forge:next

**Phase**: 5 - Commands
**Priority**: High
**Depends on**: 04, 08
**Plan reference**: Section 7 (/forge:next)

## Description

Create the command that advances to the next phase or step.

## Deliverables

- [ ] `commands/forge/next.md`

## Specification

```yaml
description: Advance to the next phase or step within current phase
argument-hint: [--force]
```

**Workflow**:
1. Read state.yaml
2. If current step is not verification-complete, warn (unless --force)
3. If phase verification complete:
   - Write RESULT.md for current phase
   - Increment current_phase
   - Reset current_step to discussion
   - Generate CONTEXT.md for next phase from plan.md + previous RESULT.md
4. If all phases complete, transition to completed status
