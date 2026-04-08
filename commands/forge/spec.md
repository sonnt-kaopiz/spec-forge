---
description: Generate a fresh spec.md for a task, or refine an existing one from a new source
argument-hint: [task-id-or-slug] [--from-jira KEY | --from-linear KEY | --from-github NUM | --interactive]
---

# forge:spec

Generate or refine the `spec.md` for a spec-forge task. Wraps the `spec-generation` skill, which detects the source type, runs the `spec-writer` agent, and returns the spec body plus a clarifying questions block.

This command writes `spec.md` and may update `state.yaml > status` and `state.yaml > task.source`. It does not run any other phase.

---

## Step 1 — Parse Arguments

Split `$ARGUMENTS`. Extract:

- `source_hint` and `source_value` from flags:
  - `--from-jira <KEY>` → `source_hint=jira`, `source_value=<KEY>`
  - `--from-linear <KEY>` → `source_hint=linear`, `source_value=<KEY>`
  - `--from-github <NUM>` → `source_hint=github`, `source_value=<NUM>`
  - `--interactive` → `source_hint=interactive`, `source_value=null`
  - none → `source_hint=null`, `source_value=null`
- `task_arg` — the first non-flag positional token, or empty

Reject argument combinations that pass more than one `--from-*` or `--interactive` flag at once: `Pick at most one source flag.`

---

## Step 2 — Resolve Workspace Root and Task

1. Resolve `workspace_root`:
   - If `forge-service.yaml` exists in cwd, read its `workspace_root` field.
   - Otherwise use cwd.
2. Resolve the target task using the same selection logic as `/forge:status` (single active task by default, menu if many, explicit slug if `task_arg` set).
3. Hold `state` and `task_dir`.

---

## Step 3 — Decide Mode

Read `<task_dir>/spec.md` if it exists. The mode determines how the skill is called.

| Condition | Mode |
|---|---|
| `spec.md` is missing or only contains the empty template (no `[FR-N]` items) | `draft` |
| `spec.md` has content AND user passed `--interactive` | `refine` |
| `spec.md` has content AND user passed any other source flag | `refine` |
| `spec.md` has content AND no flags | ask the developer: `spec.md already exists. (e)dit / (r)egenerate / (v)alidate?` then map `e/r/v` → `refine`/`draft`/`validate` |

If the developer answers anything else, stop without running.

Hold `mode` and the `existing_spec` content (if any).

---

## Step 4 — Gather Source Input

The skill needs `task_input`. How it is gathered depends on the source:

### 4a — `jira:<KEY>` / `linear:<KEY>`

- Print: `Paste the Jira/Linear issue body for <KEY> (end with a single line containing only "EOF"):`
- Read the developer's input until the `EOF` sentinel.
- Hold the input as `task_input`.
- Do not attempt to fetch the issue from a URL — Spec-Forge has no credentials.

### 4b — `github:<NUM>`

- If a `gh` CLI is available, attempt to fetch the issue/PR body:
  ```
  gh issue view <NUM> --json title,body --jq '.title + "\n\n" + .body'
  ```
- If `gh` exits non-zero or is not installed, fall back to the same paste-and-EOF prompt as 4a.

### 4c — `interactive`

- Run an interactive Q&A round. Ask the developer one question at a time until you have enough material to draft (or refine) the spec. Track the Q&A as a transcript.
- Format the transcript using alternating `Q:` and `A:` lines — this lets the skill detect `interactive` source automatically.
- Hold the transcript as `task_input`.

### 4d — `manual` (no source flag, no existing spec)

- Print: `Describe the task in your own words (end with a single line containing only "EOF"):`
- Read until `EOF`.
- Hold the input as `task_input`.

### 4e — `manual` refine (no source flag, existing spec)

- Print: `Describe what to change in spec.md (end with a single line containing only "EOF"):`
- Read until `EOF`.
- Hold the input as `task_input`.

If `task_input` is empty AND `existing_spec` is empty, stop with: `No input to draft from. Re-run /forge:spec with content.`

---

## Step 5 — Invoke the spec-generation skill

Call the `spec-generation` skill with these inputs:

- `task_input` ← from Step 4 (verbatim, do not summarise)
- `task_id` ← `state.task.id`
- `task_slug` ← `state.task.slug`
- `source_hint` ← derived from Step 1:
  - `jira:<KEY>` if `source_hint=jira`
  - `linear:<KEY>` if `source_hint=linear`
  - `github:<NUM>` if `source_hint=github`
  - `interactive` if `source_hint=interactive`
  - omit otherwise (let the skill detect)
- `existing_spec` ← from Step 3 (omit if empty)
- `mode_override` ← from Step 3 (omit if not set)

The skill returns one response containing two markdown documents separated by `---SPEC-END---`:

1. Full `spec.md` body (everything before the marker)
2. Clarifying Questions block (everything after the marker)

---

## Step 6 — Persist the spec

1. Split the response on `---SPEC-END---`.
2. Write the spec body to `<task_dir>/spec.md`. Overwrite any existing file.
3. Hold the questions block as `questions` for the next step.

---

## Step 7 — Update state.yaml

Run these `update-state.js` calls:

- If `source_hint` is set, update `task.source`:
  ```
  node <plugin_root>/scripts/update-state.js "<task-arg>" task.source "<source>:<value>" "<workspace_root>"
  ```
  (For `interactive`, write `interactive`. For manual mode without a flag, leave the field alone.)
- If `state.status == discovery`, transition to `spec`:
  ```
  node <plugin_root>/scripts/update-state.js "<task-arg>" status spec "<workspace_root>"
  ```
- Otherwise leave `status` alone — the developer may be refining a spec mid-workflow.

---

## Step 8 — Show the spec and clarifying questions

Print to the developer:

```
Wrote <task_dir>/spec.md

──── spec.md ────
<full spec body>
─────────────────

<questions block>

Next:
  - Answer the questions above by re-running /forge:spec --interactive (or --from-* with new content).
  - When the spec is correct, run /forge:next to enter the codebase-research phase.
```

Do not summarise or paraphrase the spec. Always show the full body so the developer reviews exactly what was written.

---

## Rules and Constraints

- **The skill owns the spec content.** Never edit the spec body in this command. If the developer wants tweaks, re-run with `--interactive`.
- **`task_input` is verbatim.** Pass exactly what the developer typed; never summarise or trim.
- **No silent overwrites.** Show the spec body after writing so the developer can confirm the change.
- **`/forge:spec` writes `spec.md` and may update `task.source` and `status`.** It never modifies `phases[]`, `current_phase`, `current_step`, `services[]`, or any other state field.
- **No credentials.** Never attempt to fetch Jira or Linear issues over the network. GitHub is allowed via `gh` only because it inherits the user's local credentials.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/spec.md` → plugin root is two levels up). Pass absolute paths.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **Skill returns a malformed response (no `---SPEC-END---` marker)** → write nothing, print: `Spec generation failed: skill returned malformed output. Re-run /forge:spec.`
- **Skill returns a draft with `Status: Cannot draft — no input provided`** → do not overwrite the existing `spec.md`. Print the questions block so the developer knows what to supply, then stop.
- **`gh` exits non-zero on `--from-github`** → fall back to the paste-and-EOF prompt; print one warning line: `gh fetch failed, paste the issue body manually.`
- **`update-state.js` fails on `task.source` or `status`** → spec.md is already written; print the script's stderr and tell the developer the spec is on disk but state may need manual repair.
