# 04 — State Schema: templates/state.yaml

**Phase**: 1 - Foundation
**Priority**: Critical
**Depends on**: 01
**Plan reference**: Section 2 (state.yaml schema), Section 3 (State Management)

## Description

Create the state.yaml template that defines the complete state schema. This is the most foundational file — every other component reads/writes this format.

## Deliverables

- [ ] `templates/state.yaml` — complete state template with:
  - `version`: schema version (1)
  - `task`: id, slug, title, description, created_at, updated_at, assignee, source, tags
  - `status`: enum (discovery, spec, codebase-research, external-research, architecture, planning, phase-execution, completed, blocked, abandoned)
  - `current_phase`: index into phases list
  - `current_step`: enum (discussion, planning, implementation, verification)
  - `services`: list of {name, repo, branch, status}
  - `phases`: list of {id, name, status, service, started_at, completed_at, verification{phpunit, phpstan, pint, review}}
  - `blockers`: list of {description, created_at, resolved_at}
  - `session_log`: list of {session, phases_worked, duration_minutes}

## State Transitions

```
[NEW] -> discovery -> spec -> codebase-research -> external-research -> architecture -> planning -> phase-execution -> completed
```

Phase execution inner loop: `discussion -> planning -> implementation -> verification`

## Approval Gates

- spec -> codebase-research: developer approves spec
- architecture -> planning: developer approves architecture
- planning -> phase-execution: developer approves plan
- Each phase verification: developer approves to proceed
