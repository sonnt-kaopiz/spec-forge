# 18 — Skill: external-research

**Phase**: 4 - Skills
**Priority**: High
**Depends on**: 11
**Plan reference**: Section 6 (Skill 3)

## Description

Create the external research skill for Laravel/Yii2 documentation and best practices research.

## Deliverables

- [ ] `skills/external-research/SKILL.md`
- [ ] `skills/external-research/references/laravel-patterns.md` — common Laravel patterns to look for
- [ ] `skills/external-research/references/yii2-patterns.md` — common Yii2 patterns to look for

## Specification

```yaml
name: external-research
description: >
  Researches external documentation, packages, and best practices for PHP/Laravel/Yii2.
  Use when "research best practices", "find packages", "check Laravel docs",
  "research how to implement", or at external-research phase of a spec-forge task.
```

**Behavior**:
- Invoke external-researcher agent with task context
- Guide search toward: official docs, Packagist packages, reference implementations
- Output structured external-research.md
