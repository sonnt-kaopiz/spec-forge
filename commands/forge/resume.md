---
description: Resume a spec-forge task from saved state, rebuilding the context summary and showing the next action
argument-hint: [task-id-or-slug]
---

# forge:resume

Continue work on a spec-forge task across sessions. Selects a task, runs the `context-reconstruction` skill to rebuild a compact summary from `state.yaml` plus a small set of phase-relevant documents, prints the summary, and tells the developer what to do next.

This command is mostly read-only. The only write is appending a new entry to `state.session_log[]`.

---

## Step 1 — Parse Arguments

`$ARGUMENTS` is either empty or a single task slug / ID / absolute path. Hold it as `task_arg`.

---

## Step 2 — Resolve Workspace Root

Resolve `workspace_root` via the script:

```
node <plugin_root>/scripts/resolve-workspace-root.js
```

The script prints a single JSON object to stdout. Parse it and hold:

- `workspace_root` ← `result.workspace_root`

Tasks live under `<workspace_root>/.ai-workflow/tasks/`.

---

## Step 3 — Pick the task

### 3a — Explicit task argument

If `task_arg` is set, run:

```
node <plugin_root>/scripts/read-state.js "<task_arg>" "<workspace_root>"
```

If the script exits non-zero, print its stderr and stop.

### 3b — No argument: scan all tasks

If `task_arg` is empty, list every directory under `<workspace_root>/.ai-workflow/tasks/` whose name matches `^SF-\d+-`. For each:

- Read `state.yaml` via `read-state.js` (or directly if needed).
- Collect `task.id`, `task.title`, `task.slug`, `task.updated_at`, `status`, `current_phase`, `current_step`.

Sort the collected list by `task.updated_at` descending.

Filter to **active** tasks: status not in `{completed, abandoned}`.

| Active count | Action |
|---|---|
| 0 active, ≥ 1 total | Print the most recent task with status. Ask: `Resume <task.id> (<status>)? [y/N]`. On `y`, use it. On anything else, stop. |
| Exactly 1 | Use it. |
| 2+ | Print a numbered menu (most recent first), each row showing `<id>  <status>  phase=<n>/<total>  <title>`. Ask: `Pick a task [1-N]:`. Use the chosen one. |
| 0 total | `No spec-forge tasks found in <workspace_root>/.ai-workflow/tasks/. Run /forge:new to start one.` Stop. |

Hold the parsed `state` and the absolute `task_dir`. Compute `state_path = <task_dir>/state.yaml`.

---

## Step 4 — Invoke the context-reconstruction skill

Call the `context-reconstruction` skill with these inputs:

- `state_path` ← absolute path to `state.yaml`
- `task_root` ← absolute `task_dir`
- `service_roots` ← list of absolute `service.root` values from `state.services[]` (omit if empty)

The skill spawns the `context-reconstructor` agent and returns a single markdown document beginning with `# Task Resume:`. Hold it as `summary`.

The skill enforces a 2000-token budget. If it returns a budget-warning prefix line, keep it.

---

## Step 5 — Render the summary

Print the entire `summary` to the developer **as-is**. Do not paraphrase, trim, or summarise. The skill is purpose-built to fit inside the developer's context window.

After the summary, print one banner line:

```
Task dir: <task_dir>
```

---

## Step 6 — Suggest the next concrete command

The summary's `## Next Action` section tells the developer what to do, but they may also want a concrete slash command to run. Map `state.status` to a suggested command and print it on a single line below the summary:

| Status | Suggested next command |
|---|---|
| `discovery` | `/forge:spec` |
| `spec` | `/forge:spec --interactive` to refine, then `/forge:next` |
| `codebase-research` | `/forge:next` once `research.md` is approved |
| `external-research` | `/forge:research` to refresh, then `/forge:next` |
| `architecture` | `/forge:next` after architecture approval |
| `planning` | `/forge:plan` to view, then `/forge:next` |
| `phase-execution` | depends on `current_step`: `discussion`/`planning`/`implementation` → keep working; `verification` → `/forge:verify` |
| `completed` | `/forge:status` (no work needed) |
| `blocked` | `/forge:status` to see blockers; resolve them; `/forge:next --force` if appropriate |
| `abandoned` | `/forge:new` to start a new task |

Format:
```
Suggested next: <command>
```

---

## Step 7 — Append a session log entry

Record this resume in `state.session_log[]`:

```
node <plugin_root>/scripts/update-state.js "<task-arg>" 'session_log[]' '{"command":"forge:resume","at":"<iso-now>","status_at_resume":"<state.status>","phase":<state.current_phase>}' "<workspace_root>"
```

If the call fails, print the stderr but do not surface it as a hard error — the resume itself already succeeded.

---

## Rules and Constraints

- **Skill owns the summary.** Do not load documents directly in this command — the skill's resume table is the single source of truth for which documents are read.
- **Print the summary verbatim.** Never paraphrase or compress it. The whole point of the skill is to fit inside the developer's context.
- **No silent task selection.** Either the user passed an argument, or there is exactly one active task, or the user picks from a menu.
- **State changes are limited to a session_log append.** This command never updates `status`, `current_phase`, `current_step`, or any phase field.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/resume.md` → plugin root is two levels up). Pass absolute paths.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **Skill returns the `Resume failed:` document** → print it verbatim and stop (the document already explains what to do).
- **`read-state.js` exits non-zero on the explicit task argument** → print stderr and stop. Do not fall back to scanning.
- **`state.yaml` exists but is unparseable** → print: `state.yaml at <state_path> could not be parsed. Open it manually or run /forge:status to diagnose.` Stop.
- **No tasks found** → already handled in Step 3b.
- **`update-state.js` fails on the session_log append** → ignore and continue.
