# 07 — Document Templates

**Phase**: 2 - Templates
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 2 (File Purposes and Schemas)

## Description

Create the markdown templates for task documentation files.

## Deliverables

- [ ] `templates/spec.md` — specification template:
  - Source, Problem Statement, Functional/Non-Functional Requirements, Out of Scope, Acceptance Criteria, Constraints, Open Questions, Clarifications Log
- [ ] `templates/research.md` — codebase research template:
  - Services Analyzed, Architecture Overview, Existing Patterns, Key Files table, Database Schema, Dependencies, Conventions, Risks
- [ ] `templates/external-research.md` — external research template:
  - Technology References (official docs for target stack), Similar Implementations, Best Practices, Recommendations
- [ ] `templates/architecture.md` — architecture template:
  - Approach, Component Design (interfaces/type signatures), Data Flow, Database Changes, API Changes, Cross-Service Impact, Testing Strategy, Rejected Alternatives, Developer Approval
- [ ] `templates/plan.md` — phased plan template:
  - Phase Overview table (phase, service, effort, dependencies), per-phase details (goal, files, verification, risk)

## Notes

- Templates use placeholder syntax like `[Task Title]`, `[description]`
- Each template includes section headings with brief guidance comments
- Templates should be concise — they guide agents, not replace them
