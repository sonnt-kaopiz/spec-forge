---
description: Implement a spec-forge task from its task spec file. Reads the task, loads context (templates + existing similar files), implements all deliverables, self-verifies each output against the spec and template, auto-fixes mismatches, and marks deliverables done in TODO.md.
argument-hint: <task-number>
---

# Implement Task

Implement one spec-forge task end-to-end: read its spec, gather context, create deliverables, self-verify each output, fix any mismatches, and mark the task complete.

## What This Command Does

1. **Resolve the task** — find the task file from `$ARGUMENTS`
2. **Gather context** — load architecture doc, templates, and existing similar files
3. **Implement deliverables** — create every file listed in "Deliverables"
4. **Self-verify** — run a structured checklist against each deliverable
5. **Auto-fix** — fix every mismatch found and re-verify until clean
6. **Mark complete** — update `TODO.md` and the task file

## Implementation Steps

### 1. Resolve the Task File

Map `$ARGUMENTS` to a file in `tasks/`:

```
"10"       → tasks/10-*.md
"10-agent" → tasks/10-*.md  (prefix match)
"03.1"     → tasks/03.1-*.md
```

Use `Glob` to find `tasks/$ARGUMENTS-*.md`. If no match, try `tasks/$ARGUMENTS.md`.

- Zero matches → report "No task file found for '$ARGUMENTS'" and stop
- Multiple matches → ask the developer to pick one, then proceed
- One match → proceed

Read the task file in full. Extract:
- **Phase** (e.g. `Phase: 3 - Agents`)
- **Deliverables** (every `[ ] path/to/file` line — these are what you must create)
- **Specification** block (frontmatter, responsibilities, output format, notes)

### 2. Check for Existing Decisions

If the task file contains a `## Decisions` section, extract those decisions. They narrow implementation choices and take precedence over defaults.

### 3. Gather Context

Read these files **in order** — later reads override earlier defaults:

**Always read:**
- `docs/system-architecture.md` — component rules, layer responsibilities, workflow states
- `tasks/TODO.md` — understand upstream/downstream dependencies for this task

**Based on deliverable type:**

| Deliverable type | Templates to read | Existing examples to read |
|---|---|---|
| `agents/*.md` | — (template is the output format in the spec itself) | `agents/codebase-researcher.md`, and any other agent closest to this task's tier |
| `skills/*/` | Any skills already implemented | `skills/codebase-research/` if it exists |
| `commands/forge/*/` | — | Any command already in `commands/forge/` |
| `scripts/*.js` | — | Closest existing script in `scripts/` |
| Templates (`templates/*.md`) | — | `templates/research.md` for reference structure |

Read the templates most relevant to the deliverable's **output format** (not the deliverable itself). For example, if implementing an agent that writes `research.md`, read `templates/research.md`. The task spec "Output format" field tells you which template to read.

### 4. Implement Each Deliverable

Work through the "Deliverables" list in the task file one at a time.

**Before writing any file:**
- Re-read the task spec "Specification" block for that deliverable
- Identify the output template this deliverable produces (from the "Output format" line)
- Read that template from `templates/` if not already read
- Note the `Responsibilities` list — every responsibility must be covered in the file you write

**Writing agents (`agents/*.md`):**

Agents follow this structure (learned from `codebase-researcher.md` and `codebase-mapper.md`):

```markdown
---
name: <name from spec>
description: <one-sentence description of what the agent does and when it is spawned>
tools: <exactly as listed in spec>
model: <exactly as listed in spec>
color: <exactly as listed in spec>
---

You are the **<name>** agent. [role + consumers + statelessness statement]

---

## Inputs
[What inputs the agent receives when spawned. Named parameters with types and descriptions.]

---

## Your Task
[Numbered steps: read inputs → explore/analyze/generate → return output]

---

## [Core Methodology Sections]
[One section per major responsibility from the spec. Actionable, step-by-step.]

---

## Output Format
[Verbatim template the agent must match, with every section from the corresponding template/]

---

## Rules and Constraints
[Bullet list of non-negotiable rules. Always includes: file:line citations, service root boundary,
output is markdown only, self-contained prompt, no state.yaml writes.]

---

## Failure Handling
[What to return when inputs are missing or the task cannot run. Always a valid markdown document.]
```

**Writing skills (`skills/<name>/`):**
- Create the skill directory
- Write `skills/<name>/SKILL.md` following the existing skill format (frontmatter + body)

**Writing scripts (`scripts/<name>.js`):**
- Node.js only, no external npm dependencies (built-in modules only)
- Must work on macOS and Linux
- Follow the pattern of existing scripts in `scripts/`

**Writing commands (`commands/forge/<name>/`):**
- Create the command directory
- Write the prompt markdown file following the format in `commands/forge/` if any exist

### 5. Self-Verify Each Deliverable

After writing each file, run the verification checklist. Report every item as pass (✓) or fail (✗).

**Universal checks (all deliverable types):**
- [ ] File exists at the path listed in "Deliverables"
- [ ] Every responsibility in the task spec "Responsibilities" list has corresponding content
- [ ] System workflow rules respected (see below)

**Agent-specific checks (`agents/*.md`):**
- [ ] Frontmatter `name:` matches the task spec exactly
- [ ] Frontmatter `tools:` matches the task spec exactly (comma-separated, no extras)
- [ ] Frontmatter `model:` matches the task spec exactly (`sonnet` or `opus`)
- [ ] Frontmatter `color:` matches the task spec exactly
- [ ] Agent explicitly states it is stateless and does NOT modify `state.yaml`
- [ ] Output format sections match the template named in "Output format" — every section present
- [ ] Failure handling section returns a well-formed document (never empty response)
- [ ] Prompt ends with "Self-contained" rule (no CLAUDE.md dependency)
- [ ] All inputs the orchestrator will pass are documented in the "Inputs" section

**Template-matching check:**
For each output section in the agent's "Output Format" block, verify a corresponding section exists in `templates/<name>.md`. Missing sections = mismatch.

**System workflow rules:**
- Agents: stateless, no `state.yaml` writes, structured markdown output
- Skills: no direct `state.yaml` writes
- Commands: may update `state.yaml` via scripts only
- Scripts: Node.js built-in modules only, cross-platform

### 6. Auto-Fix Loop

If any check failed:

1. List each failure with the fix needed
2. Edit the file to resolve every failure
3. Re-run the full verification checklist
4. Repeat until all checks pass

Cap the loop at **5 iterations**. If still failing after 5 iterations, stop and report what could not be resolved and why — do not continue editing indefinitely.

### 7. Mark Complete

Only after all deliverables verify clean:

**Update `tasks/TODO.md`:**
- Find the row for this task number
- Change `[ ]` to `[x]` in the Status column

**Update the task file itself:**
- Find each `- [ ] path/to/deliverable` line
- Change `[ ]` to `[x]`

**Report:**
```
Task #NN complete. N deliverable(s) created:
  ✓ path/to/file — [brief description of what it does]
  ✓ path/to/file — [...]

Verification: all checks passed.
Next task(s) unlocked: #NN, #NN (from TODO.md dependency graph)
```

## Important Rules

- **DO NOT implement tasks that have unresolved decisions** — if the task file has a `## Decisions` section with open questions (marked `?` or `TBD`), stop and ask the developer to run `/discuss-task` first
- **DO read similar existing files** before writing — consistency with existing agents/skills/commands matters more than novelty
- **DO NOT deviate from the task spec frontmatter** — `name`, `tools`, `model`, `color` must be copied verbatim
- **DO enforce high-level-only rules** — agents producing `architecture.md` or `plan.md` output must explicitly prohibit interfaces, SQL, file paths, and time estimates in their output
- **DO NOT skip verification** — the verify step is not optional, even when the output looks correct on inspection
- **DO update both files** — TODO.md and the task file, both must be updated before reporting completion

## Common Failure Modes to Check For

These are the issues most likely to appear on first implementation:

1. **Missing output template section** — the agent's "Output Format" block is missing a section that exists in the corresponding `templates/*.md` file
2. **Wrong tools** — tools in frontmatter don't match the spec (e.g. added `Write` when spec only listed `Read`)
3. **Statelessness not stated** — agent body doesn't explicitly say it won't write `state.yaml`
4. **Missing failure path** — agent has no "Failure Handling" section or the failure path returns empty
5. **Self-contained rule missing** — agent doesn't include the rule that it works without CLAUDE.md loaded
6. **Responsibility gap** — one of the "Responsibilities" bullets from the task spec has no corresponding methodology section in the agent body
7. **Inputs not documented** — the orchestrator passes named parameters but the agent's "Inputs" section doesn't describe them all

## Error Handling

If a template file referenced in the task spec cannot be found:
- Note which template was expected (e.g. `templates/plan.md`)
- Read the closest alternative and flag the gap in the verification report
- Do not invent a template structure

If a file to be created would overwrite an existing non-empty file:
- Report the conflict before writing
- Ask the developer whether to overwrite, skip, or diff-merge
- Default: do NOT overwrite without confirmation
