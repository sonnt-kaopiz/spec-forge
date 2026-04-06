# 16 — Skill: codebase-research

**Phase**: 4 - Skills
**Priority**: High
**Depends on**: 09
**Plan reference**: Section 6 (Skill 1)

## Description

Create the codebase research skill that orchestrates parallel codebase-researcher agents.

## Deliverables

- [ ] `skills/codebase-research/SKILL.md`

## Specification

```yaml
name: codebase-research
description: >
  Performs deep codebase analysis for service repositories in any language or framework.
  Use when "analyze the codebase", "understand the code", "find patterns",
  "trace execution", "explore the architecture", or at codebase-research
  phase of a spec-forge task.
```

**Behavior**:
- Launch 2-3 parallel codebase-researcher agents with different focuses:
  - Agent 1: Similar features and reference implementations
  - Agent 2: Architecture, patterns, conventions
  - Agent 3: Data flow, schema, dependencies (optional, for complex tasks)
- Collect outputs and merge into structured research.md format
- Include research.md template inline for reference
