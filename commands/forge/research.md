---
description: Run external technology research for the current task and write external-research.md
argument-hint: [task-id-or-slug] [extra topic to focus on...]
---

# forge:research

Run the `external-research` skill against the current task's stack to produce or refresh `<task_dir>/external-research.md`. The skill spawns the `external-researcher` agent and returns a single structured markdown document.

This command writes `external-research.md`. It may update `state.yaml > status` (only if it is currently `external-research`). It does not run any other phase.

---

## Step 1 — Parse Arguments

Split `$ARGUMENTS`. Decide:

- If the first token looks like a task slug or ID (matches `^SF-\d+` or contains no spaces and matches an existing task directory), treat it as `task_arg`. The remaining tokens become `focus_topic_text`.
- Otherwise, `task_arg` is empty and the entire `$ARGUMENTS` string is `focus_topic_text`.

`focus_topic_text` is a free-text hint to forward to the agent — empty is allowed.

---

## Step 2 — Resolve Workspace Root and Task

1. Resolve `workspace_root`:
   - If `forge-service.yaml` exists in cwd, read its `workspace_root` field.
   - Otherwise use cwd.
2. Resolve the target task using the same selection logic as `/forge:status`.
3. Hold `state` and `task_dir`.

---

## Step 3 — Validate prerequisites

- `<task_dir>/spec.md` must exist and be non-empty. If not:
  ```
  Cannot run external research: spec.md is missing. Run /forge:spec first.
  ```
  Stop.
- `state.services[]` must contain at least one entry, otherwise the stack identity is unknown. If empty:
  ```
  No services in state.services[]. Edit state.yaml to add the services involved before running /forge:research.
  ```
  Stop.

If `<task_dir>/research.md` exists and is non-empty, note it but do not require it — external research can run before, after, or alongside codebase research.

---

## Step 4 — Build the stacks[] input

For each service in `state.services[]`, construct a stack identity entry the skill can pass to the agent:

```yaml
- service: <service.name>
  language: <language>
  language_version: <version>
  framework: <framework>
  framework_version: <version>
  manifest: <manifest filename>
```

Resolution order for each field:

1. Read `<service.root>/forge-service.yaml`. If it has a `stack:` field, look up that profile in `<workspace_root>/.ai-workflow/forge.yaml`.
2. If no `forge-service.yaml`, use `service.stack_profile` from `state.services[]` to look up the profile.
3. If neither is set, attempt to detect by scanning the manifest file in `service.root`:
   - `composer.json` → PHP / Laravel or Yii2
   - `Gemfile` → Ruby / Rails
   - `package.json` → JavaScript / Express
   - `pyproject.toml` → Python / Django
   - `pom.xml` / `build.gradle*` → Java / Spring Boot
   - `go.mod` → Go / stdlib
4. If a service still has no resolvable language or framework, drop it from the list and warn:
   `Warning: service '<name>' has no resolvable stack — excluded from external research.`

If after these rules `stacks[]` is empty, stop with: `No stack identities resolved. Run /forge:map-codebase or edit forge-service.yaml.`

---

## Step 5 — Read the existing research file (refinement pass)

If `<task_dir>/external-research.md` exists and is non-empty, hold its content as `existing_research`. The skill will pass it to the agent so only stale or missing sections are updated.

If the file is missing or empty, omit `existing_research`.

---

## Step 6 — Invoke the external-research skill

Read `<task_dir>/spec.md` once and hold its content as `task_context`. (The skill expects the full spec body or a summary; pass the full body — do not summarise.)

Call the `external-research` skill with:

- `task_context` ← spec.md content (verbatim)
- `stacks[]` ← from Step 4
- `focus_topics` ← if `focus_topic_text` is non-empty, wrap it in a single-element list: `[focus_topic_text]`. Otherwise omit.
- `existing_research` ← from Step 5 (omit if not present)

The skill returns a single markdown document beginning with `# External Research:`. Hold it as `report`.

---

## Step 7 — Persist the document

Write `report` to `<task_dir>/external-research.md`. Overwrite any existing file — the skill is responsible for preserving approved content via its refine pass.

---

## Step 8 — Update state.yaml

- If `state.status == external-research`, leave it alone — `/forge:next` is responsible for the transition out.
- If `state.status` is earlier (`discovery`, `spec`, `codebase-research`), do not change `status` — research can run ahead of the formal phase, but the developer still controls when the gate moves.
- Append a session log entry recording the run:
  ```
  node <plugin_root>/scripts/update-state.js "<task-arg>" 'session_log[]' '{"command":"forge:research","at":"<iso-now>","focus":"<focus_topic_text or empty>"}' "<workspace_root>"
  ```

---

## Step 9 — Show the report

Print the full `external-research.md` to the developer (do not summarise). Below it, print:

```
Wrote <task_dir>/external-research.md (<line-count> lines)

Next:
  - Review the report. Re-run /forge:research with a topic to refine specific sections.
  - When the report is correct and status is external-research, run /forge:next to move to architecture.
```

---

## Rules and Constraints

- **The skill owns the agent call and the report shape.** Never spawn `external-researcher` from this command.
- **One skill call per invocation.** Multi-stack tasks are handled inside the skill — pass the full `stacks[]`, do not loop here.
- **Pass `task_context` verbatim.** Do not summarise the spec.
- **No URL fetches in this command.** All web access happens inside the agent.
- **`/forge:research` writes external-research.md and may append to session_log.** It never modifies `phases[]`, `services[]`, `current_phase`, or `status`.
- **Resolve `<plugin_root>` from this command file's location** (`commands/forge/research.md` → plugin root is two levels up). Pass absolute paths.
- **Self-contained.** Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

- **Skill returns a `Research could not run:` document** → still write the file so the developer can see the failure note, then print the failure header verbatim and stop.
- **Skill agent reports network failure** → write the file (the skill returns the agent's failure document unchanged) and surface the message to the developer.
- **`update-state.js` fails on the session_log append** → ignore — the file is already written and the log entry is non-critical. Print one warning line.
- **No services resolvable for stack identity** → stop before invoking the skill. Tell the user how to fix it (`forge-service.yaml` or `state.services[]`).
