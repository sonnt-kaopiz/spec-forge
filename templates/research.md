# Codebase Research: {{TASK_TITLE}}

**Task ID**: {{TASK_ID}}
**Slug**: {{TASK_SLUG}}
**Created**: {{CREATED_AT}}

---

## Services Analyzed

<!-- Bullet list of every service/module examined during research, with stack profile in parens -->

- e.g. user-service (Laravel 11)
-

---

## Architecture Overview

<!-- Short paragraph: how the relevant services are structured, their boundaries, and how this task fits in. Keep to 3–6 sentences. -->

---

## Existing Patterns

<!-- One sub-heading per pattern traced. Cite code with file:line references. Add more sub-sections as needed. -->

### {{PATTERN_NAME}} (Current)

- Entry point: `path/to/file.ext:LINE`
- Key collaborator: `path/to/other.ext:LINE`
- Traced flow: <!-- describe the step-by-step execution path with file:line refs -->

### Similar Features (Reference Implementations)

<!-- Analogous features already in the codebase that this task can mirror -->

- Feature X uses pattern Y — `path/to/file.ext:LINE`
-

---

## Key Files

<!-- The files most relevant to this task. Prefer file:line ranges when a specific region matters. -->

| File | Purpose | Relevance |
|------|---------|-----------|
| `app/Models/Example.php:15-80` | Example model | Must be extended |
| | | |

---

## Database Schema

<!-- Relevant tables and the specific columns that matter for this task -->

- `example_table`: <!-- relevant columns, types, constraints -->
-

---

## Dependencies

<!-- Split into internal (service-to-service) and external (packages, third-party APIs) -->

- **Internal**: <!-- service-to-service calls, shared libs, queues, events -->
- **External**: <!-- composer/npm packages, SDKs, third-party APIs -->

---

## Conventions Discovered

<!-- Naming conventions, directory structure patterns, testing patterns the new code should match -->

-

---

## Risks & Technical Debt

<!-- Existing issues, gotchas, or debt that will affect this task's implementation -->

-
