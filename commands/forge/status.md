---
description: Display the spec-forge task and phase status dashboard for the current or specified task
argument-hint: [task-id-or-slug]
---

# forge:status

Render a compact dashboard for a spec-forge task: overall status, services, phase progress, current step, and any active blockers. This command is read-only — it never modifies `state.yaml`.

---

## Step 1 — Resolve Workspace Root

Resolve `workspace_root` via the script:

```
node <plugin_root>/scripts/resolve-workspace-root.js
```

The script prints a single JSON object to stdout. Parse it and hold:

- `workspace_root` ← `result.workspace_root`

Tasks live under `<workspace_root>/.ai-workflow/tasks/`.

---

## Step 2 — Resolve Target Task

Decide which task's `state.yaml` to read:

1. **`$ARGUMENTS` is non-empty** → treat it as a task slug, full task ID (`SF-007-add-notifications`), or absolute path. Run:

   ```
   node <plugin_root>/scripts/read-state.js "$ARGUMENTS" "<workspace_root>"
   ```

   The script accepts a slug, a full directory name, an absolute path to a directory, or an absolute path to `state.yaml`. If it errors, report the script's stderr verbatim and stop.

2. **`$ARGUMENTS` is empty** → list every task directory under `<workspace_root>/.ai-workflow/tasks/`. For each, read the `state.yaml` via the script (or directly if the script is unavailable) and collect:
   - `task.id`, `task.title`, `task.slug`, `task.updated_at`
   - `status`
   - `current_phase`, `current_step`
3. Filter out tasks whose `status` is `completed` or `abandoned`. From the remainder:
   - **Exactly one active task** → use it.
   - **Multiple active tasks** → present a numbered menu (most recently updated first) and stop until the developer picks one. Re-invoke this command with their choice.
   - **No active tasks** → fall back to the most recently updated task of any status.
   - **No tasks at all** → report `No spec-forge tasks found in <workspace_root>/.ai-workflow/tasks/. Run /forge:new to start one.` and stop.

Hold the parsed state object as `state`. Hold the task directory as `task_dir`.

---

## Step 3 — Render the Dashboard

Print the dashboard using this exact shape. Replace placeholders with values from `state`. Use `—` for any field that is empty or null.

```
┌──────────────────────────────────────────────────────────────┐
│  <task.id> — <task.title>
│  Slug: <task.slug>            Source: <task.source>
│  Created: <task.created_at>   Updated: <task.updated_at>
└──────────────────────────────────────────────────────────────┘

Status: <status>
Current phase: <current_phase>/<total_phases>   Step: <current_step>

Services
────────
  <service.name>          <service.status>
  ...

Phases
──────
  <symbol> 1. <phase.name>          <phase.status>      [<service>]
       test=<v.test>  analyze=<v.analyze>  format=<v.format>  review=<v.review>
  <symbol> 2. <phase.name>          <phase.status>      [<service>]
  ...

Blockers
────────
  - <blocker.description> (since <blocker.created_at>)
  ...
```

Rules for rendering:

- `<symbol>` is `✓` for completed phases, `▶` for the current phase (the one whose `id == current_phase`), `·` for pending, `✗` for failed, and `~` for skipped.
- `<total_phases>` is the length of `phases[]`. If `phases[]` is empty, write `<current_phase>/—`.
- Show the per-phase verification line **only** for the current phase and any phase with at least one non-null verification field. Use `—` for null fields.
- Render the `Services` block only if `services[]` is non-empty; otherwise omit it.
- Render the `Blockers` block only if `blockers[]` contains at least one unresolved blocker (resolved blockers have `resolved_at != null` and should be hidden).
- Print the absolute `task_dir` on a final line: `Task dir: <task_dir>`.

---

## Step 4 — Suggest the Next Action

After the dashboard, print one short line based on `status`:

| Status | Suggested next action |
|---|---|
| `discovery` | `Next: run /forge:spec to draft the specification.` |
| `spec` | `Next: review spec.md, then run /forge:next to start research.` |
| `codebase-research` | `Next: run /forge:next once research.md is approved.` |
| `external-research` | `Next: run /forge:next once external-research.md is approved.` |
| `architecture` | `Next: review architecture.md and run /forge:next to begin planning.` |
| `planning` | `Next: review plan.md and run /forge:next to start phase execution.` |
| `phase-execution` | `Next: continue phase <current_phase> step <current_step>; run /forge:verify when ready.` |
| `completed` | `Task complete. Nothing to do.` |
| `blocked` | `Blocked. Resolve the blockers above before running /forge:next.` |
| `abandoned` | `Task abandoned. /forge:new to start a fresh one.` |

---

## Rules and Constraints

- **Read-only.** Never call `update-state.js`. Never write any file. Never modify `state.yaml`.
- **Task selection is unambiguous.** Either the user passed an argument, or there is exactly one active task, or the user picks from a menu. Never guess silently.
- **Stay inside `workspace_root`.** Do not read files from elsewhere on disk.
- **Resolve `<plugin_root>` from this command file's location** — it is the directory two levels above this file (`commands/forge/status.md` → plugin root). The Bash tool runs from the user's cwd, so always pass absolute paths to the script.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **`read-state.js` exits non-zero** → print the script's stderr verbatim, then suggest `Run /forge:status with the full task slug, or /forge:new to start one.`
- **`state.yaml` is malformed or missing required fields** → render whatever fields parsed successfully and add a note: `Warning: state.yaml is missing or malformed for <field-list>. Run /forge:resume to attempt repair.`
- **Multiple active tasks and the user did not pick one** → stop after printing the menu. Do not pick one yourself.
