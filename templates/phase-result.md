# Phase {{PHASE_NUM}} Result: {{PHASE_NAME}}

**Task**: {{TASK_TITLE}} (`{{TASK_ID}}`)
**Service**: {{SERVICE_NAME}}
**Completed**: {{COMPLETED_AT}}

---

## Completed

<!-- What was actually built. Mirror the steps from PLAN.md.
     Mark each step: done [x], partial [-], or skipped [ ].
     For partial/skipped steps, add a brief note on what remains. -->

- [x] <!-- Step 1 description -->
- [x] <!-- Step 2 description -->
- [ ] <!-- Skipped step — reason why it was not completed -->

---

## Files Modified

<!-- Every file touched during this phase.
     Include line range for significant changes.
     This list is used to populate "Key Files" in the next phase's CONTEXT.md. -->

| File | Change |
|------|--------|
| `path/to/file.ext:LINE` | <!-- Created | Modified | Deleted — one-line description of what changed --> |

---

## Deferred Items

<!-- Items from PLAN.md not completed, and items discovered during implementation
     that were left for a later phase. Include a reason for each deferral. -->

- <!-- Deferred item — Reason -->

---

## Impact on Next Phase

<!-- Concrete facts the next phase's implementer must know.
     Name the specific files, interfaces, data structures, or contracts that changed.
     This section is copied verbatim into the next phase's CONTEXT.md
     under "From Previous Phases" — write it for that audience. -->

-
