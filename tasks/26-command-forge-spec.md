# 26 — Command: /forge:spec

**Phase**: 5 - Commands
**Priority**: Medium
**Depends on**: 17
**Plan reference**: Section 7 (/forge:spec)

## Description

Create the standalone spec generation/editing command.

## Deliverables

- [x] `commands/forge/spec.md`

## Specification

```yaml
description: Generate or edit the task specification
argument-hint: [--from-jira KEY | --from-linear KEY | --from-github NUM | --interactive]
```

**Workflow**:
1. If task has existing spec.md, offer to edit or regenerate
2. Run spec-generation skill with appropriate source
3. Present spec for developer review
