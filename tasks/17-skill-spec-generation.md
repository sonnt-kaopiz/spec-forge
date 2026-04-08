# 17 — Skill: spec-generation

**Phase**: 4 - Skills
**Priority**: High
**Depends on**: 10
**Plan reference**: Section 6 (Skill 2)

## Description

Create the spec generation skill that handles all spec input sources.

## Deliverables

- [x] `skills/spec-generation/SKILL.md`
- [x] `skills/spec-generation/references/spec-template.md`
- [x] `skills/spec-generation/references/spec-examples.md`

## Specification

```yaml
name: spec-generation
description: >
  Generates requirement specifications from any source: manual text, Jira/Linear/GitHub
  issue content, or interactive Q&A. Use when "create a spec", "write requirements",
  "parse this issue", "generate specification", or at spec phase of a spec-forge task.
```

**Behavior**:
- Detect source type from arguments (Jira URL, raw text, or no source -> interactive)
- Invoke spec-writer agent with appropriate source material
- Present spec to developer for review and approval
