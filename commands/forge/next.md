---
description: Advance the spec-forge workflow to the next phase, step, or status transition
argument-hint: [task-id-or-slug] [--force]
---

# forge:next

Advance a spec-forge task to its next workflow position. The exact action depends on `state.status`:

| Status | Action of /forge:next |
|---|---|
| `discovery` | Transition to `spec` and remind the developer to run `/forge:spec`. |
| `spec` | Transition to `codebase-research`. |
| `codebase-research` | Transition to `external-research`. |
| `external-research` | Transition to `architecture`. |
| `architecture` | Transition to `planning`. |
| `planning` | Transition to `phase-execution`, set `current_phase=1`, `current_step=discussion`. |
| `phase-execution` | Advance step within the current phase, or roll over to the next phase. |
| `completed` | Print "task complete" and stop. |
| `blocked` / `abandoned` | Refuse unless `--force` is passed. |

This command modifies `state.yaml` via `scripts/update-state.js`. It does not run any agent or skill — it is a state machine driver.

---

## Step 1 — Parse Arguments

Split `$ARGUMENTS`. Extract:

- `force` — `true` if any token is `--force`, otherwise `false`
- `task_arg` — the first non-flag positional token, or empty

---

## Step 2 — Resolve Workspace Root and Task

1. Resolve `workspace_root`:
   - If `forge-service.yaml` exists in cwd, read its `workspace_root` field.
   - Otherwise use cwd.
2. Resolve the target task using the same selection logic as `/forge:status` (single active task by default; menu if many; explicit slug/id if `task_arg` is set).
3. Hold the parsed `state` object and the absolute `task_dir`.

---

## Step 3 — Pre-Transition Guards

Apply the following checks before changing any state. Each guard is bypassed only when `force == true`.

### 3a — Refuse on terminal/abnormal states

- If `state.status == completed`: print `Task <task.id> is already complete.` and stop.
- If `state.status == abandoned`: print `Task <task.id> is abandoned. Use /forge:resume or /forge:new instead.` and stop unless `force`.
- If `state.status == blocked`:
  - List unresolved blockers (those with `resolved_at == null`).
  - Print `Task is blocked by the items above. Resolve them and re-run, or pass --force.`
  - Stop unless `force`.

### 3b — Verification gate (phase-execution only)

When `state.status == phase-execution`:

- Find the current phase entry: `state.phases[state.current_phase - 1]`.
- If `state.current_step != "verification"`:
  - Without `--force`, print: `Phase <current_phase> is at step '<current_step>'. Run the work for this step before advancing. Pass --force to skip ahead.` Stop.
  - With `--force`, continue.
- If `state.current_step == "verification"` and any of `phase.verification.{test, analyze, format}` is `null`, `fail`, or `changes-requested`:
  - Without `--force`, print the failing/missing fields and: `Verification incomplete. Run /forge:verify, then re-run /forge:next.` Stop.
  - With `--force`, continue.

### 3c — Document existence checks

For non-execution status transitions, verify the upstream document exists before allowing the transition.

| Current status | Required document before /forge:next |
|---|---|
| `spec` | `<task_dir>/spec.md` non-empty |
| `codebase-research` | `<task_dir>/research.md` non-empty |
| `external-research` | `<task_dir>/external-research.md` non-empty |
| `architecture` | `<task_dir>/architecture.md` non-empty |
| `planning` | `<task_dir>/plan.md` non-empty AND `state.phases[]` non-empty |

If a required document is missing, without `--force` print:
```
Cannot advance from <status>: <missing-document> is missing or empty.
Run the appropriate /forge:<step> command first, or pass --force to skip the gate.
```
Stop.

---

## Step 4 — Compute the Transition

Based on the current `state.status` and `state.current_step`, decide what to update.

### 4a — Linear status transitions

For statuses other than `phase-execution`, the transition is a single status change.

| From | To | Additional state changes |
|---|---|---|
| `discovery` | `spec` | — |
| `spec` | `codebase-research` | — |
| `codebase-research` | `external-research` | — |
| `external-research` | `architecture` | — |
| `architecture` | `planning` | — |
| `planning` | `phase-execution` | `current_phase=1`, `current_step=discussion`, `phases[0].status=in-progress`, `phases[0].started_at=<now>` |

### 4b — Phase-execution step transitions

When `state.status == phase-execution`, advance within or across phases.

Current step → next step within the same phase:

- `discussion` → `planning`
- `planning` → `implementation`
- `implementation` → `verification`
- `verification` → roll over (see below)

**Roll over** (current step is `verification` and the verification gate in 3b passed):

1. Mark the current phase complete:
   - `phases[<idx>].status = completed`
   - `phases[<idx>].completed_at = <now>`
2. Write `<task_dir>/phases/<NN>/RESULT.md` from the `templates/phase-result.md` template if it does not exist. Substitute `{{PHASE_NUM}}`, `{{PHASE_NAME}}`, `{{TASK_TITLE}}`, `{{TASK_ID}}`, `{{SERVICE_NAME}}`, `{{COMPLETED_AT}}`. Do not overwrite an existing RESULT.md — if present, leave it alone.
3. Determine the next phase index `next_idx = state.current_phase` (1-based, so this points at the next entry).
4. **If `next_idx > state.phases.length`** → all phases done:
   - Set `status = completed`.
   - Print the completion banner (Step 5).
   - Stop.
5. **Otherwise**:
   - Set `current_phase = next_idx + 1` (advance the 1-based number to point at the next phase).
   - Wait — clarify the index math. `state.current_phase` is 1-based. The phase that just finished was index `state.current_phase - 1` in the array. The next phase is array index `state.current_phase`, which corresponds to 1-based number `state.current_phase + 1`. Set `current_phase = state.current_phase + 1`.
   - Set `current_step = discussion`.
   - Mark the new phase: `phases[<new-idx>].status = in-progress`, `phases[<new-idx>].started_at = <now>`.
   - Generate `<task_dir>/phases/<NN>/CONTEXT.md` for the new phase if it does not exist. Source: combine `<task_dir>/plan.md` (the new phase's section), `<task_dir>/architecture.md`, and the previous phase's `RESULT.md` (if present). Use `templates/phase-context.md` as the structural template. If the file already exists (e.g. it was generated by `/forge:plan --regenerate`), leave it alone.

---

## Step 5 — Apply State Updates

For every change computed in Step 4, run one `update-state.js` invocation. Each call signature:

```
node <plugin_root>/scripts/update-state.js "<task-arg>" <field.path> <value> "<workspace_root>"
```

Examples:
- `node .../update-state.js SF-007 status phase-execution /abs/workspace`
- `node .../update-state.js SF-007 current_phase 2 /abs/workspace`
- `node .../update-state.js SF-007 phases.0.status completed /abs/workspace`
- `node .../update-state.js SF-007 phases.0.completed_at "2026-04-08T12:34:56Z" /abs/workspace`

Run the calls **sequentially**. If any call exits non-zero, stop and report the failure — partial updates are recoverable because each call rewrites `state.yaml` atomically.

The current ISO 8601 timestamp can be obtained via `date -u +%Y-%m-%dT%H:%M:%SZ` in Bash.

---

## Step 6 — Report the Result

Print a short summary of what changed, then a one-line "what to do next" hint.

For a non-execution transition:
```
<task.id>: <old-status> → <new-status>

Next: <suggested command>
```

Suggested next command per new status:

| New status | Suggested next |
|---|---|
| `spec` | `/forge:spec` |
| `codebase-research` | re-run `/forge:next` after research is reviewed (the orchestrator runs the skill) |
| `external-research` | re-run `/forge:next` after external research is reviewed |
| `architecture` | re-run `/forge:next` after architecture is approved |
| `planning` | `/forge:plan` to view, then `/forge:next` |
| `phase-execution` | `/forge:status` to see phase 1 |

For a phase rollover within `phase-execution`:
```
<task.id>: phase <old> (<old-name>) → phase <new> (<new-name>)
Step reset to discussion.
RESULT.md written to phases/<NN>/RESULT.md
CONTEXT.md ready at phases/<MM>/CONTEXT.md

Next: /forge:status to see phase <new>.
```

For a step advance within a phase:
```
<task.id>: phase <N> step <old-step> → <new-step>
```

For task completion:
```
✓ <task.id>: <task.title>
All phases verified. Task marked complete.
```

---

## Rules and Constraints

- **State transitions only.** This command never spawns a research, spec, planner, architect, reviewer, or verification agent — it only walks the state machine. Use `/forge:spec`, `/forge:research`, `/forge:plan`, `/forge:verify`, etc. for the actual work.
- **`--force` is the escape hatch.** Without it, every guard in Step 3 is enforced. Pass `--force` only when the developer accepts the consequences.
- **One field per `update-state.js` call.** The script updates a single field at a time. Do not try to write multiple fields with one invocation.
- **Atomic writes.** `update-state.js` rewrites `state.yaml` atomically; partial failures leave the previous state intact.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/next.md` → plugin root is two levels up). Pass absolute paths to scripts.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **No active task and the user passed nothing** → print `No active spec-forge task found. Pass a task slug or run /forge:new.` and stop.
- **`update-state.js` fails mid-sequence** → stop, print which field failed, print the script's stderr, and tell the developer to re-run after inspecting `state.yaml`.
- **`templates/phase-result.md` or `templates/phase-context.md` is missing** → still update `state.yaml`, but skip the file write and print a warning: `Template missing — RESULT.md/CONTEXT.md not generated. Edit the phase directory manually.`
- **`state.yaml` lacks `phases[]` while transitioning to phase-execution** → without `--force`, refuse with `Plan has no phases. Run /forge:plan --regenerate first.`
