# 28 — Command: /forge:review

**Phase**: 5 - Commands
**Priority**: Medium
**Depends on**: 14
**Plan reference**: Section 7 (/forge:review)

## Description

Create the standalone code review command.

## Deliverables

- [x] `commands/forge/review.md`

## Specification

```yaml
description: Run agent code review on current changes
argument-hint: [--diff-only | --full]
```

**Workflow**:
1. Launch 2-3 code-reviewer agents in parallel with different focuses
2. Consolidate findings (only confidence >= 80)
3. Present to developer grouped by severity
