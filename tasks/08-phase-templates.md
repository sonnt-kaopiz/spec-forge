# 08 — Phase Templates

**Phase**: 2 - Templates
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 2 (Phase Files)

## Description

Create the markdown templates for per-phase documentation files.

## Deliverables

- [ ] `templates/phase-context.md` — CONTEXT.md template:
  - Objective, From Previous Phases (summary), Relevant Architecture Decisions, Key Files to Read, Constraints
  - Must be capped at ~2000 tokens — this is the token-optimized context injection
- [ ] `templates/phase-plan.md` — PLAN.md template:
  - Numbered steps with file paths, Verification Plan (what to test/check)
- [ ] `templates/phase-verification.md` — VERIFICATION.md template:
  - PHPUnit (status, command, results), PHPStan (status, level, errors), Pint (status, auto-fixes), Agent Code Review (status, findings), Developer Approval (status, notes)
- [ ] `templates/phase-result.md` — RESULT.md template:
  - Completed items, Files Modified with line references, Deferred Items, Impact on Next Phase

## Notes

- CONTEXT.md is the most critical template — it defines what gets injected into the main conversation context on resume
- RESULT.md feeds into the next phase's CONTEXT.md — these two form the handoff contract
