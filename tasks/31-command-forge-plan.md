# 31 — Command: /forge:plan

**Phase**: 5 - Commands
**Priority**: Medium
**Depends on**: 04
**Plan reference**: Section 7

## Description

Create the command that displays or regenerates the implementation plan.

## Deliverables

- [x] `commands/forge/plan.md`

## Specification

```yaml
description: View or regenerate the implementation plan
argument-hint: [--regenerate]
```

**Workflow**:
1. Read current task's plan.md
2. If --regenerate, re-run phase-planner agent with current architecture.md
3. Display plan with phase status from state.yaml
