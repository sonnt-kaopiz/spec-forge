---
name: verification
description: >
  Runs the multi-layer verification pipeline: test, analyze, format,
  agent code review, and developer approval. Use when "verify", "run tests",
  "check quality", "review code", or at verification step of a spec-forge phase.
---

# Skill: verification

Runs the full verification pipeline for a spec-forge phase. The pipeline is:

```
test → analyze → format → agent code review → developer approval
```

The skill orchestrates `scripts/verify.js` (test, analyze, format) and then
launches parallel `code-reviewer` agents on the phase's diff. It returns a
single consolidated markdown report the calling command writes to the phase's
`VERIFICATION.md` and uses to update `state.yaml > phases[N].verification`.

This skill is stateless. It does not modify `state.yaml` itself — it returns
the new verification field values for the calling command to apply.

---

## Inputs

The command invoking this skill must supply:

- `service_root` — absolute path to the service repository being verified.
  All commands run with this as the working directory.
- `stack_profile` — the resolved stack profile name from `forge.yaml` /
  `forge-service.yaml` (e.g. `laravel`, `rails`, `go`). Used by `verify.js`
  to look up the right test/analyze/format commands.
- `phase_dir` — absolute path to the current phase's directory inside the
  task root (e.g. `<task_root>/phases/03/`). The phase's `CONTEXT.md` and
  any prior `PLAN.md` / `RESULT.md` live here. The skill writes nothing to
  this directory — it only reads.
- `phase_number` — integer phase number (e.g. `3`).
- `spec_path` — absolute path to the task's `spec.md`. Passed to reviewers so
  they can map findings to acceptance criteria.
- `research_path` — absolute path to the task's `research.md`. Passed to
  reviewers so they can check convention compliance.
- `diff_command` — the exact `git` command that produces the phase's diff
  (e.g. `git diff main..HEAD --`). Passed to reviewers verbatim.
- `reviewer_count` — (optional) number of `code-reviewer` agents to run in
  parallel. Defaults to the value of `agents.reviewer_count` in `forge.yaml`,
  which is `2`. Allowed values: `2` or `3`.
- `pipeline_scope` — (optional) one of `all` (default), `test-only`,
  `analyze-only`, `format-only`. Maps directly to `verify.js` flags.
- `developer_approval` — (optional) `true` if the calling command has already
  obtained developer approval and is recording the result; otherwise omit.
  When set, the skill skips the script and review steps and only formats the
  approval into the report. Used when re-running just to record approval.

If `service_root`, `stack_profile`, `phase_dir`, `phase_number`, or
`diff_command` are missing, return the failure response defined under
Failure Handling A — do not run the pipeline.

---

## Pipeline Overview

| Step | Tool | On failure |
|---|---|---|
| 1. Test | `scripts/verify.js --test-only` | STOP, report to developer |
| 2. Analyze | `scripts/verify.js --analyze-only` | STOP, report to developer |
| 3. Format | `scripts/verify.js --format-only` | Auto-fix, CONTINUE |
| 4. Code review | parallel `code-reviewer` agents | Report findings, CONTINUE |
| 5. Developer approval | (orchestrating command) | STOP — wait for developer |

Steps 1–3 are owned by `verify.js`; step 4 is owned by this skill; step 5 is
owned by the calling command (this skill returns the report it needs to ask).

---

## Step 1 — Run the Verification Script

Run `scripts/verify.js` from `service_root` with the appropriate flag.

| `pipeline_scope` | Command |
|---|---|
| `all` (default) | `node <plugin_root>/scripts/verify.js --all` |
| `test-only` | `node <plugin_root>/scripts/verify.js --test-only` |
| `analyze-only` | `node <plugin_root>/scripts/verify.js --analyze-only` |
| `format-only` | `node <plugin_root>/scripts/verify.js --format-only` |

The script:

- Reads the service's stack profile from `forge.yaml` (or `forge-service.yaml`
  overrides) using `stack_profile`.
- Runs each step in order, stopping on test or analyze failure.
- Auto-fixes formatting and continues even if files were rewritten.
- Returns structured JSON on stdout and exits 0 (all pass) or 1 (failure).

Capture the JSON. Expected shape:

```json
{
  "stack": "laravel",
  "steps": {
    "test":    { "ran": true, "status": "pass" | "fail" | "skipped",
                 "command": "<resolved cmd>", "stdout": "...", "stderr": "...",
                 "duration_ms": 12345, "summary": "<one-line>" },
    "analyze": { "ran": true, "status": "pass" | "fail" | "skipped",
                 "command": "...", "stdout": "...", "stderr": "...",
                 "duration_ms": 678, "summary": "..." },
    "format":  { "ran": true, "status": "pass" | "fixed" | "skipped",
                 "command": "...", "stdout": "...", "stderr": "...",
                 "duration_ms": 90, "files_changed": ["app/Foo.php"],
                 "summary": "..." }
  },
  "overall": "pass" | "fail",
  "failed_step": null | "test" | "analyze"
}
```

If the script's JSON is unparseable or `verify.js` is missing, treat it as a
script failure (Failure Handling B) — do not proceed to code review.

### Decisions after the script

- **`failed_step` is `test` or `analyze`** → STOP. Skip code review. Build the
  consolidated report with the failure details and return it. The calling
  command must show it to the developer and not record approval.
- **`failed_step` is `null`** → continue to Step 2.
- **`format` reported `files_changed`** → record the list in the report so
  the developer sees what was auto-fixed; do NOT stop.

---

## Step 2 — Launch Code Reviewers in Parallel

Spawn `reviewer_count` `code-reviewer` agents **simultaneously**. Use the
following focus area assignments:

| `reviewer_count` | Focus areas |
|---|---|
| `2` (default) | `correctness`, `conventions` |
| `3` | `correctness`, `conventions`, `security` |

For each agent, pass:

- `service_root` — verbatim
- `stack_profile` — verbatim
- `diff_command` — verbatim
- `phase_context` — read `phase_dir/CONTEXT.md` and pass its full content
- `spec` — read `spec_path` and pass its full content
- `research` — read `research_path` and pass its full content
- `focus_area` — as assigned in the table above

Read the three context files **once** in this skill before spawning, and pass
the same string to every agent — do not re-read per agent.

Collect all responses as `reviewer_outputs[]`, one per `focus_area`. Each
agent returns markdown matching the `code-reviewer` output format.

If a reviewer fails or returns an unparseable response, drop that focus area
from the merge and note the gap in the consolidated report. Do not retry.

---

## Step 3 — Merge Reviewer Findings

Combine the parallel review outputs into a single review block using these
rules:

| Section | Strategy |
|---|---|
| **Summary** | Concatenate each reviewer's Summary line, prefixed with `[<focus>]`. Do not paraphrase. |
| **Critical** | Union of all findings. De-duplicate on `file:line` — if two reviewers flag the same line, keep the longer description, append the other reviewer's `focus` in parentheses. |
| **Important** | Union, de-duplicate on `file:line` (same rule as Critical). |
| **Minor** | Union, then cap at 3 total — prefer items cited by more than one reviewer; break ties by ordering Critical-adjacent reviewers first. |
| **Acceptance Criteria Coverage** | Take from the reviewer with `focus_area=correctness`. If absent, take from the first reviewer that produced an AC table. |
| **Confidence Notes** | Concatenate verbatim from all reviewers, preserving each reviewer's `focus` label. Omit the section if all reviewers omitted it. |

Determine the overall review status:

- **`changes-requested`** if there is at least one Critical or Important
  finding after de-duplication.
- **`approved`** if there are no Critical or Important findings.

Record this as `review_status`.

---

## Step 4 — Build the Consolidated Report

Assemble a single markdown document the calling command will write to the
phase's `VERIFICATION.md`. The document is the skill's primary output.

```markdown
# Verification — Phase <NN>

**Service**: <service-name>
**Stack**: <stack_profile>
**Pipeline scope**: <all | test-only | analyze-only | format-only>
**Diff**: `<diff_command>`

---

## Pipeline Results

| Step | Status | Duration | Summary |
|---|---|---|---|
| Test | <pass | fail | skipped> | <ms> | <one-line> |
| Analyze | <pass | fail | skipped> | <ms> | <one-line> |
| Format | <pass | fixed | skipped> | <ms> | <one-line> |
| Review | <approved | changes-requested | skipped | not-run> | — | <count> findings |

<If failed_step is set, add this block immediately after the table:>

### Failed Step: <test | analyze>

```
<failed step's stdout/stderr, trimmed to the relevant lines>
```

**Command**: `<the resolved command>`
**Action required**: <one sentence — fix tests / fix analyze errors>

<If format.files_changed is non-empty, add this block:>

### Auto-fixed Files

- `<file>`
- ...

---

## Code Review

<Only present if Step 2 ran. Otherwise omit this entire section and write
"_Code review skipped: pipeline failed before review._" in its place.>

**Reviewers**: <comma-separated focus areas, e.g. correctness, conventions>
**Status**: <approved | changes-requested>

### Summary

- [correctness] <reviewer summary>
- [conventions] <reviewer summary>

### Critical

<merged critical findings — "— none —" if empty>

- **`path/to/file.ext:LINE`** — <what is wrong> — <why it matters> — <fix> _(<focus>)_

### Important

<merged important findings — "— none —" if empty>

### Minor

<up to 3 minor findings — "— none —" if empty>

### Acceptance Criteria Coverage

- **AC-N**: <satisfied | partially | not satisfied | not in scope> — <evidence>

### Confidence Notes

<optional section, omit if all reviewers omitted it>

---

## State Updates

<This block tells the calling command which state.yaml fields to write.
The command parses this block and applies the updates.>

```yaml
phases[<phase_number - 1>].verification.test: <pass | fail | null>
phases[<phase_number - 1>].verification.analyze: <pass | fail | null>
phases[<phase_number - 1>].verification.format: <pass | fail | null>
phases[<phase_number - 1>].verification.review: <approved | changes-requested | null>
```

---

## Next Action

<One sentence telling the developer what to do next:>

- If failed_step is test/analyze → "Fix the failing <step> and re-run /forge:verify."
- If review_status is changes-requested → "Address the review findings above, then re-run /forge:verify."
- If everything passed → "Approve this phase to mark verification complete."
```

---

## Step 5 — Return the Report

Return the consolidated report as the skill output. The calling command will:

1. Write the document to `<phase_dir>/VERIFICATION.md`.
2. Parse the `## State Updates` block and update `state.yaml >
   phases[N].verification` accordingly using `scripts/update-state.js`.
3. Read the `## Next Action` block and either prompt the developer for
   approval or re-run a previous step based on its content.

Do not write any files yourself. Do not modify `state.yaml`.

---

## Output Contract

The output of this skill is exactly the markdown document defined in Step 4.
It must contain:

- `# Verification — Phase <NN>` heading
- `## Pipeline Results` table with all four rows
- `## Code Review` section (or its skipped placeholder)
- `## State Updates` block in fenced YAML
- `## Next Action` line

If any of those is missing, the calling command should consider the skill
output invalid and surface an error to the developer.

---

## Rules and Constraints

- **`scripts/verify.js` is the single source of truth for test/analyze/format
  commands.** This skill never invokes test runners directly — it always goes
  through the script so stack-specific commands stay centralised in
  `forge.yaml`.
- **Always run the script from `service_root`.** The pipeline commands assume
  the working directory is the service repo root.
- **Spawn reviewers in parallel.** Sequential reviewer launches double the
  latency for no benefit.
- **Stop the pipeline on test or analyze failure.** Do not run code review
  on a broken build — the diff is meaningless until tests pass.
- **Format failures are not failures.** `verify.js` auto-fixes formatting and
  continues; surface the fixed-files list but do not block on it.
- **De-duplicate reviewer findings on `file:line`.** Two reviewers flagging
  the same line is one finding, not two.
- **Do not write files.** Return the merged markdown only — the calling
  command persists.
- **Do not modify `state.yaml`.** Emit the `## State Updates` block instead;
  the calling command applies it.
- **Self-contained.** This prompt includes everything needed. Do not assume
  CLAUDE.md or other context is loaded.

---

## Failure Handling

### A — Missing required inputs

If any of `service_root`, `stack_profile`, `phase_dir`, `phase_number`, or
`diff_command` is missing, return:

```markdown
# Verification — Phase <NN>

**Verification could not run:** missing required inputs (<list of missing fields>).
The calling command must supply all required fields before invoking the
verification skill.

## State Updates

```yaml
# no updates — verification did not run
```

## Next Action

Supply the missing inputs and re-run /forge:verify.
```

### B — `verify.js` failed to execute or returned unparseable JSON

Return a report with:

- `## Pipeline Results` table showing all four rows as `not-run`
- A new section `### Script Error` containing the script's stderr (or
  `<scripts/verify.js not found>` if the script is missing)
- `## State Updates` with no changes
- `## Next Action`: "Investigate scripts/verify.js — pipeline could not run.
  See script error above."

### C — All reviewers failed

If every `code-reviewer` agent fails or returns an unparseable response, set
the Code Review section's Status to `not-run`, set every Critical/Important/
Minor section to `— none —`, and add at the top of the Code Review section:
`**Reviewer error:** all code-reviewer agents failed. Manual review required
before approving this phase.` Set `review` to `null` in the State Updates
block — not `approved`.

Never return an empty response. The calling command always expects a
parseable markdown document with the headings defined in Step 4.
