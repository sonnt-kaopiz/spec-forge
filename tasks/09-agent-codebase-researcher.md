# 09 — Agent: codebase-researcher

**Phase**: 3 - Agents
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 5 (Agent 1)

## Description

Create the codebase researcher agent that deeply analyzes existing PHP service repos.

## Deliverables

- [ ] `agents/codebase-researcher.md`

## Specification

```yaml
name: codebase-researcher
tools: Glob, Grep, Read, Bash
model: sonnet
color: yellow
```

**Responsibilities**:
- Trace execution flows in Laravel (routes -> controllers -> services -> models) and Yii2 (config -> controllers -> actions -> models)
- Identify existing design patterns (Repository, Service layer, etc.)
- Map relevant database schema
- Find similar features as reference implementations
- Document conventions (naming, directory structure, testing)
- Return structured markdown with file:line references and "10 most essential files" list

**Output format**: Must match `templates/research.md` structure
