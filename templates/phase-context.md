# Phase {{PHASE_NUM}}: {{PHASE_NAME}} — Context

**Task**: {{TASK_TITLE}} (`{{TASK_ID}}`)
**Service**: {{SERVICE_NAME}}
**Stack**: {{STACK_PROFILE}}
**Step**: {{CURRENT_STEP}}

---

## Objective

<!-- 1-3 sentences: what this phase must accomplish and the clear done condition.
     Be specific — a developer reading only this file should know exactly what to build. -->

---

## From Previous Phases

<!-- Compact summary from RESULT.md files of prior phases.
     3-5 bullets max. Focus only on decisions and outputs that directly affect this phase.
     Omit anything that doesn't change what you will do here. -->

- Phase {{N}} ({{Name}}): <!-- key outcome that this phase builds on -->
-

---

## Architecture Decisions

<!-- Decisions from architecture.md that govern this phase's implementation.
     Copy only what is relevant — do NOT include the full architecture document.
     Each bullet should state the decision and why it matters here. -->

- <!-- Decision: what was decided — implication for this phase -->
-

---

## Key Files

<!-- Files to read before writing any code.
     Use file:line ranges when a specific region matters.
     List 3-7 files max — prioritize the most critical. -->

| File | Why It Matters |
|------|---------------|
| `path/to/file.ext:LINE` | <!-- what it defines and why this phase touches it --> |

---

## Constraints

<!-- Technical, framework, or operational limits that restrict implementation choices.
     Do NOT repeat general best practices — only constraints specific to this phase.
     Examples: "must not break the existing X interface", "migration must be reversible". -->

-

---

<!-- Token budget: keep this entire file under 2000 tokens.
     If over budget, trim "From Previous Phases" and "Architecture Decisions" first. -->
