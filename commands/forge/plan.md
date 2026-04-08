---
description: View the current implementation plan, or regenerate it from the approved architecture
argument-hint: [task-id-or-slug] [--regenerate]
---

# forge:plan

Display the implementation plan for a spec-forge task. With `--regenerate`, re-run the `phase-planner` agent against the current `architecture.md` to produce a fresh `plan.md` and per-phase `CONTEXT.md` skeletons. Without it, the command is read-only.

---

## Step 1 — Parse Arguments

Split `$ARGUMENTS` on whitespace. Extract:

- `regenerate` — `true` if any token is `--regenerate`, otherwise `false`
- `task_arg` — the first positional token that is not a flag, or empty

---

## Step 2 — Resolve Workspace Root and Task

1. Resolve `workspace_root`:
   - If `forge-service.yaml` exists in the current working directory, read its `workspace_root` field.
   - Otherwise use the current working directory.
2. Resolve the target task using the same rules as `/forge:status`:
   - If `task_arg` is set, pass it to `node <plugin_root>/scripts/read-state.js "<task_arg>" "<workspace_root>"`.
   - Otherwise, list `<workspace_root>/.ai-workflow/tasks/`, prefer the single active task, and surface a menu when there are several.

Hold the result as `state` (the parsed object) and `task_dir` (the task directory containing `state.yaml`, `architecture.md`, `plan.md`, and `phases/`).

---

## Step 3 — View Mode (default)

If `regenerate` is `false`:

1. Read `<task_dir>/plan.md`. If the file does not exist or its `Phase Overview` table is empty, print:
   ```
   No plan yet for <task.id>. Run /forge:plan --regenerate after architecture.md is approved.
   ```
   and stop.
2. Print the file's contents to the developer **as-is** — do not paraphrase or summarise.
3. After the plan body, print a compact phase-status table built from `state.phases[]`:

   ```
   Phase Status (from state.yaml)
   ──────────────────────────────
   <symbol> 1. <phases[0].name>      <phases[0].status>      [<service>]
   <symbol> 2. <phases[1].name>      <phases[1].status>      [<service>]
   ...
   ```

   Use the same `<symbol>` mapping as `/forge:status` (`✓`, `▶`, `·`, `✗`, `~`).
4. Print one suggestion line:
   - If at least one phase is `pending` and `state.status == phase-execution` → `Next: continue phase <current_phase> via /forge:next or /forge:verify.`
   - If `state.status` is `planning` → `Next: review plan.md and run /forge:next to begin phase execution.`
   - If every phase is `completed` → `All phases complete. Run /forge:next to mark the task done.`

Stop here. View mode never modifies state or files.

---

## Step 4 — Regenerate Mode

If `regenerate` is `true`, do the following.

### 4a — Verify prerequisites

- Confirm `<task_dir>/architecture.md` exists and is non-empty. If missing, print:
  ```
  Cannot regenerate plan: <task_dir>/architecture.md is missing or empty.
  Run /forge:new through the architecture phase first.
  ```
  and stop.
- Confirm `state.status` is one of `architecture`, `planning`, or `phase-execution`. If it is earlier (e.g. `discovery`, `spec`, `codebase-research`, `external-research`), print:
  ```
  Cannot regenerate plan from status=<status>. The architecture phase must complete first.
  ```
  and stop.

### 4b — Warn before overwriting an in-progress plan

If `state.status == phase-execution` and at least one phase has status `in-progress` or `completed`:

- Show the developer the list of completed/in-progress phases.
- Ask: `Regenerating the plan will replace plan.md and may invalidate phase context for completed phases. Continue? [y/N]`
- Stop unless the developer answers `y`.

### 4c — Spawn the phase-planner agent

Read these files **once** before spawning, and pass them as strings:

- `architecture` ← `<task_dir>/architecture.md`
- `spec` ← `<task_dir>/spec.md`
- `research` ← `<task_dir>/research.md`
- `services[]` ← from `state.services` (one entry per service: `{ name, root, stack_profile }`)
- `existing_plan` ← `<task_dir>/plan.md` content if the file exists, otherwise omit

Spawn one `phase-planner` agent with the inputs above.

The agent returns a single response containing:

1. The full `plan.md` body
2. The literal marker line `---PLAN-END---`
3. One `---CONTEXT-PHASE-N---` block per phase, each followed by the CONTEXT.md skeleton

### 4d — Persist the plan and per-phase context

1. Split the agent response on `---PLAN-END---`.
2. Write the plan body to `<task_dir>/plan.md`. Overwrite any existing file.
3. Split the remainder on `---CONTEXT-PHASE-` markers. For each phase block:
   - Determine the phase number `N` from the marker line (`---CONTEXT-PHASE-3---` → `3`).
   - Ensure `<task_dir>/phases/<NN>/` exists (`mkdir -p`, two-digit zero-padded `NN`).
   - Write the block body to `<task_dir>/phases/<NN>/CONTEXT.md`. Overwrite if it exists.
4. Update `state.yaml` to reflect the regeneration. Use one `update-state.js` call per change:

   - If `state.status` is `architecture` → set `status` to `planning`.
   - Replace `phases` with the new list parsed from the agent's `Phase Overview` table. For each new phase, the entry shape is:
     ```yaml
     id: <N>
     name: "<phase name>"
     status: pending
     service: "<service>"
     started_at: null
     completed_at: null
     verification:
       test: null
       analyze: null
       format: null
       review: null
     ```
   - Set `current_phase` to `1` and `current_step` to `discussion` only if the previous status was `architecture`. If the task was already in `phase-execution`, keep both fields and warn the developer that any in-progress phase numbering may have shifted.

   The `update-state.js` script signature:
   ```
   node <plugin_root>/scripts/update-state.js <task-arg> <field.path> <value> [workspace_root]
   ```
   Use `phases` as the field path and pass the full new array as a JSON string in the value argument.

### 4e — Show the result

Print the regenerated plan to the developer (the same output as Step 3 view mode), prefixed with:
```
Regenerated plan.md for <task.id>. <N> phases produced.
CONTEXT.md skeletons written to <task_dir>/phases/01/, .../<NN>/.
```

Then ask: `Approve this plan? [y/N]`

- On `y`: if the previous status was `architecture`, leave `state.status == planning` (the developer will run `/forge:next` to enter `phase-execution`). Print: `Plan approved. Run /forge:next to start phase 1.`
- On anything else: leave `state.status` as set by Step 4d, and print: `Plan saved but not approved. Re-run /forge:plan --regenerate to revise, or edit plan.md manually.`

---

## Rules and Constraints

- **View mode is read-only.** Never call `update-state.js` and never write any file in Step 3.
- **Regenerate mode writes files.** It overwrites `plan.md` and per-phase `CONTEXT.md` skeletons; it never deletes phase directories that are no longer in the new plan — those are left in place for audit and the developer's judgment.
- **One agent call per regeneration.** Do not run the planner in parallel.
- **Pass full document contents to the agent.** Do not summarise `architecture.md`, `spec.md`, or `research.md`.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/plan.md` → plugin root is two levels up). Always pass absolute paths to scripts and the agent.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **`phase-planner` returns no `---PLAN-END---` marker** → do not write any files. Print: `Plan regeneration failed: phase-planner returned malformed output. Re-run /forge:plan --regenerate.`
- **`phase-planner` returns a plan with an empty `Phase Overview` table** → write the file (so the developer can see the agent's failure note) but skip the CONTEXT.md split and the `state.yaml` update. Print: `Planner returned an empty plan — see plan.md for the failure reason. state.yaml not changed.`
- **`update-state.js` exits non-zero on any call** → stop, print the script's stderr, and warn that `plan.md` was written but `state.yaml` may be inconsistent.
- **`task_arg` is set but the script cannot resolve it** → print the script's stderr and stop. Do not fall back to scanning.
