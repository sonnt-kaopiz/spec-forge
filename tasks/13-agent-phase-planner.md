# 13 — Agent: phase-planner

**Phase**: 3 - Agents
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 5 (Agent 5)

## Description

Create the phase planner agent that breaks architecture into sequential implementation phases.

## Deliverables

- [x] `agents/phase-planner.md`

## Specification

```yaml
name: phase-planner
tools: Read
model: sonnet
color: green
```

**Responsibilities**:
- Decompose architecture into phases of 1-4 hours each
- Order by dependencies (database -> models -> services -> API -> UI)
- Assign each phase to a specific service
- Define verification criteria per phase
- Generate CONTEXT.md template for each phase

**Output format**: Must match `templates/plan.md` structure
