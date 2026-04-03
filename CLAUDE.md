# Spec-Forge Plugin

This project uses spec-forge for spec-driven development in PHP microservices (Laravel & Yii2).

## Core Rules

- Tasks follow a strict workflow: spec -> research -> architecture -> planning -> phased execution
- **Never skip phases. Never proceed without developer approval at gates.**
- State is persisted in `state.yaml` — this is the single source of truth
- All task documentation lives in `tasks/<task-id>/`
- Only the orchestrating command modifies state.yaml — agents never write state directly

## Workflow Phases

1. **Discovery** — understand the requirement
2. **Spec** — generate/validate specification (approval gate)
3. **Codebase Research** — analyze existing code patterns
4. **External Research** — research docs, packages, best practices
5. **Architecture** — design the solution (approval gate)
6. **Planning** — break into phases (approval gate)
7. **Phase Execution** — loop: discuss -> plan -> implement -> verify (approval gate per phase)

## Verification Pipeline

Every implementation phase must pass: phpunit -> phpstan -> pint -> agent code review -> developer approval

## Key Commands

- `/forge new <name>` — start a new task
- `/forge resume [task-id]` — resume from saved state
- `/forge status [task-id]` — display task dashboard
- `/forge next` — advance to next phase
- `/forge verify` — run verification pipeline
- `/forge spec` — generate/edit specification
- `/forge research` — run external research
- `/forge review` — run code review
- `/forge plan` — view/regenerate plan

## Service Repo Integration

When working in a service repo, check `forge.yaml` in the repo root for:
- `spec_forge_path` — path to the central spec-forge repo
- `service_name` — which service this repo represents
- `framework` — laravel or yii2
- Verification command overrides
