---
description: Map the codebase of your entire workspace (or specific services) into four system-level domain documents — stack, integration, architecture, and structure.
argument-hint: [service-name ...] (optional — omit to map all services)
---

# forge:map-codebase

Generate a codebase map for your workspace. Spawns parallel scout agents — one per service — then aggregates their findings into four system-level domain documents.

This command is stateless and safe to re-run at any time. It does not read or modify `state.yaml`.

---

## Step 1 — Resolve Workspace Root

Determine `workspace_root`:

1. Check if `forge-service.yaml` exists in the current working directory.
   - If yes: read it and extract the `workspace_root` field. Use that value as `workspace_root`.
   - If no: use the current working directory as `workspace_root`.

Report to the user: `Workspace root: <workspace_root>`

---

## Step 2 — Discover Services

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

**If the user provided `$ARGUMENTS`**: treat the arguments as a space-separated list of service directory names. Filter the discovered list to only those names. If a named service is not found in `workspace_root`, warn the user: `Warning: service '<name>' not found in <workspace_root> — skipping.`

Collect the final list as `services[]` — each entry is `{ name: <dir-name>, path: <absolute-path> }`.

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

For each service in `services[]`, spawn one **codebase-mapper** subagent with these exact inputs:

- `service_root`: `<service.path>` (absolute path)
- `output_path`: `<workspace_root>/.ai-workflow/codebase/scouts/<service.name>.md`

**Spawn all agents simultaneously** — do not wait for one to finish before starting the next.

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
✓ order-service    (done, 118 lines)
⚠ payment-service  (partial — docs/ directory not found, 87 lines)
✗ legacy-service   (failed — empty repository)
```

If **all** scouts failed: report `All scout agents failed. Cannot produce domain documents.` and stop.

---

## Step 5 — Read Scout Files

Read the output file for every scout whose status is `done` or `partial`. Skip scouts with status `failed`.

Hold all scout content in memory as `scout_data` — a map of `service_name → file_content`.

---

## Step 6 — Write Domain Documents

Using the content in `scout_data`, write the four domain documents below. For each document:

- Derive the **system name** from the `workspace_root` directory name, or from a common prefix/name found across `forge-service.yaml` files, or simply use the workspace root directory name.
- Use ISO 8601 format for the timestamp.
- When a field was not found in any scout, write `—` rather than omitting the row.
- If data for a section comes from only some services (others failed/partial), note `(partial data — <N> of <M> services)` in the section heading or a note below it.

### 6a — Write `stack.md`

Path: `<workspace_root>/.ai-workflow/codebase/stack.md`

```markdown
# Stack — <System Name>
_Generated: <timestamp> | Services: <N>_

## Overview
<One paragraph summarising the technology landscape: dominant language(s), frameworks,
shared infrastructure patterns, notable divergences across services.>

## Technology Matrix

| Service | Language | Version | Framework | Database | Cache | Queue |
|---------|----------|---------|-----------|----------|-------|-------|
| <name>  | <lang>   | <ver>   | <fw>      | <db>     | <cache> | <queue> |

## Per-Service Details

### <service-name>
- **Language**: <language> <version>
- **Framework**: <framework> <version>
- **Database**: <platform and version, or —>
- **Cache**: <platform, or —>
- **Queue / Messaging**: <platform, or —>
- **Key dependencies**:
  - ORM/data: <packages>
  - Auth: <packages>
  - HTTP client: <packages>
  - Testing: <packages>
  - Queue/jobs: <packages>
  - Observability: <packages>
- **Build tooling**: <Makefile present, docker-compose.yml present, CI: .github/workflows/, etc.>

<repeat ### block for each service>

## Shared Infrastructure
<Notes on tooling, CI/CD pipelines, Docker Compose setups, or environment patterns
shared across multiple services. Write — if nothing is shared.>
```

### 6b — Write `integration.md`

Path: `<workspace_root>/.ai-workflow/codebase/integration.md`

```markdown
# Integration — <System Name>
_Generated: <timestamp> | Services: <N>_

## Overview
<One paragraph summarising how services communicate: dominant mechanisms,
auth approach, external dependencies.>

## Communication Topology
<ASCII diagram or bullet-point list showing which services call/emit-to which.
Example:
  api-gateway  ──REST──►  user-service
  api-gateway  ──REST──►  order-service
  order-service  ──Event(Kafka)──►  notification-service
>

## Service Dependency Matrix

| From | To | Mechanism | Purpose |
|------|----|-----------|---------|
| <service> | <service> | <REST / Event / Queue / gRPC / ...> | <purpose> |

## Per-Mechanism Details

### REST / HTTP
<List of service-pair interactions with endpoint patterns and auth requirements.
Write — if no REST communication found.>

### Events / Message Queue
<Topics or queue names, producers, consumers, and payload shape summary.
Write — if no event/queue communication found.>

### Realtime
<WebSocket or SSE channels and subscribing services.
Write — if no realtime communication found.>

### Third-party Integrations
<Payment gateways, email providers, cloud storage, analytics, etc. across all services.
Write — if none found.>

## Authentication & Authorization
- **Mechanism**: <JWT / OAuth2 / session / API key>
- **Token issuance**: <which service issues tokens>
- **Validation points**: <which services validate, and how>
- **Auth guards per service**: <brief list>
```

### 6c — Write `architecture.md`

Path: `<workspace_root>/.ai-workflow/codebase/architecture.md`

```markdown
# Architecture — <System Name>
_Generated: <timestamp> | Services: <N>_

## Overview
<One paragraph summarising the system's architectural style, primary responsibilities,
and the relationship between major service groups.>

## Service Roles

| Service | Domain | Responsibility |
|---------|--------|----------------|
| <name> | <domain> | <one-line responsibility> |

## System Layers

| Layer | Services |
|-------|----------|
| Presentation / Edge | <services that are public-facing or act as API gateways> |
| Service Tier | <core business logic services> |
| Background Jobs | <worker or scheduler services> |
| Data Access | <notes on data ownership — shared DB, per-service DB, etc.> |

## Primary Data Flows

<For each major cross-service flow identified from the scouts, write a numbered flow:>

### <Flow Name>
1. Request enters at <service> via <mechanism>
2. <service> calls <service> via <mechanism>
3. <event/response> triggers <service>
4. ...

<If no cross-service flows could be inferred, write a note explaining what was found.>

## Entry Points
<For each service, list its primary entry point file(s) and their purpose:>
- `<service>`: `<file>` — <purpose>
```

### 6d — Write `structure.md`

Path: `<workspace_root>/.ai-workflow/codebase/structure.md`

```markdown
# Structure — <System Name>
_Generated: <timestamp> | Services: <N>_

## Overview
<One paragraph describing the workspace layout: monorepo vs polyrepo, how services
are organised at the filesystem level, any shared top-level directories.>

## Workspace Layout

```
<workspace_root_name>/
├── <service-a>/          ← <one-line purpose from Architecture domain>
├── <service-b>/          ← <one-line purpose>
├── <shared-dir>/         ← <one-line purpose, if present>
├── <infra-dir>/          ← infrastructure configs, if present
├── docker-compose.yml    ← if present at workspace root
└── ...
```

## Per-Service Directory Trees

<For each service, render a condensed directory tree using its Structure findings:>

### <service-name>
```
<service-name>/
├── <source-root>/
│   ├── <models-dir>/
│   ├── <controllers-dir>/
│   ├── <services-dir>/
│   └── ...
├── <migrations-dir>/
├── <tests-dir>/
├── <config-dir>/
└── <manifest-file>
```
Key paths:
- Models / domain: `<path>`
- Controllers / handlers: `<path>`
- Services / use cases: `<path>`
- Migrations: `<path>`
- Tests: `<path>`
- Config: `<path>`

<repeat ### block for each service>

## Shared / Common Directories
<List any directories at workspace root that are shared across services.
Write — if none found.>

## Layout Conventions
- **Layout type**: <monorepo | polyrepo | mixed>
- **Service naming**: <e.g. kebab-case, `*-service` suffix, or describe the pattern>
- **Consistent subdirectory conventions**: <any patterns shared across services, or —>
```

---

## Step 7 — Write `index.md`

Path: `<workspace_root>/.ai-workflow/codebase/index.md`

Count the lines written to each domain document. Then write:

```markdown
# Codebase Map — <System Name>
_Generated: <timestamp> | Services mapped: <N>_

| Document | Scope | Lines |
|----------|-------|-------|
| [Stack](stack.md) | Languages, frameworks, databases, dependencies | <N> |
| [Integration](integration.md) | Service communication, auth, external integrations | <N> |
| [Architecture](architecture.md) | Service roles, system layers, data flows | <N> |
| [Structure](structure.md) | Workspace layout, per-service folder trees | <N> |

## Services Mapped

| Service | Scout Status | Scout File |
|---------|-------------|------------|
| <name> | done (<N> lines) | [scouts/<name>.md](scouts/<name>.md) |
| <name> | partial — <reason> (<N> lines) | [scouts/<name>.md](scouts/<name>.md) |
| <name> | failed — <reason> | [scouts/<name>.md](scouts/<name>.md) |
```

---

## Step 8 — Report to User

Print a completion summary:

```
Codebase map written to <workspace_root>/.ai-workflow/codebase/

  stack.md          <N> lines
  integration.md    <N> lines
  architecture.md   <N> lines
  structure.md      <N> lines
  index.md          <N> lines

Scouts: <N> done, <N> partial, <N> failed
```

If any scouts were partial or failed, list them with their reasons:
```
Partial scouts (included with gaps):
  - payment-service: docs/ directory not found

Failed scouts (excluded from domain docs):
  - legacy-service: empty repository
```

---

## Error Handling

- **No services found**: Stop after Step 2 with a clear message.
- **All scouts failed**: Stop after Step 4. Do not write domain documents.
- **Some scouts failed**: Continue with the successful scouts. Note failures in `index.md` and the final report.
- **Output directory not writable**: Report the error and stop. Suggest checking permissions on `<workspace_root>/.ai-workflow/`.
- **Scout returns no JSON**: Treat as `{ status: "failed", reason: "no return value from agent" }`.
