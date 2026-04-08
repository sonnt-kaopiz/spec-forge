# 18 — Skill: external-research

**Phase**: 4 - Skills
**Priority**: High
**Depends on**: 11
**Plan reference**: Section 6 (Skill 3)

## Description

Create the external research skill for documentation and best practices research for the target stack.

## Deliverables

- [x] `skills/external-research/SKILL.md`

## Specification

```yaml
name: external-research
description: >
  Researches external documentation, packages, and best practices for the target stack.
  Use when "research best practices", "find packages", "check docs",
  "research how to implement", or at external-research phase of a spec-forge task.
```

**Behavior**:
- Read the service's stack identity (language, framework) from context or state.yaml
- Invoke external-researcher agent with task context and stack information
- Guide search toward: official framework/language docs, relevant package registries, reference implementations
- Output structured external-research.md
