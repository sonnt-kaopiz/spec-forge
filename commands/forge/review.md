---
description: Run parallel code-reviewer agents on the current phase's diff and merge their findings
argument-hint: [task-id-or-slug] [--diff-only | --full]
---

# forge:review

Spawn 2–3 `code-reviewer` agents in parallel against the current phase's diff, each with a different focus area, and merge their findings into a single review block. This command is a lighter, agent-only sibling of `/forge:verify` — use it when test/analyze/format already pass and you only want a fresh review pass.

This command does **not** run the test/analyze/format pipeline. It does not modify `state.yaml > phases[N].verification.review` unless the developer explicitly approves the merged result.

---

## Step 1 — Parse Arguments

Split `$ARGUMENTS`. Extract:

- `scope` — `diff-only` if `--diff-only` is passed, `full` if `--full` is passed, otherwise default to `diff-only`. Reject combinations: `Pick at most one of --diff-only / --full.`
- `task_arg` — the first non-flag positional token, or empty

`--diff-only` reviews only the changes in the current phase's diff. `--full` reviews the diff plus its immediate dependencies (the agent's normal default lens — wider, but still bounded by the phase).

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

## Step 3 — Validate phase position

- If `state.status != phase-execution`:
  ```
  /forge:review only runs during phase-execution. Current status: <status>.
  ```
  Stop.
- Resolve the current phase entry: `phase = state.phases[state.current_phase - 1]`.
- Resolve the service: look up `phase.service` in `state.services[]` to get `service.root` and `service.stack_profile`.
- Compute `phase_dir = <task_dir>/phases/<NN>/`. If `phase_dir/CONTEXT.md` does not exist, warn but continue with an empty context string.

---

## Step 4 — Resolve reviewer count and focus areas

Read `<workspace_root>/.ai-workflow/forge.yaml > agents.reviewer_count` (default `2`). Allowed values: `2` or `3`.

Focus area assignment:

| `reviewer_count` | Focus areas |
|---|---|
| `2` | `correctness`, `conventions` |
| `3` | `correctness`, `conventions`, `security` |

If the developer wants a different mix (e.g. add `tests`), they can edit `.ai-workflow/forge.yaml > agents.reviewer_count` or run multiple `/forge:review` invocations — this command does not take a `--focus` flag yet.

---

## Step 5 — Compute the diff command

Resolve in this order:

1. If `phase` has a `diff_command` field, use it.
2. Otherwise, default to `git diff --no-color HEAD --` for `--diff-only`, or `git diff --no-color HEAD~1..HEAD --` for `--full` (one commit back, picks up immediate dependencies).
3. Run the resolved command via Bash from `service.root` to confirm it produces output. If the diff is empty:
   ```
   No diff to review for phase <N>. Make changes first, or pass --full to widen the diff scope.
   ```
   Stop.

---

## Step 6 — Read context files once

Read each of these files exactly once and hold the content as a string:

- `phase_context` ← `<phase_dir>/CONTEXT.md` (empty string if missing)
- `spec` ← `<task_dir>/spec.md`
- `research` ← `<task_dir>/research.md`

Pass the same strings to every reviewer — do not re-read per agent.

---

## Step 7 — Spawn reviewers in parallel

Spawn `reviewer_count` `code-reviewer` agents **simultaneously**. For each agent, pass:

- `service_root` ← `service.root` (absolute)
- `stack_profile` ← `service.stack_profile`
- `diff_command` ← from Step 5
- `phase_context` ← from Step 6
- `spec` ← from Step 6
- `research` ← from Step 6
- `focus_area` ← assigned per Step 4

Collect all responses as `reviewer_outputs[]`, one entry per `focus_area`.

If a reviewer returns an unparseable response, drop it from the merge and note the gap in the consolidated report.

---

## Step 8 — Merge findings

Merge the parallel reviews using these rules (the same rules used by the `verification` skill):

| Section | Strategy |
|---|---|
| **Summary** | Concatenate each reviewer's Summary line, prefixed with `[<focus>]`. |
| **Critical** | Union, de-duplicate on `file:line`. Keep the longer description; append the other reviewer's `focus` in parentheses. |
| **Important** | Union, de-duplicate on `file:line`. |
| **Minor** | Union, capped at 3 — prefer findings cited by more than one reviewer. |
| **Acceptance Criteria Coverage** | Take from `correctness` reviewer. Fall back to the first reviewer that produced an AC table. |
| **Confidence Notes** | Concatenate verbatim, preserving each reviewer's `focus` label. Omit if all reviewers omitted it. |

Determine `review_status`:

- `changes-requested` if there is at least one Critical or Important finding after de-duplication.
- `approved` if there are none.

---

## Step 9 — Print the merged report

Print the merged review to the developer in this exact shape:

```markdown
# Code Review — Phase <N>: <phase.name>

**Service**: <service.name>
**Stack**: <service.stack_profile>
**Reviewers**: <comma-separated focus areas>
**Diff**: `<diff_command>`
**Status**: <approved | changes-requested>

---

## Summary

- [correctness] <reviewer summary>
- [conventions] <reviewer summary>
- [security] <reviewer summary>   <!-- only if 3 reviewers -->

---

## Critical

<merged critical findings — "— none —" if empty>

---

## Important

<merged important findings — "— none —" if empty>

---

## Minor

<up to 3 minor findings — "— none —" if empty>

---

## Acceptance Criteria Coverage

- **AC-N**: <satisfied | partially | not satisfied | not in scope> — <evidence>

---

## Confidence Notes

<optional, omit if all reviewers omitted it>
```

---

## Step 10 — Optional state update

If `review_status == approved`, ask the developer:

```
Record this review as the phase's approved review in state.yaml? [y/N]
```

- On `y`: run
  ```
  node <plugin_root>/scripts/update-state.js "<task-arg>" phases.<idx>.verification.review approved "<workspace_root>"
  ```
  where `<idx> = state.current_phase - 1`. Print: `Recorded review=approved for phase <N>. Run /forge:next when ready.`
- On anything else: do not update state. Print: `Review printed only — state.yaml unchanged.`

If `review_status == changes-requested`, never update state. Print: `Address the findings above, then re-run /forge:review or /forge:verify.`

---

## Rules and Constraints

- **Parallel spawn.** Reviewers must launch simultaneously. Sequential launches double latency for no gain.
- **Read context files once.** Pass the same string to every reviewer.
- **Stay in the diff and its immediate dependencies.** Reviewers are scoped per their own prompt — do not widen the lens here.
- **Confidence threshold lives inside the agent.** Never relax it from this command.
- **State updates are explicit.** Never write `phases[N].verification.review` without an affirmative answer from the developer.
- **`/forge:review` does NOT touch `phases[N].verification.{test, analyze, format}`** — those are owned by `/forge:verify`.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/review.md` → plugin root is two levels up). Pass absolute paths.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **All reviewers fail or return unparseable responses** → print the merged report with `Status: not-run`, every severity section as `— none —`, and `**Reviewer error:** all code-reviewer agents failed. Manual review required.` Do not update state.
- **`git diff` returns empty** → stop before spawning reviewers.
- **`update-state.js` fails when recording approval** → print stderr; the merged report is already on screen, so the developer can re-run the update by hand.
- **`service.root` is not a git repo** → stop with `<service.root> is not a git repository — cannot compute diff.`
