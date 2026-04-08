---
name: spec-generation
description: >
  Generates requirement specifications from any source: manual text, Jira/Linear/GitHub
  issue content, or interactive Q&A. Use when "create a spec", "write requirements",
  "parse this issue", "generate specification", or at spec phase of a spec-forge task.
---

# Skill: spec-generation

Drives the `spec-writer` agent through one or more passes to produce a complete
`spec.md` for a spec-forge task. The calling command supplies raw input from the
developer; this skill detects the source type, runs the agent, and returns the
generated spec plus a clarifying-questions block. The orchestrating command shows
those questions to the developer, gathers answers, and may invoke this skill again
to refine the spec.

This skill is stateless. It does not read or modify `state.yaml`. It does not write
files. It returns markdown only.

---

## Inputs

The command invoking this skill must supply:

- `task_input` — the raw task description in any form. May be free-text, an issue
  body that the command already pulled, or a Q&A transcript from a refinement round.
- `task_id` — the spec-forge task identifier (e.g. `SF-2026-04-08-add-notifications`).
- `task_slug` — the kebab-case slug used for filenames.
- `source_hint` — (optional) one of `manual`, `jira:<KEY>`, `linear:<KEY>`,
  `github:<NUM>`, `interactive`. If unset, the skill detects the source from
  `task_input` (see Step 1).
- `existing_spec` — (optional) the current `spec.md` content if this is a
  refinement pass. When present, the skill runs `spec-writer` in `refine` mode.
- `mode_override` — (optional) `draft`, `refine`, or `validate`. Overrides the
  mode that would otherwise be inferred from `existing_spec`.

If `task_input` is empty AND `existing_spec` is empty, return the empty-input
failure response defined under Failure Handling — do not invoke the agent.

---

## Step 1 — Detect Source Type

If `source_hint` is provided, use it directly. Otherwise scan `task_input` once
and apply the first matching rule:

| Signal in `task_input` | Detected source |
|---|---|
| Contains a Jira-style key like `[A-Z]{2,}-\d+` and references a Jira host or "Jira" | `jira:<KEY>` |
| Contains a Linear-style key like `[A-Z]{2,}-\d+` and references "Linear" | `linear:<KEY>` |
| Contains a GitHub issue/PR URL (`github.com/.../issues/\d+` or `pull/\d+`) | `github:<NUM>` |
| Contains alternating `Q:` / `A:` lines (a transcript) | `interactive` |
| Anything else | `manual` |

Record the detected value as `source` and pass it verbatim to the agent.

When in doubt between two signals, prefer the more specific one (issue tracker
keys win over `manual`). Never invent a key the input does not contain — if you
detect "looks like Jira" but cannot extract `<KEY>`, fall back to `manual`.

---

## Step 2 — Decide Mode

The mode determines how `spec-writer` treats `existing_spec`:

| Condition | Mode |
|---|---|
| `mode_override` is set | use `mode_override` |
| `existing_spec` is empty | `draft` |
| `existing_spec` is non-empty AND `source` is `interactive` | `refine` |
| `existing_spec` is non-empty AND source is anything else | `refine` |
| Caller explicitly asked to "check" or "validate" the spec | `validate` |

Pass the chosen mode to the agent.

---

## Step 3 — Invoke spec-writer

Spawn a single `spec-writer` agent and pass:

- `task_input` — verbatim, do not summarise or trim
- `source` — from Step 1
- `task_id`, `task_slug` — from inputs
- `existing_spec` — from inputs (omit if empty)
- `mode` — from Step 2

The agent returns a single response containing two markdown documents separated
by the literal marker line `---SPEC-END---`:

1. The full `spec.md` content (everything before the marker)
2. The `Clarifying Questions` block (everything after the marker)

Do not modify either document. Do not add commentary inside them.

---

## Step 4 — Return Both Documents

Return the agent's response unchanged, preserving the `---SPEC-END---` marker so
the calling command can split the two documents reliably.

The orchestrating command will:
- Write the spec body to the task's `spec.md` path defined in `state.yaml`.
- Display the clarifying questions to the developer.
- Decide whether to invoke this skill again with the developer's answers as
  `task_input` and the just-written spec as `existing_spec`.

Do not write any files yourself.

---

## Output Contract

The output of this skill is exactly the `spec-writer` agent's response, which
must contain both documents in this shape:

```markdown
# Specification: <Task Title>

<!-- spec body matching templates/spec.md structure -->

---SPEC-END---

# Clarifying Questions

<numbered list, or "None — spec is ready for review.">
```

If the agent's response is missing the `---SPEC-END---` marker, treat it as a
failure and apply Failure Handling Step B.

---

## Reference Material

- `references/spec-template.md` — the empty spec shape the agent must produce.
  Mirrors `templates/spec.md`. Open this if you need to verify the agent's
  output has every required section.
- `references/spec-examples.md` — short before/after examples of vague vs
  concrete spec language. Open this only when the developer asks for examples
  or you need to demonstrate what "good" looks like in a clarifying question.

These files are reference material — do not return them as the skill output.

---

## Rules and Constraints

- **Pass `task_input` verbatim** to the agent. Do not summarise, paraphrase, or
  truncate it — the agent needs the original wording to detect ambiguity.
- **Never invent issue keys, dates, or author names.** If the input does not
  contain them, leave the agent to fill them with `<NEEDS CLARIFICATION>`.
- **Do not answer the clarifying questions yourself.** The questions are for
  the developer. Returning a "best guess" defeats the point of the spec phase.
- **Do not write files.** Return the agent's markdown only. The calling
  command handles persistence.
- **Do not modify `state.yaml`.** The orchestrating command updates state.
- **Self-contained.** This prompt includes everything needed. Do not assume
  CLAUDE.md or other context is loaded.

---

## Failure Handling

### A — Empty input

If `task_input` is empty AND `existing_spec` is empty, return this exact
response without invoking the agent:

```markdown
# Specification: <unset>

**Status**: Cannot draft — no input provided

---SPEC-END---

# Clarifying Questions

1. What problem are you trying to solve? Please provide a free-text description,
   a Jira/Linear/GitHub issue body, or paste the source material so the spec
   can be drafted.
```

### B — Agent returned malformed output

If the agent's response is missing the `---SPEC-END---` marker, or one of the
two documents is empty, return this response:

```markdown
# Specification: <Task Title>

**Status**: Draft generation failed — agent returned malformed output. Re-run
the spec phase or provide the input directly to the developer for review.

---SPEC-END---

# Clarifying Questions

1. The spec-writer agent did not return a parseable response. Please re-run
   `/forge:spec` or supply the spec content manually.
```

### C — Agent failed entirely

If the agent did not respond, return the same response as Failure Handling B
with the status line: `Draft generation failed — spec-writer agent did not
respond.`

Never return an empty response. The calling command always expects the
two-document format separated by `---SPEC-END---`.
