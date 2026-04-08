# Spec Template (reference)

This file mirrors `templates/spec.md` and exists so the `spec-generation` skill
and `spec-writer` agent can verify the shape of their output without loading
the project-level template at runtime. Keep it in sync with `templates/spec.md`
whenever the canonical template changes.

Every section below is **required** in a generated `spec.md`. A section may
contain `<NEEDS CLARIFICATION>` placeholders or be filled with `—`, but the
heading itself must be present.

---

```markdown
# Specification: <Task Title>

<!--
  Task ID: <task_id>
  Slug:    <task_slug>
  Status:  Draft
  Created: <YYYY-MM-DD>
-->

**Task ID**: <task_id>
**Slug**: <task_slug>
**Status**: Draft
**Created**: <YYYY-MM-DD>

---

## Source

- **Origin**: <Manual | Jira:KEY | Linear:KEY | github:NUM | Interactive Q&A>
- **Author**: <name from input, or "unknown">
- **Date**: <YYYY-MM-DD>

## Problem Statement

<2–3 sentences. Problem and context only. No solutions.>

## Requirements

### Functional Requirements

1. [FR-1] The system MUST <…>
2. [FR-2] The system MUST <…>
3. [FR-3] The system SHOULD <…>

### Non-Functional Requirements

1. [NFR-1] <category>: <measurable target>
2. [NFR-2] <category>: <measurable target>

### Out of Scope

- <explicit exclusion>
- <explicit exclusion>

## Acceptance Criteria

- [ ] AC-1: When <condition>, then <observable result>
- [ ] AC-2: When <condition>, then <observable result>

## Constraints

- <constraint with reason>
- <constraint with reason>

## Open Questions

- <numbered question that must be resolved before implementation>
- <…>

## Clarifications Log

- Q: <question>
  A: <answer>
- Q: <question>
  A: <answer>
```

---

## Required Sections Checklist

A spec is structurally valid only when **all** of the following are present:

1. Title with `# Specification: <Task Title>`
2. HTML comment metadata block AND visible metadata lines
3. `## Source` with all three sub-fields filled or marked `<NEEDS CLARIFICATION>`
4. `## Problem Statement` (2–3 sentences, no solutioning)
5. `## Requirements` containing:
   - `### Functional Requirements` with at least one `[FR-N]` line
   - `### Non-Functional Requirements` with at least one `[NFR-N]` line OR `—`
   - `### Out of Scope` with at least one bullet
6. `## Acceptance Criteria` with at least one `[AC-N]` line per `[FR-N]`
7. `## Constraints` (may contain `—`)
8. `## Open Questions` (may contain `—`)
9. `## Clarifications Log` (may contain `—` on first draft)

If any of the above is missing from the agent's output, the spec is malformed
and the orchestrating command should request a regeneration.
