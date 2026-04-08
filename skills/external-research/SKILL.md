---
name: external-research
description: >
  Researches external documentation, packages, and best practices for the target stack.
  Use when "research best practices", "find packages", "check docs",
  "research how to implement", or at external-research phase of a spec-forge task.
---

# Skill: external-research

Drives the `external-researcher` agent against the target service's stack to
produce a single `external-research.md` document. The calling command supplies
the task context and the stack identity; this skill returns the merged markdown
document. The orchestrating command writes it to the task's
`external-research.md` path defined in `state.yaml` and passes it — alongside
`research.md` — to the `solution-architect`.

This skill is stateless. It does not read or modify `state.yaml`. It does not
write files. It returns markdown only.

---

## Inputs

The command invoking this skill must supply:

- `task_context` — the spec problem statement and key requirements, or the full
  `spec.md` content. The agent uses this as the lens for every search.
- `stacks[]` — one or more stack identities, one per service involved in the
  task. Each entry is:
  ```yaml
  - service: <service-name>
    language: <e.g. PHP>
    language_version: <e.g. 8.2>
    framework: <e.g. Laravel>
    framework_version: <e.g. 11>
    manifest: <e.g. composer.json>
  ```
- `focus_topics` — (optional) explicit subtopics for the agent to research,
  e.g. `["OAuth2 PKCE flow", "rate-limiting middleware"]`. If unset, the agent
  derives topics from `task_context`.
- `existing_research` — (optional) the current `external-research.md` content
  if this is a refinement pass. Pass to the agent so it can update only the
  stale or missing sections.

If `stacks[]` is empty, return the failure response defined under Failure
Handling — do not invoke the agent. The orchestrating command should populate
the stacks from `forge-service.yaml` before calling this skill.

---

## Step 1 — Resolve Stack Inputs

For each entry in `stacks[]`, verify the required fields are present:

- `service`, `language`, `framework`, `manifest` — required
- `language_version`, `framework_version` — optional but strongly preferred

If a stack entry is missing `language` or `framework`, drop it from the call
and record the omission in the output header (the agent will note it). Do not
fabricate stack values.

If `stacks[]` contains more than one entry, the skill makes a single call to
`external-researcher` and passes the full list — the agent handles multi-stack
research in one document with per-stack sub-headings.

---

## Step 2 — Invoke external-researcher

Spawn a single `external-researcher` agent and pass:

- `task_context` — verbatim
- `stack` — the resolved `stacks[]` from Step 1 (single object if one entry,
  array if multiple)
- `focus_topics` — verbatim if provided, omit otherwise
- `existing_research` — verbatim if provided, omit otherwise

The agent returns one structured markdown document matching the
`external-research.md` template. Do not modify it.

The agent owns the registry choice (Packagist, npm, PyPI, etc.), the source
quality bar, and the recommendation phrasing. This skill does not second-guess
those choices.

---

## Step 3 — Return the Document

Return the agent's markdown response unchanged. The calling command writes it
to the task's `external-research.md` path.

If the agent's response is empty or missing the top-level `# External
Research:` heading, treat it as a failure and return the failure response in
Failure Handling B.

Do not write any files yourself.

---

## Output Contract

The output of this skill is exactly the agent's markdown, which must follow
this top-level shape (sections defined by the `external-researcher` agent):

```markdown
# External Research: <Task Title>

**Task**: …
**Stacks researched**: …
**Focus topics**: …

---

## Stack
## Technology References
## Similar Implementations Studied
## Best Practices
## Recommendations
## Risks & Open Questions
```

All headings must be present even if a section contains `—`.

---

## Rules and Constraints

- **Pass `task_context` verbatim** to the agent. Do not summarise — the agent
  needs the original wording to derive focus topics.
- **Pass the stack identity verbatim.** Do not normalise version strings or
  rename frameworks. The agent uses the exact framework name to find the right
  registry.
- **Do not invoke the agent multiple times for multi-stack tasks.** One call,
  one document. The agent groups its findings per stack.
- **Do not write files.** Return markdown only — the calling command persists.
- **Do not modify `state.yaml`.** The orchestrating command updates state.
- **Do not fetch URLs yourself.** All web access happens inside the agent.
- **Self-contained.** This prompt includes everything needed. Do not assume
  CLAUDE.md or other context is loaded.

---

## Failure Handling

### A — Missing or empty stacks

If `stacks[]` is empty or every entry is missing `language`/`framework`, do
not invoke the agent. Return:

```markdown
# External Research: <Task Title>

**Research could not run:** stack identity is missing or incomplete. Populate
`forge-service.yaml` with the language and framework for each service before
re-running the external-research phase.

---

## Stack

—

## Technology References

—

## Similar Implementations Studied

—

## Best Practices

—

## Recommendations

—

## Risks & Open Questions

- Stack identity missing — research blocked.
```

### B — Agent returned malformed or empty output

If the agent did not respond, returned an empty body, or returned a response
missing the top-level `# External Research:` heading, return the same shape
as Failure Handling A with the message: `**Research could not run:**
external-researcher agent returned an unusable response. Re-run the
external-research phase.`

### C — Agent reports network failure

If the agent itself returns its own failure document (`**Research failed:**`
header), return that document unchanged. The agent's failure handling is
already correct — surfacing it gives the developer the agent's reason.

Never return an empty response. The calling command always expects a
parseable markdown document with all required headings present.
