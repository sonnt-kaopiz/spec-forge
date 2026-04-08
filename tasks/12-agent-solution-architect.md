# 12 — Agent: solution-architect

**Phase**: 3 - Agents
**Priority**: Critical
**Depends on**: 01
**Plan reference**: Section 5 (Agent 4)

## Description

Create the solution architect agent. This is the highest-leverage agent — uses Opus model. Its output quality determines the success of every implementation phase downstream.

## Deliverables

- [x] `agents/solution-architect.md`

## Specification

```yaml
name: solution-architect
tools: Glob, Grep, Read, Bash
model: opus
color: green
```

**Responsibilities**:
- Design solution architecture that fits existing codebase patterns
- Specify component interfaces/type signatures appropriate to the target language
- Design database schema changes and migration strategy
- Define API contracts for cross-service communication
- Produce concrete file-level implementation map
- Make decisive choices — pick one approach and commit, don't present options

**Output format**: Must match `templates/architecture.md` structure

## Notes

- Only agent using Opus model — architecture decisions are high-leverage
- Must receive spec.md + research.md + external-research.md as input
- Should produce concrete interface/type definitions, not just descriptions
