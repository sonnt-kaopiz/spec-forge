# 09 — Agent: codebase-researcher

**Phase**: 3 - Agents
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 5 (Agent 1)

## Description

Create the codebase researcher agent that deeply analyzes existing service repositories.

## Deliverables

- [x] `agents/codebase-researcher.md`

## Specification

```yaml
name: codebase-researcher
tools: Glob, Grep, Read, Bash
model: sonnet
color: yellow
```

**Responsibilities**:
- Detect stack from manifest files and adapt exploration accordingly
- Trace execution flows using the framework's conventions (routes -> controllers -> services -> models, or equivalent)
- Identify existing design patterns (Repository, Service layer, etc.)
- Map relevant database schema or entity definitions
- Find similar features as reference implementations
- Document conventions (naming, directory structure, testing)
- Return structured markdown with file:line references and "10 most essential files" list

**Output format**: Must match `templates/research.md` structure
