---
description: Run the verification pipeline (test → analyze → format → code review) for the current phase
argument-hint: [task-id-or-slug] [--test-only | --analyze-only | --format-only | --review-only]
---

# forge:verify

Run the multi-step verification pipeline for the current phase: test, analyze, format, agent code review, and developer approval. Writes the consolidated report to the phase's `VERIFICATION.md` and updates the verification fields in `state.yaml`.

This command wraps the `verification` skill — it does not run test runners or reviewers directly.

---

## Step 1 — Parse Arguments

Split `$ARGUMENTS`. Extract:

- `pipeline_scope` — derived from flags:
  - `--test-only` → `test-only`
  - `--analyze-only` → `analyze-only`
  - `--format-only` → `format-only`
  - `--review-only` → `review-only` (skill input handled in Step 4 — see below)
  - none / multiple → `all` (refuse if multiple flags are passed: `Pick at most one --*-only flag.`)
- `task_arg` — the first non-flag positional token, or empty

---

## Step 2 — Resolve Workspace Root and Task

1. Resolve `workspace_root` via the script:

   ```
   node <plugin_root>/scripts/resolve-workspace-root.js
   ```

   The script prints a single JSON object to stdout. Parse it and hold:

   - `workspace_root` ← `result.workspace_root`
2. Resolve the target task using the same selection logic as `/forge:status`.
3. Hold `state` and `task_dir`.

---

## Step 3 — Validate Phase Execution Position

`/forge:verify` is only meaningful during `phase-execution`. Reject other states with a clear error.

- If `state.status != phase-execution`:
  ```
  Cannot run verification: status is <status>. /forge:verify only runs during phase-execution.
  Run /forge:next until status is phase-execution.
  ```
  Stop.
- If `state.current_phase < 1` or `state.phases[state.current_phase - 1]` does not exist:
  ```
  state.current_phase=<n> has no matching entry in phases[]. Run /forge:plan --regenerate to repair the plan.
  ```
  Stop.

Hold the current phase entry as `phase`. Compute:

- `phase_number = state.current_phase`
- `phase_dir = <task_dir>/phases/<NN>/` (two-digit zero-padded)
- `service_name = phase.service`
- Look up the service in `state.services[]` to get `service.root` (absolute path) and resolve `stack_profile`. Resolution order: `service.stack_profile` if set, else read `<service.root>/forge-service.yaml` `stack` field, else fall back to the global default in `<workspace_root>/.ai-workflow/forge.yaml`.

If `phase_dir` does not exist, create it: `mkdir -p <phase_dir>`.

---

## Step 4 — Compute the diff command

The `code-reviewer` agents need a `diff_command` that produces only this phase's changes. Resolve in this order:

1. If `phase` has a `diff_command` field, use it verbatim.
2. Otherwise, default to `git diff --no-color HEAD --` run from `service.root`. This captures uncommitted changes for the current phase work.
3. Allow the user to override at the prompt only if Step 5 reports an empty diff.

---

## Step 5 — Invoke the verification skill

Call the `verification` skill with these inputs:

- `service_root` ← `<service.root>` (absolute)
- `stack_profile` ← resolved stack profile name
- `phase_dir` ← `<phase_dir>` (absolute)
- `phase_number` ← `<phase_number>`
- `spec_path` ← `<task_dir>/spec.md`
- `research_path` ← `<task_dir>/research.md`
- `diff_command` ← from Step 4
- `pipeline_scope` ← from Step 1 (`all`, `test-only`, `analyze-only`, `format-only`)
- `reviewer_count` ← read from `<workspace_root>/.ai-workflow/forge.yaml` `agents.reviewer_count` (default `2`)

**Special case for `--review-only`**: the skill itself does not have a `review-only` mode. Implement it here by:
1. Skipping the `verification` skill's pipeline step entirely.
2. Reading the existing `VERIFICATION.md` (if any) for the prior pipeline results to embed in the new report.
3. Running only Steps 2–4 of the skill's logic (parallel reviewers + merge + report). To do this in this command without modifying the skill, invoke the skill with `pipeline_scope=all` and discard the script JSON, then keep only the Code Review section. If that proves brittle, fall back to spawning the `code-reviewer` agents directly using the same inputs the skill would pass; the agent prompt is documented in `agents/code-reviewer.md`.

The skill returns a single markdown document (the consolidated verification report). Hold it as `report`.

---

## Step 6 — Persist the report

Write `report` to `<phase_dir>/VERIFICATION.md`. Overwrite any existing file — VERIFICATION.md is regenerated on every run.

---

## Step 7 — Apply state updates from the report

The skill emits a `## State Updates` block in fenced YAML, e.g.:

```yaml
phases[<idx>].verification.test: pass
phases[<idx>].verification.analyze: pass
phases[<idx>].verification.format: pass
phases[<idx>].verification.review: changes-requested
```

For every line in that block, run one `update-state.js` call. The dot-path uses the current phase index `state.current_phase - 1`:

```
node <plugin_root>/scripts/update-state.js "<task-arg>" phases.<idx>.verification.test pass "<workspace_root>"
```

Run the calls sequentially. Do not advance `current_step` here — the developer approval step (Step 8) decides that.

---

## Step 8 — Developer approval gate

Print the report to the developer. Then read the report's `## Next Action` line:

- **Test or analyze failed** → print `Fix the failing step and re-run /forge:verify.` Stop. Do not change `current_step`.
- **Code review status is `changes-requested`** → print `Address review findings, re-run /forge:verify.` Stop. Do not change `current_step`.
- **Everything passed** → ask explicitly:
  ```
  Approve verification for phase <N>? [y/N]
  ```
  - On `y`:
    - Set `current_step` to `verification` (idempotent — usually already there).
    - The pipeline is complete; the developer can now run `/forge:next` to roll over to the next phase.
    - Print: `Verification approved. Run /forge:next to advance to phase <N+1>.`
  - On anything else:
    - Print: `Approval withheld. Re-run /forge:verify --review-only after addressing concerns, or pass --force to /forge:next to skip the gate.`

This command never sets `current_step` past `verification`. Phase rollover is owned by `/forge:next`.

---

## Step 9 — Append a session log entry

Append a single entry to `state.session_log[]` capturing this run:

```
node <plugin_root>/scripts/update-state.js "<task-arg>" 'session_log[]' '{"phase":<N>,"command":"forge:verify","scope":"<pipeline_scope>","at":"<iso-now>"}' "<workspace_root>"
```

Use the `[]` suffix to append, per the script's contract.

---

## Rules and Constraints

- **The skill owns the pipeline.** Never invoke `scripts/verify.js`, test runners, linters, or reviewers directly from this command. The skill handles ordering, retries, and the report shape.
- **Reviewers run in parallel inside the skill.** Do not spawn reviewers from this command.
- **VERIFICATION.md is the single source of truth for a run** and is overwritten each invocation.
- **State is updated only from the `## State Updates` block** in the skill's report. Do not infer updates elsewhere.
- **Approval is explicit.** Never assume approval — always ask.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/verify.md` → plugin root is two levels up). Pass absolute paths to skills, agents, and scripts.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **Skill returns a malformed report (missing `## State Updates` or `## Next Action`)** → write the report so the developer can inspect it, but do not update `state.yaml`. Print: `Verification report malformed; state.yaml unchanged. Re-run /forge:verify or inspect <phase_dir>/VERIFICATION.md.`
- **Service root is not a git repository** → still write the pipeline portion of the report; mark Code Review as `not-run`; print: `<service.root> is not a git repo — code review skipped. Initialize git or supply a custom diff_command in state.yaml.`
- **`update-state.js` fails on a state update line** → continue with the remaining lines, then report all failures at the end. The verification report itself is preserved.
- **No service.root resolvable for the current phase** → stop before invoking the skill: `Phase <N> targets service '<name>' but it has no entry in state.services[] (missing root). Edit state.yaml or update forge-service.yaml.`
