# System Architecture

## Overview

Spec-Forge is a Claude Code plugin that orchestrates spec-driven development for PHP microservices (Laravel & Yii2). It guides developers through a structured workflow — from requirement discovery to verified implementation — using specialized AI agents, persistent state tracking, and a multi-gate approval process.

The plugin operates as a **meta-prompt orchestration layer**: slash commands drive the workflow, skills encapsulate reusable capabilities, and agents perform focused analysis tasks. All coordination flows through a central state file (`state.yaml`) that acts as the single source of truth for task progress.

## System Context

```
+------------------------------------------------------------------+
|                        Developer (User)                          |
+------------------------------------------------------------------+
        |                                          ^
        | /forge:new, /forge:resume, etc.          | Status, gates,
        v                                          | outputs
+------------------------------------------------------------------+
|                      Spec-Forge Plugin                           |
|                    (Claude Code Extension)                        |
+------------------------------------------------------------------+
        |              |              |              |
        v              v              v              v
+------------+  +------------+  +------------+  +------------+
| Service A  |  | Service B  |  | Service C  |  |  External  |
| (Laravel)  |  |   (Yii2)  |  | (Laravel)  |  |   APIs &   |
|            |  |            |  |            |  |    Docs    |
+------------+  +------------+  +------------+  +------------+
```

Spec-Forge sits between the developer and their PHP microservice repositories. It reads codebases, generates specifications, designs architectures, and verifies implementations — all while maintaining persistent state across Claude Code sessions.

## Core Architecture

### Component Model

```
+---------------------------------------------------------------+
|                         Commands Layer                         |
|  /forge:new | /forge:resume | /forge:status | /forge:verify   |
|  /forge:next | /forge:spec | /forge:research | /forge:review  |
|  /forge:plan                                                  |
+---------------------------------------------------------------+
        |          |                    ^
        | invoke   | update             | read
        v          v                    |
+---------------+  +------------------+ |
|    Skills     |  |   state.yaml     |-+
|  (reusable    |  |  (single source  |
|  capabilities)|  |   of truth)      |
+---------------+  +------------------+
        |
        | spawn
        v
+---------------------------------------------------------------+
|                         Agents Layer                           |
|  codebase-researcher | spec-writer | external-researcher      |
|  solution-architect  | phase-planner | code-reviewer          |
|  context-reconstructor                                        |
+---------------------------------------------------------------+
        |                               |
        | read/analyze                  | verify
        v                               v
+--------------------+    +-----------------------------+
|  Service Codebases |    |  Verification Pipeline      |
|  (Laravel / Yii2)  |    |  phpunit | phpstan | pint   |
+--------------------+    +-----------------------------+
```

### Layered Responsibilities

| Layer | Responsibility | May modify state.yaml? |
|-------|---------------|----------------------|
| **Commands** | Orchestrate workflow, gate developer approvals, transition states | Yes |
| **Skills** | Wrap agents/tool sequences into reusable capabilities | No |
| **Agents** | Perform focused analysis tasks, return structured markdown | No |
| **Scripts** | Shell-level operations (init, verify, state manipulation) | Yes (via commands) |
| **Hooks** | Event-triggered automation (e.g., session start) | No (triggers skills) |

## Workflow Architecture

### Task Lifecycle

A task flows through a linear state machine with developer gates at critical transitions:

```
                    +-------------+
                    |  discovery  |
                    +------+------+
                           |
                           v
                    +------+------+
                    |    spec     |
                    +------+------+
                           |
                      [GATE: Developer approves spec]
                           |
              +------------+------------+
              |                         |
              v                         v
    +---------+----------+    +---------+----------+
    | codebase-research  |    | external-research  |
    | (parallel agents)  |    |                    |
    +---------+----------+    +---------+----------+
              |                         |
              +------------+------------+
                           |
                           v
                    +------+------+
                    | architecture|
                    | (opus model)|
                    +------+------+
                           |
                      [GATE: Developer approves architecture]
                           |
                           v
                    +------+------+
                    |  planning   |
                    +------+------+
                           |
                      [GATE: Developer approves plan]
                           |
                           v
              +------------+------------+
              |    phase-execution      |
              |                         |
              |  For each phase:        |
              |  1. discussion          |
              |  2. planning            |
              |  3. implementation      |
              |  4. verification ----+  |
              |       |             |   |
              |  [GATE: pass]  [fail: retry up to 3x]
              |       |             |   |
              |       v             +---+
              +-------+----------------+
                      |
                      v
               +------+------+
               |  completed  |
               +-------------+
```

### State Transitions

Valid states: `discovery` -> `spec` -> `codebase-research` -> `external-research` -> `architecture` -> `planning` -> `phase-execution` -> `completed`

Exceptional states: `blocked`, `abandoned` (reachable from any state)

Within `phase-execution`, each phase cycles through steps: `discussion` -> `planning` -> `implementation` -> `verification`

## Agent Architecture

### Agent Roster

```
+--------------------------------------------------------------------+
|                        Agent Deployment Map                         |
+--------------------------------------------------------------------+
|                                                                    |
|  RESEARCH TIER (Yellow, Sonnet)                                    |
|  +-------------------------+  +-------------------------+          |
|  | codebase-researcher x2  |  | external-researcher x1  |         |
|  | - Similar features      |  | - Official docs         |         |
|  | - Architecture/patterns |  | - Composer packages     |         |
|  | - Data flow/schema      |  | - Reference impls       |         |
|  +-------------------------+  +-------------------------+          |
|                                                                    |
|  GENERATION TIER (Green, Sonnet)                                   |
|  +-------------------------+  +-------------------------+          |
|  | spec-writer x1          |  | phase-planner x1        |         |
|  | - Spec from any source  |  | - Dependency ordering   |         |
|  | - Completeness check    |  | - Service assignment    |         |
|  | - Ambiguity detection   |  | - CONTEXT.md generation |         |
|  +-------------------------+  +-------------------------+          |
|                                                                    |
|  ARCHITECTURE TIER (Green, Opus)                                   |
|  +----------------------------------------------------------+     |
|  | solution-architect x1                                      |    |
|  | - PHP interfaces & class signatures                        |    |
|  | - Database schema & migrations                             |    |
|  | - API contracts for cross-service communication            |    |
|  | - Decisive: one approach, no option lists                  |    |
|  +----------------------------------------------------------+     |
|                                                                    |
|  REVIEW TIER (Red, Sonnet)                                         |
|  +-------------------------+                                       |
|  | code-reviewer x2        |                                       |
|  | - Parallel focus areas  |                                       |
|  | - Confidence >= 80      |                                       |
|  | - Critical/Important/   |                                       |
|  |   Minor severity        |                                       |
|  +-------------------------+                                       |
|                                                                    |
|  SESSION TIER (Yellow, Sonnet)                                     |
|  +-------------------------+                                       |
|  | context-reconstructor x1|                                       |
|  | - Reads state.yaml      |                                       |
|  | - Loads phase-relevant  |                                       |
|  |   docs only             |                                       |
|  | - Output capped 2000tok |                                       |
|  +-------------------------+                                       |
+--------------------------------------------------------------------+
```

### Agent Data Flow

```
                     spec.md
                        |
            +-----------+-----------+
            |                       |
            v                       v
    research.md             external-research.md
            |                       |
            +-----------+-----------+
                        |
                        v
              architecture.md  <-- solution-architect (Opus)
                        |
                        v
                   plan.md + CONTEXT.md per phase
                        |
                        v
              [Implementation by developer + Claude]
                        |
                        v
                review.md  <-- code-reviewer (parallel)
```

Each agent produces a structured markdown document. Downstream agents consume upstream documents as input. The orchestrating command manages this data flow — agents themselves are stateless.

## Configuration Architecture

### Two-Level Configuration

```
spec-forge/                          Service Repo/
+------------------+                 +---------------------+
| forge.yaml       |  <-- defaults   | forge-service.yaml  |
|                  |                 |                     |
| frameworks:      |                 | service_name: "..."  |
|   laravel: ...   |  overridden by  | framework: "laravel" |
|   yii2: ...      |  ------------> | verification:        |
| verification:    |                 |   phpstan:           |
|   require_*: ... |                 |     level: 9         |
| agents:          |                 +---------------------+
|   architect: opus|
+------------------+
```

- **`forge.yaml`** (central): Global defaults for framework paths, verification requirements, agent configuration
- **`forge-service.yaml`** (per-service): Overrides for service-specific settings (framework, PHP version, custom paths, verification tweaks)

### Verification Pipeline

```
+----------+     +---------+     +------+     +-------------+     +----------+
|  phpunit |---->| phpstan |---->| pint |---->| code-review |---->| developer|
|  (tests) |     | (static)|     |(style)|    | (agents)    |     | approval |
+----------+     +---------+     +------+     +-------------+     +----------+
     |                |              |              |
     v                v              v              v
  pass/fail       pass/fail      pass/fail     approved/
                                              changes-requested

On failure: auto-retry up to 3x (configurable in forge.yaml)
Style issues: auto-fixed by pint when auto_fix_style: true
```

All four checks must pass before a phase is considered complete. Each result is recorded in `state.yaml` under the phase's `verification` block.

## State Management

### State File Structure

The `state.yaml` file tracks everything about a task:

```
state.yaml
+-- task (id, title, source, tags)
+-- status (current workflow state)
+-- current_phase (numeric index)
+-- current_step (within phase)
+-- services[] (repos involved, per-service status)
+-- phases[] (per-phase status + verification results)
+-- blockers[] (with timestamps)
+-- session_log[] (session history for context reconstruction)
```

### Session Continuity

```
Session ends                          Session resumes
     |                                      |
     v                                      v
state.yaml persisted              /forge:resume [task-id]
on disk in service repo                     |
                                            v
                                context-reconstructor agent
                                reads state.yaml + relevant docs
                                            |
                                            v
                                Developer sees status dashboard
                                continues from saved position
```

The context-reconstructor agent is optimized for speed: it reads only the documents relevant to the current phase and produces a compact summary (max 2000 tokens) so the developer can resume work without re-reading everything.

## Cross-Service Coordination

Spec-Forge manages tasks that span multiple microservices:

```
Task: "Add user notification preferences"
+-------------------------------------------------------+
| state.yaml                                            |
|                                                       |
| services:                                             |
|   - name: user-service         status: completed      |
|   - name: notification-service status: in-progress    |
|   - name: api-gateway          status: pending        |
|                                                       |
| phases:                                               |
|   1: Add preferences model    -> user-service         |
|   2: Add notification channels -> notification-service|
|   3: Wire up API endpoints    -> api-gateway          |
+-------------------------------------------------------+
```

Each phase targets a specific service. The phase-planner agent orders phases by dependency so that downstream services build on completed upstream work.

## Security Considerations

- **No credential storage**: Spec-Forge never stores API keys or credentials. Service authentication is handled by the developer's existing tooling.
- **Read-heavy by design**: Agents primarily read and analyze code. Write operations happen through standard Claude Code tool calls, subject to the user's permission settings.
- **Developer gates**: Critical decisions (spec approval, architecture approval, plan approval) always require explicit developer confirmation before proceeding.
- **Verification as guardrail**: The phpunit/phpstan/pint pipeline catches issues before they propagate. Code review agents add a second layer of automated review.

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Plugin runtime | Claude Code plugin system |
| Agent orchestration | Claude Code subagents (Sonnet / Opus) |
| State persistence | YAML files on disk |
| Configuration | YAML (forge.yaml, forge-service.yaml) |
| Verification tools | PHPUnit, PHPStan, Laravel Pint / PHP-CS-Fixer |
| Shell scripts | Bash (POSIX-compatible) |
| Target frameworks | Laravel 11, Yii2 2.0 |
| Supported platforms | macOS, Linux |
