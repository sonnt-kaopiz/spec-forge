---
name: forge:new
description: Create a new spec-forge task and walk it through questioning, spec, research, requirements, and planning
argument-hint: <task-slug>
allowed_tools: Read, Bash, Write, Task, AskUserQuestion
---

# forge:new

## Objective

Bootstrap a brand-new spec-forge task and drive it through every pre-implementation phase in one command:

**Phases driven (in order):**
`questioning` → `spec` → `research` (optional) → `requirements` → `planning` → `phase-execution`

**Files created under `<workspace_root>/.ai-workflow/tasks/<slug>/`:**

| File | Created by |
|---|---|
| `state.yaml` | `init-task.js` (seeded from template) |
| `spec.md` | Step 6 (synthesized from questioning) |
| `research-summary.md` | Step 7 (optional; 4 parallel researcher agents + synthesizer) |
| `requirements.md` | Step 8 (scoped feature table) |
| `plan.md` | Step 9 `phase-planner` agent |
| `phases/<NN>/CONTEXT.md` | Step 9 `phase-planner` agent (one per phase) |

**Developer decision points:** research opt-in (Step 7), feature scoping (Step 8), plan review (Step 9).

**What runs next:** The command prints a finish banner and suggests `/forge:next`. The developer drives implementation with `/forge:next` (advance steps/phases) and `/forge:verify` (run verification after implementation).

The orchestrator updates `state.yaml` at every status transition using `scripts/update-state.js`. Skills and agents never touch `state.yaml` directly.

---

## Process

### Step 1 — Parse `$ARGUMENTS` and resolve source

#### 1a — Parse arguments

Split `$ARGUMENTS`. Extract:

- `task_slug` — the first positional token (if present).

No flags are accepted. If any unrecognised flag is present (e.g. `--source`), warn the user and stop:

```
The --source flag is no longer supported. Configure the task source in forge.yaml (task_source field).
Usage: /forge:new <task-slug>
```

#### 1b — Read global task_source

Read `task_source` from `<plugin_root>/forge.yaml` (top-level key `task_source`). Hold it as `configured_source`. Supported values: `manual`, `jira`, `linear`, `github`. If the key is missing, default to `manual`.

#### 1c — Slug was provided → use global config source, no questions

When `task_slug` was given:

1. Validate against `^[a-zA-Z]+-[a-z0-9]+$`. If invalid, print usage and stop:
   ```
   Usage: /forge:new <task-slug>
   Slug must match <letters>-<lowercase letters or digits> (e.g. task-123).
   ```
2. Set `source = configured_source` (the raw value from forge.yaml, e.g. `"jira"` or `"manual"`). No tracker issue fetching occurs — task input is gathered through questioning in Step 5.

#### 1d — Slug was NOT provided → auto-generate slug, ask for issue key if needed

When no `task_slug` was given:

1. **Auto-generate the slug**: read `task_prefix` from forge.yaml, lowercase it, generate a 6-character random string from `[a-z0-9]`, compose `<prefix>-<random6>` (e.g. `sf-x3k9mq`). Hold as `task_slug`.

2. **Resolve source**:
   - If `configured_source` is `manual`: set `source = "manual"`. No questions needed.
   - If `configured_source` is a tracker (`jira`, `linear`, or `github`): ask one follow-up via `AskUserQuestion`:
     ```
     Question: "Enter the <Jira|Linear> issue key (e.g. PROJ-123):"   [for jira/linear]
               "Enter the GitHub issue number (e.g. 42):"              [for github]
     ```
     Compose `source = "<type>:<key>"` (e.g. `jira:PROJ-123`, `github:42`).

#### 1e — Final validation

Validate the final `task_slug` against `^[a-zA-Z]+-[a-z0-9]+$`. If it still fails, print:

```
Usage: /forge:new <task-slug>
Slug must match <letters>-<lowercase letters or digits> (e.g. task-123).
```

Stop.

---

### Step 2 — Resolve workspace root

1. If `forge-service.yaml` exists in the current working directory, read it and extract `workspace_root`. Use that value.
2. Otherwise, use the current working directory as `workspace_root`.

Print: `Workspace root: <workspace_root>`.

---

### Step 3 — Initialise the task directory

Run `init-task.js` to scaffold the task. The script:

- Creates `<workspace_root>/.ai-workflow/tasks/<slug>/`
- Populates the directory from `templates/` (`spec.md`, `research.md`, `external-research.md`, `architecture.md`, `plan.md`, `state.yaml`)
- Creates `services/`, `phases/`, and `logs/` subdirectories

```
node <plugin_root>/scripts/init-task.js "<task_slug>" "<workspace_root>"
```

The script writes a single JSON object to stdout. Parse it and hold:

- `task_dir` ← `result.task_dir` — absolute path to the new task directory
- `task_id` ← `result.task_id` — same value as `task_slug`
- `task_slug` ← `result.task_slug`
- `idempotent` ← `result.idempotent` — `true` if the directory already existed

If the script exits non-zero, surface its stderr and stop.

---

### Step 4 — Initialise state.yaml

The init script seeds `state.yaml` from the template with `status: discovery` and the task ID/slug filled in. No update is needed at this point — the template is the initial state.

Verify the file exists:

```
node <plugin_root>/scripts/read-state.js "<task_dir>" "<workspace_root>"
```

Hold the parsed object as `state`.

---

### Step 5 — Deep Questioning

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status questioning "<workspace_root>"
```

Print the banner:

```
─── QUESTIONING ───
```

Open with a single freeform question — do not list sub-questions:

```
What do you want to build?
```

**Conversation rules:**

- Follow threads from the response. Dig into whatever is exciting, vague, or implicit: motivations, success criteria, assumptions about users, existing constraints, and edge cases the developer hasn't mentioned.
- Keep a mental context checklist — **what** is being built, **why** it matters, **who** uses it, what **"done"** looks like — but never recite the checklist aloud or interrogate it mechanically.
- When a vague term surfaces (e.g. "scalable", "smart", "seamless"), ask what it means in this specific context.
- Use `AskUserQuestion` to offer 2–4 concrete interpretations the developer can react to rather than asking open-ended clarifying questions. Never offer generic options like "Option A / Option B / Other".
- Loop as needed. There is no fixed number of exchanges.
- When enough clarity exists on all four checklist items, ask:

```
Ready to write spec.md?
  1. Yes, create spec.md
  2. Keep exploring
```

  - **1** → advance to Step 6.
  - **2** → loop back and continue the conversation.

---

### Step 6 — Write spec.md

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status spec "<workspace_root>"
```

Print: `Status: questioning → spec`.

**Gather existing architecture context:**

Read all markdown files under `<workspace_root>/.ai-workflow/codebase/` (if the directory exists). Any capability, component, or constraint documented there is treated as a **Validated** requirement — it is already delivered and must be honoured, not re-invented.

**Synthesize spec:**

From everything learned in the questioning conversation plus validated capabilities, write `<task_dir>/spec.md`. The spec must capture:

- **Goal** — what the feature/task achieves and why
- **Validated requirements** — capabilities already present (sourced from codebase docs); mark each `[Validated]`
- **New requirements** — net-new behaviour needed; mark each `[New]`
- **Key decisions** — design choices surfaced during questioning (data model shape, API contract style, auth approach, etc.)
- **Out of scope** — anything explicitly ruled out

Write the file. Print the full contents to the developer and confirm:

```
spec.md written. Review above — does this capture what you want?
  1. Yes, looks good
  2. Revise (tell me what to change)
```

- **1** → advance to Step 7.
- **2** → ask: `What needs to change?` Incorporate the feedback, re-write `spec.md`, and re-print. Loop until the developer confirms.

---

### Step 7 — Research Decision

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status research "<workspace_root>"
```

Print: `Status: spec → research`.

Ask via `AskUserQuestion`:

```
Research the domain ecosystem before scoping features?

Research spawns 4 parallel agents (stack, features, architecture, pitfalls)
and synthesizes the results into research-summary.md. Recommended for unfamiliar
domains or technology choices you haven't made yet.

  1. Yes, run research (recommended)
  2. No, skip to requirements
```

**If skip (2):** set `research_available = false`, advance to Step 8.

**If research (1):**

Spawn 4 researcher agents **in parallel**, each with the full content of `<task_dir>/spec.md` as context and a focused brief:

| Agent | Focus brief |
|---|---|
| **stack-researcher** | What does the existing stack look like? What additions or changes are needed to support the new feature? |
| **features-researcher** | What existing features are relevant? How does this type of feature typically work in production systems? |
| **architecture-researcher** | What does the existing architecture look like? How does this type of feature typically integrate with systems like this one? |
| **pitfalls-researcher** | What are the most common mistakes teams make when adding this kind of feature to an existing system? |

Wait for all 4 to complete. Then spawn one **synthesizer agent** with all four reports as input. The synthesizer produces a single markdown document with sections: Stack Considerations, Feature Patterns, Architecture Integration, and Common Pitfalls. Write it to `<task_dir>/research-summary.md`.

Set `research_available = true`. Print:

```
─── Research complete ───
<full research-summary.md body>
```

Advance to Step 8.

---

### Step 8 — Define Requirements

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status requirements "<workspace_root>"
```

Print: `Status: research → requirements`.

**Extract inputs:**

- From `<task_dir>/spec.md`: extract **core value proposition** and all requirements (validated + new).
- If `research_available`: from `<task_dir>/research-summary.md`, extract feature categories and patterns observed.

**Build feature table:**

Organise all candidate features into categories. For each category, classify features as:

- **Table stakes** — must exist for the feature to function at all; skipping one blocks release.
- **Differentiators** — add real value but the feature ships without them.
- **Research notes** — surfaced by research agents; may or may not belong in this milestone.

Present the table to the developer. Then loop through each feature using `AskUserQuestion`:

```
[Feature name] — <one-sentence description>
Category: <Table stakes | Differentiator | Research note>

Include in this milestone?
  1. Yes — selected for this milestone
  2. Not now — keep as future work (table stakes) / out of scope (differentiators)
```

Track decisions:
- **Selected** → this milestone.
- **Not now (table stakes)** → future milestone backlog.
- **Not now (differentiator)** → out of scope.

After all features are scoped, print the full summary:

```
─── Requirements Summary ───
Selected (this milestone):
  - <feature list>

Future backlog:
  - <feature list>

Out of scope:
  - <feature list>
```

Ask:

```
Confirm and write requirements.md?
  1. Yes
  2. Adjust selections
```

- **2** → re-run the scoping loop for any features the developer wants to change.
- **1** → write `<task_dir>/requirements.md` with the full scoped table and advance to Step 9.

---

### Step 9 — Create Plan

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status planning "<workspace_root>"
```

Print: `Status: requirements → planning`.

Read all output files from previous steps and pass their full contents to the `phase-planner` agent:

- `spec` ← `<task_dir>/spec.md`
- `requirements` ← `<task_dir>/requirements.md`
- `research` ← `<task_dir>/research-summary.md` (if `research_available`; omit otherwise)

**Planner constraints passed to the agent:**

- Every selected requirement must map to exactly one phase.
- Each phase must have 2–5 concrete, measurable success criteria.
- Phases must be sequenced so earlier phases do not depend on later ones.

The agent returns a response in the standard format:

1. The full `plan.md` body
2. The marker line `---PLAN-END---`
3. One `---CONTEXT-PHASE-N---` block per phase, each followed by the CONTEXT.md skeleton

**Persist plan and CONTEXT skeletons:**

1. Split on `---PLAN-END---`. Write the first part to `<task_dir>/plan.md`.
2. Split the remainder on `---CONTEXT-PHASE-` markers. For each block:
   - Parse phase number `N`.
   - `mkdir -p <task_dir>/phases/<NN>/` (two-digit padded).
   - Write the block body to `<task_dir>/phases/<NN>/CONTEXT.md`.

**Populate `state.phases[]`:**

Parse the Phase Overview table from `plan.md`. For each row build:

```yaml
id: <N>
name: "<phase name>"
status: pending
started_at: null
completed_at: null
```

Persist in one call:

```
node <plugin_root>/scripts/update-state.js "<task_dir>" phases '<json-array>' "<workspace_root>"
```

If the planner returned an empty Phase Overview table, print the planner's failure note and stop with status left at `planning`.

Print the full `plan.md` and ask:

```
─── Plan ready ───
<full plan.md body>

(a)pprove / (r)egenerate
```

- **`a`** → advance to Step 10.
- **`r`** → re-run the planner (overwrite `plan.md`, CONTEXT skeletons, and `state.phases`). Re-print and re-prompt.

Then transition:

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status phase-execution "<workspace_root>"
node <plugin_root>/scripts/update-state.js "<task_dir>" current_phase 1 "<workspace_root>"
node <plugin_root>/scripts/update-state.js "<task_dir>" current_step discussion "<workspace_root>"
node <plugin_root>/scripts/update-state.js "<task_dir>" phases.0.status in-progress "<workspace_root>"
node <plugin_root>/scripts/update-state.js "<task_dir>" phases.0.started_at "<iso-now>" "<workspace_root>"
```

---

### Step 10 — Finish

Print the closing banner:

```
✓ Task <task_id> initialized.

Files written:
  .ai-workflow/tasks/<slug>/spec.md
  .ai-workflow/tasks/<slug>/requirements.md
  .ai-workflow/tasks/<slug>/plan.md
  .ai-workflow/tasks/<slug>/phases/01/CONTEXT.md   (+ one per phase)

Phase 1 is ready. Review the context in phases/01/CONTEXT.md, then run:

  /forge:next       — begin phase 1 implementation
  /forge:status     — see the task dashboard
  /forge:plan       — view the full plan
  /forge:resume <slug>  — pick up after a session break
```

Stop the command. The developer drives subsequent phases with `/forge:next` and `/forge:verify`.

---

## Rules and Constraints

- **One source of truth.** `state.yaml` is the only place workflow position is recorded; every transition runs through `update-state.js`.
- **The orchestrator owns transitions.** Skills and agents never modify `state.yaml`. This command updates state at every status change.
- **Decision points are blocking.** At Steps 6 (spec confirm), 7 (research opt-in), 8 (feature scoping), and 9 (plan review) the command waits for the developer. Stopping at any point leaves a recoverable task on disk — `/forge:resume` picks it up.
- **Pass document contents verbatim.** Agents need full context. Never summarise spec.md, requirements.md, or research-summary.md before passing them.
- **Researcher and synthesizer agents are stateless.** Each returns markdown. The orchestrator persists it.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/new.md` → plugin root is two levels up). All script invocations use absolute paths.
- **`init-task.js` is idempotent.** If the developer re-runs `/forge:new` with the same slug, the script reuses the existing task directory and template files. The orchestrator continues from `questioning` regardless.
- **No phase implementation here.** This command stops after writing plan.md and printing the finish banner. Implementation is the developer's job.
- **Validated requirements come from codebase docs.** Only files under `<workspace_root>/.ai-workflow/codebase/` are treated as validated — do not infer validation from source code alone.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **`init-task.js` fails** → print stderr and stop. The task directory may be partially created; the script is idempotent so a re-run is safe.
- **`update-state.js` fails on any transition** → stop, print stderr, tell the developer to inspect `state.yaml` and re-run `/forge:resume <slug>`.
- **A researcher or synthesizer agent returns a failure** → surface the failure to the developer and offer to re-run. Do not advance the status until research succeeds or the developer explicitly skips.
- **The planner returns an empty Phase Overview table** → write `plan.md` as-is, print the planner's failure note, and stop with status left at `planning`. The developer can re-run `/forge:resume <slug>` to retry planning.
- **Developer stops at any decision point** → the task is preserved with whatever status was reached. `/forge:resume <slug>` picks up exactly where it stopped.
