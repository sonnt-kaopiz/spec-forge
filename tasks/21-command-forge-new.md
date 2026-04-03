# 21 — Command: /forge new

**Phase**: 5 - Commands
**Priority**: Critical
**Depends on**: 04, 05, 16, 17, 18, 12, 13
**Plan reference**: Section 7 (/forge new)

## Description

Create the primary command that orchestrates the entire task lifecycle. This is the most complex file in the plugin.

## Deliverables

- [ ] `commands/forge/new.md`

## Specification

```yaml
description: Create a new spec-forge task and begin the guided workflow
argument-hint: <task-name> [--source jira:KEY | linear:KEY | github:NUM]
```

**Workflow** (19 steps):
1. Parse $ARGUMENTS for task name and optional source
2. Scan tasks/ for next task ID number
3. Run scripts/init-task.sh to create directory structure
4. Initialize state.yaml (status: discovery)
5. If source provided, fetch and parse issue content
6. Begin Discovery: understand the requirement
7. Transition to Spec: generate spec.md via spec-generation skill
8. **GATE**: Present spec to developer for approval
9. Transition to codebase-research
10. Run codebase-research skill (parallel agents)
11. Present research summary, transition to external-research
12. Run external-research skill
13. Present research, transition to architecture
14. Run solution-architect agent (opus model)
15. **GATE**: Present architecture to developer for approval
16. Run phase-planner agent
17. **GATE**: Present plan to developer for approval
18. Transition to phase-execution, set current_phase to 1
19. Begin first phase discussion step

## Notes

- This is the longest command — each step clearly delineated
- Must update state.yaml at each transition
- Developer approval gates at steps 8, 15, 17, and at every phase verification
