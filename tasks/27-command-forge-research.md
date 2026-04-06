# 27 — Command: /forge:research

**Phase**: 5 - Commands
**Priority**: Medium
**Depends on**: 18
**Plan reference**: Section 7 (/forge:research)

## Description

Create the standalone external research command.

## Deliverables

- [ ] `commands/forge/research.md`

## Specification

```yaml
description: Run external technology research for the current task
argument-hint: [specific topic to research]
```

**Workflow**:
1. Read spec.md and research.md for context
2. Run external-research skill with task context + any specific topic from $ARGUMENTS
3. Write results to external-research.md
