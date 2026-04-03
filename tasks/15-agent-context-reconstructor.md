# 15 — Agent: context-reconstructor

**Phase**: 3 - Agents
**Priority**: High
**Depends on**: 04
**Plan reference**: Section 5 (Agent 7)

## Description

Create the context reconstructor agent that rebuilds task context on session resume.

## Deliverables

- [ ] `agents/context-reconstructor.md`

## Specification

```yaml
name: context-reconstructor
tools: Read, Glob
model: sonnet
color: yellow
```

**Responsibilities**:
- Read state.yaml to determine exact position
- Load ONLY documents relevant to current phase (per resume logic table)
- Produce structured context summary: task objective, what's done, what's in progress, what's next, key decisions, file references
- Output MUST be under 2000 tokens — this gets injected into main conversation

## Resume Document Loading Rules

| Status | Documents Loaded |
|--------|-----------------|
| discovery | spec template only |
| spec | spec.md (draft) |
| codebase-research | spec.md |
| external-research | spec.md + research.md |
| architecture | spec.md + research.md + external-research.md |
| planning | architecture.md |
| phase-execution | plan.md + current phase CONTEXT.md + previous RESULT.md |
| blocked | state.yaml blockers + current phase context |
