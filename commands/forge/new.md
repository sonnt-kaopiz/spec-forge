---
description: Create a new spec-forge task and walk it through discovery, spec, research, architecture, and planning
argument-hint: <task-slug> [--source jira:KEY | linear:KEY | github:NUM]
---

# forge:new

Create a brand-new spec-forge task and drive it from `discovery` through `planning`. This is the longest command in the plugin: it orchestrates `init-task.js`, the `spec-generation`, `codebase-research`, and `external-research` skills, the `solution-architect` and `phase-planner` agents, and the developer approval gates between them.

The command does not implement any phase code — it stops at the boundary of `phase-execution`. The developer continues with `/forge:next` and `/forge:verify` after planning is approved.

---

## Inputs and required state

- `$ARGUMENTS` — `<task-slug> [--source <type>:<key>]`
- `workspace_root` — resolved at Step 2
- `<plugin_root>` — the directory two levels above this file (`commands/forge/new.md`)

The orchestrator updates `state.yaml` at every status transition using `scripts/update-state.js`. It never lets the agents/skills touch `state.yaml` directly.

---

## Step 1 — Parse `$ARGUMENTS`

Split `$ARGUMENTS`. Extract:

- `task_slug` — the first positional token. Must match `^[a-z0-9][a-z0-9-]*[a-z0-9]$`. If missing or invalid:
  ```
  Usage: /forge:new <task-slug> [--source jira:KEY | linear:KEY | github:NUM]
  Slug must be lowercase letters, digits, and hyphens (e.g. add-user-notifications).
  ```
  Stop.
- `source` — value following `--source`. Must match `^(jira|linear|github):.+$`. If `--source` is present without a value, refuse with the usage line above.

---

## Step 2 — Resolve workspace root

1. If `forge-service.yaml` exists in the current working directory, read it and extract `workspace_root`. Use that value.
2. Otherwise, use the current working directory as `workspace_root`.

Print: `Workspace root: <workspace_root>`.

---

## Step 3 — Initialise the task directory

Run `init-task.js` to scaffold the task. The script:

- Auto-increments the task ID by scanning `<workspace_root>/.ai-workflow/tasks/`
- Creates `<workspace_root>/.ai-workflow/tasks/<task-id>-<slug>/`
- Populates the directory from `templates/` (`spec.md`, `research.md`, `external-research.md`, `architecture.md`, `plan.md`, `state.yaml`)
- Creates `services/`, `phases/`, and `logs/` subdirectories

```
node <plugin_root>/scripts/init-task.js "<task_slug>" "<workspace_root>"
```

The script prints the created directory and assigned task ID. Parse them from stdout (the lines starting with `Task directory:` and `ID   :`). Hold:

- `task_dir` — absolute path to the new task directory
- `task_id` — the assigned ID (e.g. `SF-007`)

If the script exits non-zero, surface its stderr and stop.

---

## Step 4 — Initialise state.yaml

The init script seeds `state.yaml` from the template with `status: discovery` and the task ID/slug filled in. No update is needed at this point — the template is the initial state.

Verify the file exists:

```
node <plugin_root>/scripts/read-state.js "<task_dir>" "<workspace_root>"
```

Hold the parsed object as `state`.

---

## Step 5 — Fetch source content (if --source was provided)

If `source` was set in Step 1:

- **`jira:<KEY>` / `linear:<KEY>`** — Spec-Forge has no credentials. Prompt the developer:
  ```
  Paste the <Jira|Linear> issue body for <KEY> (end with a single line containing only "EOF"):
  ```
  Read until `EOF`. Hold the content as `source_input`.
- **`github:<NUM>`** — try `gh issue view <NUM> --json title,body --jq '.title + "\n\n" + .body'`. If `gh` succeeds, capture stdout as `source_input`. If `gh` fails or is missing, fall back to the paste-and-EOF prompt with the github number.

Update `state.task.source`:

```
node <plugin_root>/scripts/update-state.js "<task_dir>" task.source "<source>" "<workspace_root>"
```

If `source` was not set, leave `task.source` as the template default (`manual`) and skip `source_input` (set it to empty).

---

## Step 6 — Discovery: capture the requirement

Print:

```
─── Discovery ───
Briefly describe the task in your own words (or skip with EOF if --source already covered it).
End with a single line containing only "EOF":
```

Read the developer's input until `EOF`. Hold as `discovery_input`.

If both `source_input` and `discovery_input` are empty, refuse:
```
No input to draft from. Re-run /forge:new and provide a description or --source.
```
Stop. (The task directory already exists and is harmless — the developer can re-run.)

Combine the inputs into `task_input`:
- If both are present: `<source_input>\n\n---\n\nDeveloper notes:\n<discovery_input>`
- Otherwise the non-empty one alone

---

## Step 7 — Transition to spec status

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status spec "<workspace_root>"
```

Print: `Status: discovery → spec`.

---

## Step 8 — Generate the spec

Invoke the `spec-generation` skill with:

- `task_input` ← from Step 6 (verbatim)
- `task_id` ← `task_id`
- `task_slug` ← `task_slug`
- `source_hint` ← `source` if set, otherwise omit (skill auto-detects)
- `existing_spec` ← omit (this is the first draft)
- `mode_override` ← omit

The skill returns a single response containing two markdown documents separated by `---SPEC-END---`. Split on the marker.

Write the spec body to `<task_dir>/spec.md`. Hold the questions block as `clarifying_questions`.

---

## Step 9 — GATE: spec approval

Print to the developer:

```
─── Spec ready for review ───
<full spec.md body>

──── Clarifying Questions ────
<clarifying_questions block>
```

Then prompt:

```
(a)pprove / (r)efine with answers / (s)top
```

- **`a`** → continue to Step 10.
- **`r`** → ask: `Provide answers or additional context (end with a single line containing only "EOF"):`. Read the input. Re-invoke the `spec-generation` skill with `existing_spec=<current spec.md>` and `task_input=<the answers>` and `mode_override=refine`. Re-write `spec.md`. Loop back to the start of Step 9.
- **`s`** → print: `Stopped at spec review. Run /forge:resume <task-id> when you are ready to continue.` Stop the command. The task is preserved on disk.

The developer may iterate on `r` as many times as needed.

---

## Step 10 — Transition to codebase-research

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status codebase-research "<workspace_root>"
```

Print: `Status: spec → codebase-research`.

---

## Step 11 — Run the codebase-research skill

Determine `services[]` for the skill. Resolution order:

1. If the developer has populated `state.services[]` already (e.g. by editing the task dir), use it. Each entry must include an absolute `root`. If `root` is missing, error: `state.services[] entries require absolute root paths.`
2. Otherwise, scan `<workspace_root>/` immediate subdirectories for service signals (composer.json, Gemfile, package.json, pyproject.toml, go.mod, pom.xml, build.gradle*, Cargo.toml, *.csproj). Present the discovered list and ask the developer which services this task touches:
   ```
   Which services does this task touch? (comma-separated, or 'all'):
     1. user-service
     2. notification-service
     3. api-gateway
   ```
   Map the answer to `{ name, root }` entries. Persist them to state:
   ```
   node <plugin_root>/scripts/update-state.js "<task_dir>" services '[{"name":"...","root":"...","status":"pending"}]' "<workspace_root>"
   ```

Decide `complexity`:
- `complex` if more than one service is targeted, OR the spec mentions a database migration, schema change, or cross-service contract change.
- `standard` otherwise.

Invoke the `codebase-research` skill with:

- `task_context` ← the full content of `<task_dir>/spec.md`
- `services[]` ← the resolved list (`{ name, root }` for each)
- `complexity` ← `standard` or `complex`

The skill spawns 2–3 `codebase-researcher` agents in parallel and returns a merged markdown document. Write it to `<task_dir>/research.md`, overwriting the template.

---

## Step 12 — Present research and transition

Print:

```
─── Codebase research complete ───
<full research.md body>
```

Ask:
```
(c)ontinue to external research / (r)e-run codebase research / (s)top
```

- **`c`** → continue.
- **`r`** → re-invoke Step 11. Allow the developer to change `complexity` (offer `standard` / `complex`).
- **`s`** → save and stop.

Then transition:

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status external-research "<workspace_root>"
```

Print: `Status: codebase-research → external-research`.

---

## Step 13 — Run the external-research skill

Build the `stacks[]` input following the rules in `/forge:research` Step 4 (read each service's `forge-service.yaml`, fall back to plugin profile, fall back to manifest detection). Drop entries with no resolvable language/framework and warn.

Invoke the `external-research` skill with:

- `task_context` ← the full content of `<task_dir>/spec.md`
- `stacks[]` ← from the resolution above
- `focus_topics` ← omit (the agent derives them)
- `existing_research` ← omit (this is the first run)

Write the returned markdown to `<task_dir>/external-research.md`, overwriting the template.

---

## Step 14 — Present external research and transition

Print:

```
─── External research complete ───
<full external-research.md body>
```

Ask:
```
(c)ontinue to architecture / (r)e-run external research with a focus topic / (s)top
```

- **`c`** → continue.
- **`r`** → ask: `Topic to focus on?` and re-invoke the skill with `focus_topics=[<topic>]` and `existing_research=<current external-research.md>`. Write the result and re-prompt.
- **`s`** → save and stop.

Then transition:

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status architecture "<workspace_root>"
```

Print: `Status: external-research → architecture`.

---

## Step 15 — Run the solution-architect agent (Opus)

Read these files once and pass their full contents:

- `spec` ← `<task_dir>/spec.md`
- `research` ← `<task_dir>/research.md`
- `external_research` ← `<task_dir>/external-research.md`
- `services[]` ← `state.services[]` with `{ name, root, stack_profile }`. Resolve each `stack_profile` from `<service.root>/forge-service.yaml` or fall back to the plugin's `forge.yaml`.

Spawn one `solution-architect` agent with the inputs above. The agent runs on Opus per its frontmatter.

The agent returns a single markdown document beginning with `# Architecture: <Task Title>`. Write it to `<task_dir>/architecture.md`, overwriting the template.

---

## Step 16 — GATE: architecture approval

Print:

```
─── Architecture ready for review ───
<full architecture.md body>
```

Prompt:

```
(a)pprove / (r)evise with feedback / (s)top
```

- **`a`** → continue to Step 17.
- **`r`** → ask: `What needs to change? (end with EOF):`. Append the developer's feedback to a refinement note and re-invoke the `solution-architect` agent with the same inputs PLUS a `feedback` parameter containing the new note (the agent prompt does not yet take this — pass it as part of `task_context` by appending `\n\nDeveloper feedback for revision: <note>` to the `spec` value before sending). Re-write `architecture.md`. Loop back to the start of Step 16.
- **`s`** → save and stop.

---

## Step 17 — Transition to planning and run phase-planner

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status planning "<workspace_root>"
```

Print: `Status: architecture → planning`.

Spawn one `phase-planner` agent with:

- `architecture` ← `<task_dir>/architecture.md`
- `spec` ← `<task_dir>/spec.md`
- `research` ← `<task_dir>/research.md`
- `services[]` ← `state.services[]` with `{ name, root, stack_profile }`
- `existing_plan` ← omit (this is the first run)

The agent returns a response containing:

1. The full `plan.md` body
2. The marker line `---PLAN-END---`
3. One `---CONTEXT-PHASE-N---` block per phase, each followed by the CONTEXT.md skeleton

### 17a — Persist plan and CONTEXT skeletons

1. Split the response on `---PLAN-END---`. Write the first part to `<task_dir>/plan.md`, overwriting the template.
2. Split the remainder on `---CONTEXT-PHASE-` markers. For each block:
   - Parse the phase number `N` from the marker.
   - `mkdir -p <task_dir>/phases/<NN>/` (two-digit padded).
   - Write the block body to `<task_dir>/phases/<NN>/CONTEXT.md`, overwriting any existing file.

### 17b — Populate state.phases[]

Parse the `Phase Overview` table from `plan.md`. For each row, build a phase entry:

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

Persist the entire array in one call:

```
node <plugin_root>/scripts/update-state.js "<task_dir>" phases '<json-array>' "<workspace_root>"
```

If the planner returned an empty `Phase Overview` table, do not write `phases`. Print the planner's failure note (`**Plan cannot be produced.** ...`) and stop with status left at `planning`.

---

## Step 18 — GATE: plan approval

Print:

```
─── Plan ready for review ───
<full plan.md body>
```

Prompt:

```
(a)pprove / (r)egenerate / (s)top
```

- **`a`** → continue to Step 19.
- **`r`** → re-run Step 17 (re-invoke the planner; CONTEXT skeletons and `state.phases` are rewritten). Loop back to the start of Step 18.
- **`s`** → save and stop. Print: `Plan saved unapproved. Run /forge:plan to review later, or /forge:plan --regenerate to retry.`

---

## Step 19 — Transition to phase-execution

```
node <plugin_root>/scripts/update-state.js "<task_dir>" status phase-execution "<workspace_root>"
node <plugin_root>/scripts/update-state.js "<task_dir>" current_phase 1 "<workspace_root>"
node <plugin_root>/scripts/update-state.js "<task_dir>" current_step discussion "<workspace_root>"
node <plugin_root>/scripts/update-state.js "<task_dir>" phases.0.status in-progress "<workspace_root>"
node <plugin_root>/scripts/update-state.js "<task_dir>" phases.0.started_at "<iso-now>" "<workspace_root>"
```

Print: `Status: planning → phase-execution. Phase 1 step: discussion.`

---

## Step 20 — Begin phase 1 discussion

Read `<task_dir>/phases/01/CONTEXT.md` (created in Step 17a). Print it to the developer:

```
─── Phase 1: <phase name> ───
<full CONTEXT.md body>
```

Then print the closing banner:

```
✓ Task <task_id> initialized through planning.

Phase 1 ready. The discussion step is yours — review the context, raise design questions,
sketch the implementation approach with the assistant, then run /forge:next when you are
ready to move to the planning step.

Useful commands:
  /forge:status           — see the dashboard
  /forge:plan             — view the full plan
  /forge:verify           — when phase 1 implementation is complete
  /forge:resume <slug>    — pick up after a session break
```

Stop the command. The developer drives subsequent phases with `/forge:next` and `/forge:verify`.

---

## Rules and Constraints

- **One source of truth.** `state.yaml` is the only place workflow position is recorded; every transition runs through `update-state.js`.
- **The orchestrator owns transitions.** Skills and agents never modify `state.yaml`. This command updates state at every gate and every phase transition.
- **Approval gates are blocking.** At Steps 9, 16, and 18 the command stops until the developer answers. Stopping at any of those points leaves a recoverable task on disk — `/forge:resume` picks it up.
- **Pass document contents verbatim.** Skills and agents need full context. Never summarise spec.md, research.md, external-research.md, or architecture.md before passing them.
- **Skill calls are stateless.** Each skill returns markdown. The orchestrator persists it.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/new.md` → plugin root is two levels up). All script invocations use absolute paths.
- **`init-task.js` is idempotent.** If the developer re-runs `/forge:new` with the same slug, the script reuses the existing task directory and template files. The orchestrator continues from `discovery` regardless.
- **No phase implementation here.** This command stops at the start of phase 1's discussion step. Implementation is the developer's job.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **`init-task.js` fails** → print stderr and stop. The task directory may be partially created; the script is idempotent so a re-run is safe.
- **`update-state.js` fails on any transition** → stop, print stderr, tell the developer to inspect `state.yaml` and re-run `/forge:resume <slug>`.
- **A skill returns its failure document** (e.g. `Status: Cannot draft ...`, `**Research could not run:** ...`) → write the file so the developer can inspect it, surface the failure to the developer, and stop. Do not advance the status.
- **An agent returns a failure document** (e.g. `**Architecture cannot be produced.** ...`, `**Plan cannot be produced.** ...`) → write the file but do not transition. Print the failure and stop. The developer can re-run `/forge:resume`.
- **Developer chooses `s` at any gate** → save and stop. The task is preserved with whatever status was reached. `/forge:resume <slug>` picks up exactly where it stopped.
- **Developer never provides input at the discovery prompt** → handled in Step 6: refuse and stop.
