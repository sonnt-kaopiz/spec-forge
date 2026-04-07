# 21 — Command: /forge:new

**Phase**: 5 - Commands
**Priority**: Critical
**Depends on**: 04, 05, 16, 17, 18, 12, 13
**Plan reference**: Section 7 (/forge:new)

## Description

Create the primary command that orchestrates the entire task lifecycle. This is the most complex file in the plugin.

## Deliverables

- [ ] `commands/forge/new.md`

## Specification

```yaml
description: Create a new spec-forge task and begin the guided workflow
argument-hint: <task-name> [--source jira:KEY | linear:KEY | github:NUM]
```

**Workflow** (20 steps):
1. Parse $ARGUMENTS for task name and optional source
2. Resolve `workspace_root` from forge.yaml config
3. Scan `<workspace_root>/.ai-workflow/tasks/` for next task ID number
4. Run scripts/init-task.js to create directory structure under `<workspace_root>/.ai-workflow/tasks/`
5. Initialize state.yaml (status: discovery)
6. If source provided, fetch and parse issue content
7. Begin Discovery: understand the requirement
8. Transition to Spec: generate spec.md via spec-generation skill
9. **GATE**: Present spec to developer for approval
10. Transition to codebase-research
11. Run codebase-research skill (parallel agents)
12. Present research summary, transition to external-research
13. Run external-research skill
14. Present research, transition to architecture
15. Run solution-architect agent (opus model)
16. **GATE**: Present architecture to developer for approval
17. Run phase-planner agent
18. **GATE**: Present plan to developer for approval
19. Transition to phase-execution, set current_phase to 1
20. Begin first phase discussion step

## Notes

- This is the longest command — each step clearly delineated
- Must update state.yaml at each transition
- Developer approval gates at steps 9, 16, 18, and at every phase verification
