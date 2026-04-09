# Spec-Forge Integration Test Guide

Manual end-to-end testing checklist for the full plugin workflow. Run these scenarios before tagging a v1.0 release. All tests are performed by running slash commands in Claude Code with the plugin installed.

---

## Prerequisites

- Plugin installed locally (see README for `claude plugin install` instructions)
- At least one service repo with `forge-service.yaml` configured
- `node` (18+) available in PATH

---

## Scenario 1 — New task: full workflow walkthrough

**Purpose**: Verify `/forge:new` drives the task from discovery through planning and enters phase-execution.

```
/forge:new test-feature
```

**Check after each step:**

- [ ] Task directory created: `<workspace_root>/.ai-workflow/tasks/SF-NNN-test-feature/`
- [ ] `state.yaml` initialised with `status: discovery`, correct `id` and `slug`
- [ ] `spec.md`, `research.md`, `external-research.md`, `architecture.md`, `plan.md` all present (populated from templates)
- [ ] `services/`, `phases/`, `logs/` subdirectories created
- [ ] Spec draft presented to developer with approval gate (a/r/s)
- [ ] Codebase research runs and writes `research.md`
- [ ] External research runs and writes `external-research.md`
- [ ] Architecture agent runs and writes `architecture.md`
- [ ] Plan agent runs, writes `plan.md`, creates `phases/01/CONTEXT.md`
- [ ] `state.yaml` transitions: `discovery → spec → codebase-research → external-research → architecture → planning → phase-execution`
- [ ] `state.phases[]` populated with entries from the plan's Phase Overview table
- [ ] Phase 1 CONTEXT.md printed; command exits cleanly

---

## Scenario 2 — Resume after session break

**Purpose**: Verify `/forge:resume` reconstructs context correctly.

1. Run `/forge:new some-task` and stop at the spec approval gate (`s`).
2. Start a new Claude Code session.
3. Run `/forge:resume some-task`.

**Check:**

- [ ] Context reconstructor identifies the active task by slug
- [ ] Current `status`, `current_phase`, and `current_step` from `state.yaml` are surfaced
- [ ] `spec.md` content is summarised/presented to orient the developer
- [ ] Command prompts developer on next action

---

## Scenario 3 — Status dashboard

**Purpose**: Verify `/forge:status` renders the task dashboard.

After at least one task is initialised:

```
/forge:status
```

**Check:**

- [ ] Dashboard lists all active tasks with their ID, slug, and current status
- [ ] Each task shows current phase and step
- [ ] Completed or stopped tasks are represented distinctly from in-progress ones
- [ ] No crash if `.ai-workflow/tasks/` is empty (clean workspace)

---

## Scenario 4 — Verify pipeline

**Purpose**: Verify `/forge:verify` runs test → analyze → format in order for the configured stack.

Set up a service repo with a `forge-service.yaml` pointing to a valid stack profile. Run from inside the service repo:

```
/forge:verify
```

**Check:**

- [ ] Test step runs the configured `test.command`
- [ ] Analyze step runs the configured `analyze.command`
- [ ] Format step runs the configured `format.command` and reports auto-fixed files (if any)
- [ ] Output is a structured JSON report with `overall: pass` or `overall: fail`
- [ ] If test fails, pipeline stops before analyze — format is not run
- [ ] If analyze fails, pipeline stops before format
- [ ] Format failure does not set `overall: fail`
- [ ] Exit code is 0 on overall pass, 1 on overall fail

Test the flags:

```
/forge:verify --test-only
/forge:verify --analyze-only
/forge:verify --format-only
```

- [ ] Each flag runs only the corresponding step; other steps are `skipped`

---

## Scenario 5 — Force-skip a phase

**Purpose**: Verify `/forge:next --force` advances state without running verification.

With a task in `phase-execution` at phase N:

```
/forge:next --force
```

**Check:**

- [ ] `state.yaml` advances `current_phase` to N+1
- [ ] Previous phase `status` set to `skipped` (not `complete`)
- [ ] Next phase CONTEXT.md is printed
- [ ] No verification commands are invoked

---

## Scenario 6 — SessionStart hook (active task detection)

**Purpose**: Verify the session-start hook injects task context when Claude Code starts in a service repo with an active task.

1. Ensure `hooks/hooks.json` is configured and the hook is active.
2. Start a new Claude Code session from inside a service repo that has an active task in the workspace.

**Check:**

- [ ] System prompt includes an active task summary (task ID, slug, current status)
- [ ] Resume instructions are injected (e.g. "Run `/forge:resume <slug>` to continue")
- [ ] Hook completes in < 10 seconds
- [ ] Starting Claude Code in a repo with no active tasks produces no hook output

---

## Scenario 7 — Cross-service task

**Purpose**: Verify state tracking works when a task spans multiple services.

Run `/forge:new multi-service-task` and select two services when prompted.

**Check:**

- [ ] Both services appear in `state.services[]` in `state.yaml`
- [ ] Codebase research runs agents for each service
- [ ] `research.md` contains a section per service
- [ ] Plan phases reference the correct service for each phase

---

## Scenario 8 — Error recovery (crash mid-phase)

**Purpose**: Verify `/forge:resume` recovers after a simulated crash.

1. Start `/forge:new crash-test`.
2. Interrupt (Ctrl-C) mid-way through a skill (e.g. during research).
3. Inspect `state.yaml` — note the current `status`.
4. Run `/forge:resume crash-test`.

**Check:**

- [ ] Resume correctly identifies the interrupted status
- [ ] Context reconstructor presents what was completed before the crash
- [ ] Developer is prompted to re-run the interrupted step or continue from the next gate
- [ ] No duplicate task directories created
- [ ] `state.yaml` is not corrupted (valid YAML, all required fields present)

---

## Automated Tests

In addition to the manual scenarios above, the automated unit test suite covers scripts in isolation.

Run all tests:

```
node --test tests/init-task.test.js
node --test tests/state-management.test.js
node --test tests/verify.test.js
```

Expected: all tests pass (exit 0).

---

## Known Limitations (pre-v1.0)

- SessionStart hook requires hooks to be active in `~/.claude/settings.json` — check that `hooks.json` is wired up.
- `/forge:verify` must be run from the service repo root where `forge-service.yaml` is present.
- Jira and Linear source imports require the developer to paste issue content manually (no API integration).
