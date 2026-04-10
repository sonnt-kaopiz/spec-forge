---
description: Map the codebase of your entire workspace (or specific services/domains) into system-level domain documents — stack, integration, architecture, and structure.
argument-hint: [stack|integration|architecture|structure] [service-name ...] (all optional)
---

# forge:map-codebase

Generate a codebase map for your workspace. Spawns parallel scout agents — one per service — then aggregates their findings into system-level domain documents.

This command is safe to re-run at any time. Existing scout files and domain documents are skipped unless they are missing. It does not read or modify `state.yaml`.

---

## Step 1 — Parse Arguments and Resolve Workspace Root

### 1a — Parse `$ARGUMENTS`

The known domain names are: `stack`, `integration`, `architecture`, `structure`.

Split `$ARGUMENTS` by spaces. For each token:
- If it matches one of the known domain names → add to `domains_filter[]`
- Otherwise → add to `service_filter[]` (treated as a service directory name)

If `domains_filter[]` is empty, all four domains are active (`domains_filter = ["stack", "integration", "architecture", "structure"]`).

Report to the user:
- If `domains_filter` was specified: `Domains: <domain-1>, <domain-2>, ...`
- If `service_filter` was specified: `Service filter: <name-1>, <name-2>, ...`

### 1b — Resolve Workspace Root

Determine `workspace_root`:

1. Check if `forge-service.yaml` exists in the current working directory.
   - If yes: read it and extract the `workspace_root` field. Use that value as `workspace_root`.
   - If no: use the current working directory as `workspace_root`.

Report to the user: `Workspace root: <workspace_root>`

---

## Step 2 — Discover Services

### 2a — Read Workspace-Level Documentation First

Before scanning directories, list all files directly inside `workspace_root` (non-recursive). Review the listing and identify any files that may describe the system — for example: `README.md`, `README`, `ARCHITECTURE.md`, `OVERVIEW.md`, `docker-compose.yml`, `docker-compose.yaml`, `docker-compose.override.yml`, `.env.example`, `Makefile`, `forge.yaml`, `forge-service.yaml`, or any `.md` file whose name suggests system documentation.

Do **not** use a fixed list of filenames to read — use your judgment based on what you see. Read only the files that appear likely to contain service names, service directories, or system topology. Skip files that appear to be changelogs, licenses, or unrelated configuration.

Extract any information about services (names, directories, descriptions) from the files you read. Store these hints as `doc_hints[]` — a list of candidate service directory names or paths found in documentation.

If no documentation files are found or none contain useful service information, note that and proceed to directory scanning.

### 2b — Discover Services from Directories

Scan the **immediate subdirectories** of `workspace_root` (one level deep only — do not recurse further). For each subdirectory, check whether it contains any of these service signals:

- `composer.json`
- `Gemfile`
- `package.json`
- `go.mod`
- `pyproject.toml`
- `requirements.txt`
- `pom.xml`
- `build.gradle` or `build.gradle.kts`
- `Cargo.toml`
- `*.csproj` or `*.sln`
- `forge-service.yaml`

A subdirectory qualifies as a service if it contains **at least one** of these files. Skip hidden directories (starting with `.`), `node_modules`, `vendor`, and non-directory entries.

**Merge with doc hints**: If `doc_hints[]` identified directories not found through signal-based discovery (e.g. a service listed in a README that lacks a manifest file), include them in `services[]` with a note `(from docs)`. If signal-based discovery finds directories not mentioned in docs, include them normally.

**If `service_filter[]` is non-empty** (from Step 1a): filter the discovered list to only those service names. If a named service is not found in `workspace_root`, warn the user: `Warning: service '<name>' not found in <workspace_root> — skipping.`

Collect the final list as `services[]` — each entry is `{ name: <dir-name>, path: <absolute-path> }`.

**Depth-2 fallback**: If no qualifying services are found at depth 1, scan one level deeper: for each immediate subdirectory of `workspace_root`, check *its* immediate children for service signals. If services are found, use those paths and report:
```
Note: services found at depth 2 under <grouping-dir>/ — using those as service roots.
```
This handles workspaces where services are grouped under `docker/`, `services/`, `apps/`, etc.

If `services` is empty after discovery and filtering: report `No services found in <workspace_root>. Nothing to map.` and stop.

Report to the user:
```
Found <N> service(s): <name-1>, <name-2>, ...
```

---

## Step 3 — Prepare Output Directory

Ensure the following directory exists (create it if absent):

```
<workspace_root>/.ai-workflow/codebase/scouts/
```

Use the Bash tool to create it: `mkdir -p <workspace_root>/.ai-workflow/codebase/scouts/`

---

## Step 4 — Scout All Services in Parallel

**Before spawning any scout**, check whether its output file already exists and is non-empty:

```
<workspace_root>/.ai-workflow/codebase/scouts/<service.name>.md
```

- If the file **exists and is non-empty**: skip spawning the agent for that service. Record a synthetic result: `{ service, status: "cached", lines: <file line count>, path: <output_path> }`. Report: `↩ <service-name>  (cached, <N> lines)`.
- If the file **is absent or empty**: spawn the scout agent.

For services that need scouting, spawn all **codebase-mapper** agents simultaneously with:

- `service_root`: `<service.path>` (absolute path)
- `output_path`: `<workspace_root>/.ai-workflow/codebase/scouts/<service.name>.md`

**Spawn all pending agents simultaneously** — do not wait for one to finish before starting the next.

Each agent will:
1. Explore its assigned service across all four domains (stack, integration, architecture, structure)
2. Write a structured findings file to its `output_path`
3. Return `{ status, lines, path, service, reason? }`

Collect all results into `scout_results[]`. A result has the shape:
```
{
  service: "<name>",
  status: "done" | "partial" | "failed",
  lines: <N>,
  path: "<output_path>",
  reason: "<optional failure/partial reason>"
}
```

After all agents return, report a brief status line per service:
```
✓ user-service     (done, 142 lines)
↩ order-service    (cached, 118 lines)
⚠ payment-service  (partial — docs/ directory not found, 87 lines)
✗ legacy-service   (failed — empty repository)
```

**Inline content extraction**: If a scout's response contains content delimited by `<<<SCOUT_CONTENT_BEGIN>>>` and `<<<SCOUT_CONTENT_END>>>`, extract that content and write it to the scout's `output_path` using the Write tool before recording the result. This handles the case where the scout's Write tool was denied and it returned content inline.

If **all** scouts failed: report `All scout agents failed. Cannot produce domain documents.` and stop.

---

## Step 5 — Read Scout Files

Read the output file for every scout whose status is `done`, `partial`, or `cached`. Skip scouts with status `failed`.

Hold all scout content in memory as `scout_data` — a map of `service_name → file_content`.

---

## Step 6 — Write Domain Documents

Using the content in `scout_data`, write the domain documents selected by `domains_filter[]`.

**If a domain is not in `domains_filter[]`, skip its document entirely** — do not write it, do not check if it exists.

**Templates**: Each document has a corresponding template in `templates/` (relative to the spec-forge plugin root, or wherever the plugin is installed). Read the template to get the exact structure, then fill in the placeholders with data from `scout_data`. Template files:
- `stack.md` → `templates/codebase-stack.md`
- `integration.md` → `templates/codebase-integration.md`
- `architecture.md` → `templates/codebase-architecture.md`
- `structure.md` → `templates/codebase-structure.md`

If a template file cannot be read, fall back to the inline format described in this step.

**Before writing each document**, check if it already exists and is non-empty (`ls -la <path>`). If it does, skip it and report: `↩ stack.md  (exists, skipped)`. This allows resuming after a partial run without overwriting completed work.

**Write each document as a separate Write tool call** — do not batch them. After each successful write, report to the user: `✓ stack.md written (<N> lines)`. If a write fails, retry once. If the retry also fails, write a condensed version containing only the Overview section and summary tables. Report: `⚠ stack.md — full write failed, wrote condensed version`. Continue to the next document regardless.

**Common rules for all documents:**

- Replace `{{SYSTEM_NAME}}` with the workspace root directory name, or a common name found across `forge-service.yaml` files.
- Replace `{{TIMESTAMP}}` with the current time in ISO 8601 format.
- Replace `{{SERVICE_COUNT}}` with the number of services in `scout_data`.
- When a field was not found in any scout, write `—` rather than omitting the row.
- If data for a section comes from only some services (others failed/partial), note `(partial data — <N> of <M> services)` in the section heading or a note below it.
- Remove HTML comments (`<!-- ... -->`) from the final output — they are guidance for the agent, not content.

### 6a — Write `stack.md`

Path: `<workspace_root>/.ai-workflow/codebase/stack.md`

Follow the structure in `templates/codebase-stack.md`. Populate:
- **Overview**: one paragraph on dominant languages, frameworks, shared infrastructure patterns, notable divergences.
- **Technology Matrix**: one row per service; use `—` for absent fields.
- **Per-Service Details**: one `###` block per service with full dependency breakdown.
- **Shared Infrastructure**: notes on shared CI/CD, Docker Compose, environment patterns; write `—` if nothing shared.

### 6b — Write `integration.md`

Path: `<workspace_root>/.ai-workflow/codebase/integration.md`

Follow the structure in `templates/codebase-integration.md`. Populate:
- **Overview**: one paragraph on communication mechanisms, auth approach, external dependencies.
- **Communication Topology**: ASCII diagram or bullet list of service-to-service connections.
- **Service Dependency Matrix**: one row per service-pair interaction.
- **Per-Mechanism Details**: REST/HTTP, Events/Queue, Realtime, Third-party — write `—` in each section if none found.
- **Authentication & Authorization**: mechanism, token issuance, validation points, per-service guards.

### 6c — Write `architecture.md`

Path: `<workspace_root>/.ai-workflow/codebase/architecture.md`

Follow the structure in `templates/codebase-architecture.md`. Populate:
- **Overview**: one paragraph on architectural style, primary responsibilities, relationship between service groups.
- **Service Roles**: one row per service — domain and one-line responsibility.
- **System Layers**: assign each service to Presentation/Edge, Service Tier, Background Jobs, or Data Access.
- **Primary Data Flows**: one numbered flow per major cross-service interaction; note if none found.
- **Entry Points**: primary entry file(s) per service with purpose.

### 6d — Write `structure.md`

Path: `<workspace_root>/.ai-workflow/codebase/structure.md`

Follow the structure in `templates/codebase-structure.md`. Populate:
- **Overview**: one paragraph on workspace layout, monorepo vs polyrepo, shared top-level directories.
- **Workspace Layout**: top-level workspace directory listing only — key files and folders with one-line purpose each. Do not recurse into service directories.
- **Per-Service Key Paths**: for each service, a bullet list of key paths (source root, models, controllers, services, migrations, tests, config, entry point). No directory trees.
- **Shared / Common Directories**: workspace-root directories shared across services; write `—` if none.
- **Layout Conventions**: layout type, service naming pattern, shared subdirectory conventions.

---

## Step 7 — Write `index.md`

Path: `<workspace_root>/.ai-workflow/codebase/index.md`

Read `templates/codebase-index.md`. Fill in `{{SYSTEM_NAME}}`, `{{TIMESTAMP}}`, `{{SERVICE_COUNT}}`, the line counts for each domain document, and one row per service in the Services Mapped table. Use the status variants noted in the template comments. Remove HTML comments from the final output.

---

## Step 8 — Report to User

Print a completion summary:

```
Codebase map written to <workspace_root>/.ai-workflow/codebase/

  stack.md          <N> lines       ← omit if domain was not in domains_filter
  integration.md    <N> lines
  architecture.md   <N> lines
  structure.md      <N> lines
  index.md          <N> lines

Scouts: <N> done, <N> cached, <N> partial, <N> failed
```

If any scouts were partial or failed, list them with their reasons:
```
Partial scouts (included with gaps):
  - payment-service: docs/ directory not found

Failed scouts (excluded from domain docs):
  - legacy-service: empty repository
```

If `domains_filter` was a subset, note which domains were skipped:
```
Domains skipped (not requested): integration, architecture, structure
```

---

## Error Handling

- **No services found**: Stop after Step 2 with a clear message.
- **All scouts failed**: Stop after Step 4. Do not write domain documents. (Cached scouts count as available — only stop if there are zero usable scouts.)
- **Some scouts failed**: Continue with the successful and cached scouts. Note failures in `index.md` and the final report.
- **Output directory not writable**: Report the error and stop. Suggest checking permissions on `<workspace_root>/.ai-workflow/`.
- **Scout returns no JSON**: Treat as `{ status: "failed", reason: "no return value from agent" }`.
