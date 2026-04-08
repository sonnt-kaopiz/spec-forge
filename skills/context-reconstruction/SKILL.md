---
name: context-reconstruction
description: >
  Reconstructs task context when resuming a spec-forge task after a session break.
  Use when "resume task", "continue where I left off", "pick up task",
  or when SessionStart hook detects an active task.
---

# Skill: context-reconstruction

Wraps the `context-reconstructor` agent to produce a compact, structured task
summary the orchestrating command (typically `/forge:resume`, or the
`SessionStart` hook) injects into the developer's view. The agent reads
`state.yaml` and only the documents authorised by its strict resume table,
then returns a summary that fits inside 2000 tokens.

This skill is stateless. It does not read or modify `state.yaml`. It does not
write files. It returns markdown only.

---

## Inputs

The command invoking this skill must supply:

- `state_path` — absolute path to the task's `state.yaml` file (e.g.
  `<service_root>/.spec-forge/<task-id>/state.yaml`).
- `task_root` — absolute path to the directory containing `state.yaml` and
  the per-task documents (`spec.md`, `research.md`, `external-research.md`,
  `architecture.md`, `plan.md`, `phases/`).
- `service_roots` — (optional) absolute paths to the service repositories
  involved in the task. Pass only when the calling command already has them;
  the agent uses them to verify file references inside phase contexts.

If `state_path` or `task_root` are missing, return the failure response in
Failure Handling A — do not invoke the agent.

---

## Step 1 — Verify the State File Exists

Use `Read` to confirm `state_path` exists and is non-empty. If it does not,
return Failure Handling A — there is nothing for the agent to reconstruct
from.

Do not parse or interpret the file here — that is the agent's job. The check
is only to fail fast when the path is wrong.

---

## Step 2 — Invoke context-reconstructor

Spawn a single `context-reconstructor` agent and pass:

- `state_path` — verbatim
- `task_root` — verbatim
- `service_roots` — verbatim if provided, omit otherwise

The agent owns the resume document loading rules and the token-discipline
budget. Do not second-guess which documents it loads — its resume table is
authoritative.

The agent returns a single markdown document with the section structure
defined in its prompt:

```
# Task Resume: <task title>

## Next Action
## Where We Are
## Active Phase  (only when status is phase-execution)
## Key Decisions
## Key Files
## Open Questions / Blockers
## Recent Activity
## Gaps  (only when documents were missing)
```

---

## Step 3 — Verify Token Budget

The agent's contract guarantees the response is under 2000 tokens. Apply a
sanity check before returning: if the response exceeds **2500 tokens** (≈10000
characters of English prose), the agent has overrun its budget. In that case:

1. Do not truncate or rewrite the response yourself — agent output is the
   authoritative summary.
2. Return the response unchanged but prepend a single warning line above the
   `# Task Resume:` heading:
   `**Note:** context-reconstructor exceeded its 2000-token budget — summary may be longer than expected.`

The 2500-token threshold gives the agent reasonable headroom; only flag clear
violations, not borderline cases.

---

## Step 4 — Return the Summary

Return the agent's markdown response (with the optional warning line from
Step 3 prepended). The calling command will inject this directly into the
developer's view.

Do not write files. Do not update `state.yaml`. Do not store the summary
anywhere — it is regenerated on every resume.

---

## Output Contract

The output of this skill is the agent's markdown response, which must contain:

- `# Task Resume: <task title>` heading
- `## Next Action` — exactly one imperative sentence
- `## Where We Are` — 2–4 sentences
- `## Key Decisions` — up to 5 bullets (or `—`)
- `## Key Files` — up to 5 bullets (or `—`)
- `## Open Questions / Blockers` — list or `— none —`

The `## Active Phase`, `## Recent Activity`, and `## Gaps` sections are
conditional — they may be present or absent depending on the task state.

If the agent's response is missing the `# Task Resume:` heading or the
`## Next Action` section, treat it as a failure and return Failure Handling B.

---

## Rules and Constraints

- **One agent call per invocation.** Resume is a fast-path skill — do not
  spawn multiple agents or run them in parallel.
- **Do not load documents yourself.** All file reads happen inside the agent
  so the resume table stays the single source of truth.
- **Do not summarise or paraphrase the agent's output.** The whole point is
  that the developer sees a compact, accurate snapshot — not a summary of a
  summary.
- **Do not update `state.yaml`.** Reading state never mutates it. The
  `SessionStart` hook may append a session log entry, but that is the hook's
  job, not this skill's.
- **Do not write files.** Return markdown only.
- **Pass `state_path` and `task_root` as absolute paths.** The agent's
  Read/Glob tools require absolute paths to stay inside the sandboxed root.
- **Self-contained.** This prompt includes everything needed. Do not assume
  CLAUDE.md or other context is loaded.

---

## Failure Handling

### A — Missing or unreadable state path

If `state_path` is missing, the file does not exist, or it is empty, return
this response without invoking the agent:

```markdown
# Task Resume: <unknown>

**Resume failed:** state file not found at `<state_path>`. Either the task
was never initialised or the path is wrong. Run `/forge:status` to list
known tasks, or re-run `/forge:new` to start a new one.

## Next Action

Verify the task path or list known tasks with `/forge:status`.

## Where We Are

—

## Key Decisions

—

## Key Files

—

## Open Questions / Blockers

— none —
```

### B — Agent returned malformed output

If the agent did not respond, returned an empty body, or returned a response
missing the `# Task Resume:` heading or the `## Next Action` section, return:

```markdown
# Task Resume: <unknown>

**Resume failed:** context-reconstructor agent returned an unusable response.
The task state may still be intact — read `<state_path>` directly to inspect
it, or re-run `/forge:resume` to retry.

## Next Action

Re-run `/forge:resume`. If the failure persists, inspect `<state_path>` directly.

## Where We Are

—

## Key Decisions

—

## Key Files

—

## Open Questions / Blockers

— none —
```

Never return an empty response. The calling command always expects the
`# Task Resume:` document with at least the `Next Action` section filled in.
