# 20 — Skill: context-reconstruction

**Phase**: 4 - Skills
**Priority**: High
**Depends on**: 15
**Plan reference**: Section 6 (Skill 5)

## Description

Create the context reconstruction skill for resuming tasks after session breaks.

## Deliverables

- [ ] `skills/context-reconstruction/SKILL.md`

## Specification

```yaml
name: context-reconstruction
description: >
  Reconstructs task context when resuming a spec-forge task after a session break.
  Use when "resume task", "continue where I left off", "pick up task",
  or when SessionStart hook detects an active task.
```

**Behavior**:
- Invoke context-reconstructor agent
- Agent reads state.yaml, loads only relevant docs per resume table
- Produces context summary (< 2000 tokens)
- Display status dashboard to developer
