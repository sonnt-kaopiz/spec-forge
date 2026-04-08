---
name: codebase-research
description: >
  Performs deep codebase analysis for service repositories in any language or framework.
  Use when "analyze the codebase", "understand the code", "find patterns",
  "trace execution", "explore the architecture", or at codebase-research
  phase of a spec-forge task.
---

# Skill: codebase-research

Orchestrates parallel `codebase-researcher` agents to produce a merged `research.md` for a service task. The calling command passes task context and target services; this skill returns a single merged markdown document.

This skill is stateless. It does not read or modify `state.yaml`.

---

## Inputs

The command invoking this skill must supply:

- `task_context` — the full or summarised `spec.md` content: problem statement, key requirements, target behavior. This is the lens every agent uses to decide what is relevant.
- `services[]` — one or more service repositories to explore. Each entry is `{ name, root }` where `root` is an absolute path to the service repository root.
- `complexity` — (optional) `standard` (default) or `complex`. Use `complex` for tasks that touch multiple domain models, involve cross-service data flows, or have significant database schema changes. Controls whether a third agent runs.

---

## Step 1 — Decide Agent Configuration

Select the agent roster based on `complexity`:

| complexity | Agents to spawn |
|---|---|
| `standard` (default) | Agent 1 + Agent 2 |
| `complex` | Agent 1 + Agent 2 + Agent 3 |

When `complexity` is not provided, default to `standard`.

The three agent roles and their `focus_area` values:

| # | Role | `focus_area` |
|---|---|---|
| Agent 1 | Similar features and reference implementations | `similar-features` |
| Agent 2 | Architecture, patterns, conventions | `architecture-patterns` |
| Agent 3 | Data flow, schema, dependencies | `data-flow-schema` |

---

## Step 2 — Spawn Agents in Parallel

Spawn all selected agents **simultaneously** — do not wait for one to finish before starting the next.

For each agent, pass:

- `task_context` — exactly as received by this skill
- `services[]` — exactly as received by this skill
- `focus_area` — as assigned in the table above

Each agent returns a structured markdown document matching the `codebase-researcher` output format (see Output Format Template below). Collect all responses as `agent_outputs[]` — one entry per agent, labelled by `focus_area`.

---

## Step 3 — Merge Outputs

After all agents return, merge their findings into a single `research.md` document using these rules:

### Merge strategy per section

| Section | Strategy |
|---|---|
| **Services Analyzed** | Take from Agent 2 (architecture-patterns); supplement with any extra services Agent 1 or 3 mentioned |
| **Architecture Overview** | Take from Agent 2 (most authoritative for architecture); append any high-level notes from Agent 1 that add context |
| **Existing Patterns** | Union all patterns from both/all agents. De-duplicate: if two agents describe the same pattern (same file:line), keep the fuller description. Preserve sub-heading per pattern. |
| **Similar Features** | Take from Agent 1 (similar-features); append any additional references Agent 2 found |
| **Key Files** | Union all entries. De-duplicate by file path. Merge Relevance cells if the same file appears in multiple agents. Cap at 15 rows total — prefer entries cited by more than one agent. |
| **Database Schema** | Take from Agent 3 if present; otherwise take from whichever agent covered it. Merge if multiple agents contributed schema notes. |
| **Dependencies** | Union all entries from all agents. De-duplicate by target/package name. |
| **Conventions Discovered** | Union all bullets. De-duplicate if agents say the same thing. |
| **Risks & Technical Debt** | Union all bullets. De-duplicate by file:line. |
| **Top 10 Essential Files** | Re-rank from the union of all agents' essential file lists. Files cited by more than one agent rank higher. Final list: up to 10 entries, ordered by cross-agent citation count, then by Agent 2's ranking within ties. |

### Missing sections

If a section from the template is absent in all agent outputs (e.g. no database schema found), write `—` in that section — never omit the heading.

---

## Step 4 — Return the Merged Document

Return the merged markdown as the skill output. The calling command will write this to the task's `research.md` file at the path defined in `state.yaml`.

Do not write any files yourself. Return markdown only.

---

## Output Format Template

The merged output must match this structure exactly. All headings are required.

```markdown
# Codebase Research Findings

**Task**: <task_context summary — first sentence or title>
**Services analyzed**: <service-name (stack)>, ...
**Agents used**: <similar-features, architecture-patterns> | <similar-features, architecture-patterns, data-flow-schema>

---

## Services Analyzed

- `<service-name>` — <language> <version>, <framework> <version>, manifest: `<manifest-file>`
- ...

---

## Architecture Overview

<3–6 sentences: how the analyzed services are structured, where the task fits in,
the main layers and boundaries involved. Name the framework-specific layers explicitly
(e.g. "Laravel HTTP layer → service layer → Eloquent models"). No file paths in this section.>

---

## Existing Patterns

### <Pattern or Flow Name> (Current)

- **Entry point**: `path/to/file.ext:LINE`
- **Key collaborator**: `path/to/other.ext:LINE`
- **Traced flow**:
  1. `routes/web.php:42` defines the route
  2. `app/Http/Controllers/FooController.php:18-55` handles the request and delegates to...
  3. `app/Services/FooService.php:24-89` which calls...
  4. `app/Models/Foo.php:12` for persistence
- **Pattern**: <Repository | Service layer | Command handler | Event/listener | etc.>
- **Why it matters for this task**: <one-line explanation>

<Repeat block for each distinct pattern/flow.>

### Similar Features (Reference Implementations)

- **<Feature X>** — mirrors the target task's <aspect>. Entry: `path/to/entry.ext:LINE`. Follows pattern Y (`path/to/pattern.ext:LINE`). Worth copying: <what to mirror>. Diverge on: <what to do differently>.
- ...

---

## Key Files

<Up to 15 files most relevant to this task. Prefer file:line ranges when a specific region matters.>

| File | Purpose | Relevance |
|------|---------|-----------|
| `app/Models/Example.php:15-80` | Example model with relations | Must be extended to support <field> |
| ... | ... | ... |

---

## Database Schema

<Tables/entities relevant to this task. For each, list only the columns and indexes
that matter for the implementation. Write "—" if the service does not touch a database.>

- **`<table_name>`** (`<migration or schema file>`)
  - `id` — primary key
  - `<column>` — `<type>`, `<constraints>` — <why it matters>
  - Indexes: `<name>` on `(<cols>)` — <purpose>
  - Foreign keys: `<col>` → `<other_table>.<col>`
- ...

---

## Dependencies

- **Internal** (service-to-service, shared libs, queues, events):
  - <target service> — <REST | event | queue | gRPC>, purpose: <…>, evidence: `path/to/client.ext:LINE`
  - ...
- **External** (composer/npm/pip packages, SDKs, third-party APIs):
  - `<package>` `<version>` — <purpose>, usage: `path/to/usage.ext:LINE`
  - ...

---

## Conventions Discovered

- **Naming**: <class suffixes, method naming, file casing — with a concrete example>
- **Directory placement**: <where new files of each type live — with a concrete example>
- **Testing**: <unit vs feature/integration layout, fixture/factory approach, mocking style — with a concrete example>
- **Error handling**: <exceptions/result types/middleware pattern — with a concrete example>
- **Other**: <logging, auth guard usage, transaction boundaries, anything else the implementer must mirror>

---

## Risks & Technical Debt

<Existing issues, gotchas, or debt that will affect this task's implementation.
Each bullet must be actionable — either "avoid X" or "expect to refactor Y first".
Write "—" if none found.>

- <risk or gotcha> — evidence: `path/to/file.ext:LINE`
- ...

---

## Top 10 Essential Files

<Up to 10 files the implementer should read first, ordered by cross-agent citation count then importance.
Each line must include a one-sentence reason.>

1. `path/to/file.ext:LINE` — <why this is essential>
2. `path/to/file.ext` — <why this is essential>
3. ...
```

---

## Rules and Constraints

- **Spawn agents in parallel.** Never run them sequentially — latency matters.
- **Pass `task_context` verbatim** to every agent. Do not summarise or truncate it.
- **Do not write files.** Return the merged markdown only. The calling command handles persistence.
- **All merged sections must be present** in the output, even if the value is `—`.
- **De-duplicate on file:line.** The same evidence must not appear twice in the merged output.
- **Self-contained.** This prompt includes everything needed. Do not assume CLAUDE.md or other context is loaded.

---

## Failure Handling

If one agent fails or returns an unusable response:
- Continue with the remaining agents' outputs.
- Note the failed focus area in the merged document's header: `**Note**: <focus_area> agent failed — findings may be incomplete.`
- Fill the sections primarily covered by that agent with what the other agents provided, or `—` if nothing was found.

If all agents fail:
- Return a well-formed document with all headings present.
- Fill every section with `—`.
- Add at the top: `**Research failed**: all codebase-researcher agents returned unusable responses. Manual codebase review required before proceeding.`

Never return an empty response. The calling command expects a parseable markdown document in all cases.
