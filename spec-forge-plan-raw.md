Now I have all the information needed. Let me produce the comprehensive design.

---

# Spec-Forge: Complete Architecture Design

## 1. Plugin Directory Structure

The spec-forge repository is the distributable Claude Code plugin. The plugin code lives at the root. When a service repo installs spec-forge as a plugin, Claude Code copies the plugin components (agents, skills, commands, hooks, scripts) to its cache.

All runtime output (task state, specs, research, architecture docs, codebase maps, etc.) is written to `.ai-workflow/` at the **central workspace root** — the parent folder that holds all service repos of the microservice system. This folder is NOT inside spec-forge or any individual service repo.

```
spec-forge/
├── .claude-plugin/
│   └── plugin.json
│
├── commands/
│   └── forge/
│       ├── new.md                    # /forge:new <name> — create task
│       ├── resume.md                 # /forge:resume [task-id] — resume from state
│       ├── status.md                 # /forge:status — show task/phase dashboard
│       ├── next.md                   # /forge:next — advance to next phase
│       ├── verify.md                 # /forge:verify — run verification suite
│       ├── spec.md                   # /forge:spec — generate/edit specification
│       ├── research.md               # /forge:research — run external research
│       ├── plan.md                   # /forge:plan — view/regenerate plan
│       └── review.md                 # /forge:review — run code review cycle
│
├── agents/
│   ├── codebase-researcher.md        # Yellow — explores service repo patterns
│   ├── spec-writer.md                # Green — generates/validates specs
│   ├── external-researcher.md        # Yellow — researches Laravel/Yii2 docs
│   ├── solution-architect.md         # Green — designs solutions
│   ├── phase-planner.md              # Green — breaks architecture into phases
│   ├── code-reviewer.md              # Red — reviews code quality
│   └── context-reconstructor.md      # Yellow — rebuilds context on resume
│
├── skills/
│   ├── codebase-research/
│   │   └── SKILL.md
│   ├── spec-generation/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── spec-template.md
│   │       └── spec-examples.md
│   ├── external-research/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── laravel-patterns.md
│   │       └── yii2-patterns.md
│   ├── verification/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── run-verification.js
│   └── context-reconstruction/
│       └── SKILL.md
│
├── hooks/
│   ├── hooks.json                    # SessionStart auto-detection hook
│   └── detect-active-task.js         # Script that checks for active task state
│
├── scripts/
│   ├── verify-php.js                 # Runs phpunit+phpstan+pint pipeline
│   ├── init-task.js                  # Creates task directory structure
│   ├── read-state.js                 # Reads and outputs state.yaml as JSON
│   └── update-state.js              # Atomic state.yaml updates
│
├── templates/
│   ├── state.yaml                    # Template for new task state
│   ├── spec.md                       # Template for specification document
│   ├── research.md                   # Template for codebase research output
│   ├── external-research.md          # Template for external research output
│   ├── architecture.md               # Template for architecture document
│   ├── plan.md                       # Template for phased plan
│   ├── phase-context.md              # Template for phase CONTEXT.md
│   ├── phase-plan.md                 # Template for phase PLAN.md
│   ├── phase-verification.md         # Template for phase VERIFICATION.md
│   └── phase-result.md              # Template for phase RESULT.md
│
├── CLAUDE.md                         # Project guidance loaded automatically
├── AGENTS.md                         # Agent coordination guidance
├── forge.yaml                        # Default configuration (copied to service repos)
├── README.md
├── LICENSE
├── CHANGELOG.md
│
└── tasks/                            # BUILD TASKS — plugin implementation specs only
    └── *.md                          # Task specs for building spec-forge itself
```

All runtime output lives at the **central workspace root** in `.ai-workflow/`:

```
<workspace-root>/                     # Parent folder holding all service repos
├── .ai-workflow/                     # ALL plugin runtime output
│   ├── codebase/                     # Codebase map output (forge:map-codebase)
│   │   ├── index.md
│   │   ├── stack.md
│   │   ├── integration.md
│   │   ├── architecture.md
│   │   └── structure.md
│   └── tasks/                        # Per-task runtime artifacts
│       └── SF-042-user-auth-refactor/
│           ├── spec.md               # The requirement specification
│           ├── research.md           # Codebase research findings
│           ├── external-research.md  # External tech research findings
│           ├── architecture.md       # Solution architecture
│           ├── plan.md               # Phased implementation plan
│           ├── state.yaml            # Source of truth for task state
│           ├── services/             # Per-service tracking
│           │   ├── api-gateway.yaml
│           │   └── user-service.yaml
│           ├── phases/
│           │   ├── 01-database-migration/
│           │   │   ├── CONTEXT.md
│           │   │   ├── PLAN.md
│           │   │   ├── VERIFICATION.md
│           │   │   └── RESULT.md
│           │   ├── 02-model-layer/
│           │   │   ├── CONTEXT.md
│           │   │   ├── PLAN.md
│           │   │   ├── VERIFICATION.md
│           │   │   └── RESULT.md
│           │   └── 03-api-endpoints/
│           │       └── ...
│           └── logs/
│               ├── 2026-04-03-session-1.md
│               └── 2026-04-03-session-2.md
├── user-service/                     # Service repo
├── api-gateway/                      # Service repo
└── ...
```

---

## 2. Task Documentation Structure — File Purposes and Schemas

### `state.yaml` — The Source of Truth

This is the single most important file. Every resume, every status check, every phase transition reads this file first. It must be human-readable and git-diffable.

```yaml
# state.yaml schema
version: 1
task:
  id: "SF-042"
  slug: "SF-042-user-auth-refactor"
  title: "Refactor user authentication to support OAuth2"
  description: "Migrate from session-based auth to OAuth2 with backward compatibility"
  created_at: "2026-04-01T09:00:00Z"
  updated_at: "2026-04-03T14:30:00Z"
  assignee: "sonnt"
  source: "jira:AUTH-1234"          # or "manual", "linear:ISS-456", "github:42"
  tags: ["auth", "breaking-change", "multi-service"]

status: "phase-execution"            # discovery | spec | codebase-research |
                                     # external-research | architecture | planning |
                                     # phase-execution | completed | blocked | abandoned

current_phase: 2                     # 0-indexed refers to phases list
current_step: "implementation"       # discussion | planning | implementation | verification

services:
  - name: "user-service"
    repo: "git@github.com:team/user-service.git"
    branch: "feature/SF-042-oauth2"
    status: "in-progress"            # pending | in-progress | completed | blocked
  - name: "api-gateway"
    repo: "git@github.com:team/api-gateway.git"
    branch: "feature/SF-042-oauth2"
    status: "pending"

phases:
  - id: 1
    name: "Database migration"
    status: "completed"              # pending | in-progress | completed | failed | skipped
    service: "user-service"
    started_at: "2026-04-01T10:00:00Z"
    completed_at: "2026-04-01T16:00:00Z"
    verification:
      phpunit: "pass"
      phpstan: "pass"
      pint: "pass"
      review: "approved"
  - id: 2
    name: "Model layer refactor"
    status: "in-progress"
    service: "user-service"
    started_at: "2026-04-02T09:00:00Z"
    completed_at: null
    verification:
      phpunit: null
      phpstan: null
      pint: null
      review: null
  - id: 3
    name: "API endpoint migration"
    status: "pending"
    service: "api-gateway"
    started_at: null
    completed_at: null
    verification:
      phpunit: null
      phpstan: null
      pint: null
      review: null

blockers: []
  # - description: "Waiting for DBA approval on migration"
  #   created_at: "2026-04-02T11:00:00Z"
  #   resolved_at: null

session_log:
  - session: "2026-04-01-session-1"
    phases_worked: [1]
    duration_minutes: 360
  - session: "2026-04-02-session-1"
    phases_worked: [1, 2]
    duration_minutes: 240
```

### `spec.md` — The Requirement Specification

The formal requirement document that all downstream work derives from. Generated from any source (manual, Jira, interactive Q&A) but always normalized to this format.

```markdown
# Specification: [Task Title]

## Source
- **Origin**: Jira AUTH-1234 / Manual / Interactive Q&A
- **Author**: [who wrote/requested]
- **Date**: 2026-04-01

## Problem Statement
[2-3 sentences: what problem does this solve and why now]

## Requirements

### Functional Requirements
1. [FR-1] The system MUST ...
2. [FR-2] The system MUST ...
3. [FR-3] The system SHOULD ...

### Non-Functional Requirements
1. [NFR-1] Response time MUST remain under 200ms
2. [NFR-2] Backward compatibility MUST be maintained for 2 releases

### Out of Scope
- [Explicitly listed items NOT included]

## Acceptance Criteria
- [ ] AC-1: When [condition], then [expected result]
- [ ] AC-2: When [condition], then [expected result]

## Constraints
- Must work with PHP 8.2+
- Must support both Laravel 11 and Yii2 advanced
- Database: MySQL 8.0

## Open Questions
- [Any unresolved items from spec generation phase]

## Clarifications Log
- Q: [question asked during clarification]
  A: [answer received]
```

### `research.md` — Codebase Research Findings

Output of the codebase research phase. Documents existing patterns, architecture, and relevant code.

```markdown
# Codebase Research: [Task Title]

## Services Analyzed
- user-service (Laravel 11)
- api-gateway (Yii2 advanced)

## Architecture Overview
[High-level description of how the relevant services are structured]

## Existing Patterns

### Authentication Flow (Current)
- Entry point: `app/Http/Middleware/Authenticate.php:34`
- Session handling: `app/Services/AuthSessionManager.php`
- [Traced execution flow with file:line references]

### Similar Features (Reference Implementations)
- [Feature X uses pattern Y — file:line references]

## Key Files
| File | Purpose | Relevance |
|------|---------|-----------|
| `app/Models/User.php:15-80` | User model | Must be extended |
| `app/Services/AuthService.php` | Auth logic | Must be refactored |

## Database Schema
- `users` table: [relevant columns]
- `sessions` table: [relevant columns]

## Dependencies
- Internal: [service-to-service calls]
- External: [packages, APIs]

## Conventions Discovered
- [Naming conventions, directory structure patterns, testing patterns]

## Risks & Technical Debt
- [Existing issues that affect this task]
```

### `external-research.md` — External Technology Research

Output of external research phase. Documents best practices from Laravel/Yii2 docs, similar open-source implementations, and relevant package options.

```markdown
# External Research: [Task Title]

## Technology References

### Laravel OAuth2 Implementation
- Official docs: [key points from Laravel Passport/Sanctum docs]
- Recommended approach: [with reasoning]
- Packages evaluated:
  - laravel/passport: [pros/cons]
  - laravel/sanctum: [pros/cons]

### Yii2 OAuth2 Integration
- Extension options: [yii2-authclient, etc.]
- Recommended approach: [with reasoning]

## Similar Implementations Studied
- [Open source project X: how they solved a similar problem]
- [Blog post Y: relevant pattern]

## Best Practices
1. [Practice 1 with source reference]
2. [Practice 2 with source reference]

## Recommendations
- [Concrete recommendation with justification]
```

### `architecture.md` — Solution Architecture

The design document produced by the architect agent, reviewed and approved by the developer.

```markdown
# Architecture: [Task Title]

## Approach
[Selected approach name and 2-3 sentence summary]

## Component Design

### [Component 1: OAuth2 Token Service]
- **Location**: `app/Services/OAuth2TokenService.php`
- **Responsibility**: [what it does]
- **Interface**:
  ```php
  interface OAuth2TokenServiceInterface {
      public function issueToken(User $user, array $scopes): AccessToken;
      public function refreshToken(string $refreshToken): AccessToken;
      public function revokeToken(string $tokenId): void;
  }
  ```
- **Dependencies**: [what it needs]

### [Component 2: ...]

## Data Flow
[Step-by-step data flow for primary use case]

## Database Changes
- New table: `oauth_access_tokens` [schema]
- Modified table: `users` [changes]
- Migration strategy: [how to migrate existing data]

## API Changes
- `POST /oauth/token` — new endpoint
- `GET /api/user` — modified (accept Bearer token)

## Cross-Service Impact
- api-gateway: [what changes]
- user-service: [what changes]

## Testing Strategy
- Unit tests: [what to test]
- Integration tests: [what to test]
- Migration test: [how to verify data migration]

## Rejected Alternatives
- [Alternative A]: rejected because [reason]

## Developer Approval
- [ ] Approved by: _____ on _____
```

### `plan.md` — Phased Implementation Plan

Breaks the architecture into sequential implementation phases.

```markdown
# Implementation Plan: [Task Title]

## Phase Overview
| # | Phase | Service | Est. Effort | Dependencies |
|---|-------|---------|-------------|-------------|
| 1 | Database migration | user-service | 2h | None |
| 2 | Model layer refactor | user-service | 4h | Phase 1 |
| 3 | API endpoint migration | api-gateway | 3h | Phase 2 |

## Phase 1: Database Migration
- **Service**: user-service
- **Goal**: Create OAuth2 tables and migrate existing session data
- **Files to create/modify**:
  - `database/migrations/2026_04_01_create_oauth_tokens.php` (new)
  - `database/migrations/2026_04_01_migrate_sessions.php` (new)
- **Verification**: Migration runs cleanly, rollback works, existing tests pass
- **Risk**: Data migration on large users table — test on staging first

## Phase 2: Model Layer Refactor
[same structure]

## Phase 3: API Endpoint Migration
[same structure]
```

### Phase Files (`phases/<NN>-<name>/`)

#### `CONTEXT.md` — Phase Context (What This Phase Needs to Know)

This is the token-optimized context document. It contains ONLY what is needed for this specific phase -- not the entire task history.

```markdown
# Phase 2 Context: Model Layer Refactor

## Objective
Refactor User model and create OAuth2Token model to support token-based auth.

## From Previous Phases
- Phase 1 completed: `oauth_access_tokens` and `oauth_refresh_tokens` tables exist
- Migration verified: all existing users have `legacy_session_id` column populated

## Relevant Architecture Decisions
- Using Repository pattern (matches existing `UserRepository`)
- Token service is a standalone service class, not a model concern
- Scopes stored as JSON column, not pivot table

## Key Files to Read
- `app/Models/User.php` — extend with token relationship
- `app/Repositories/UserRepository.php` — reference for repository pattern
- `database/migrations/2026_04_01_create_oauth_tokens.php` — schema reference

## Constraints
- User model changes must not break existing Eloquent queries
- All new methods must have PHPDoc blocks
```

#### `PLAN.md` — Phase Implementation Plan

```markdown
# Phase 2 Plan: Model Layer Refactor

## Steps
1. Create `app/Models/OAuthAccessToken.php`
   - Extends Model
   - Relationships: belongsTo User
   - Casts: scopes as array, expires_at as datetime
2. Create `app/Models/OAuthRefreshToken.php`
   - [similar structure]
3. Modify `app/Models/User.php`
   - Add hasMany relationship to OAuthAccessToken
   - Add `activeTokens()` scope
4. Create `app/Services/OAuth2TokenService.php`
   - Implement interface from architecture doc
5. Create `tests/Unit/OAuth2TokenServiceTest.php`
6. Create `tests/Unit/OAuthAccessTokenTest.php`

## Verification Plan
- phpunit: `--filter OAuth` must pass
- phpstan: level 8, no new errors
- pint: no style violations
- Review focus: model relationships, service interface compliance
```

#### `VERIFICATION.md` — Verification Results

```markdown
# Phase 2 Verification

## PHPUnit
- **Status**: PASS
- **Command**: `php artisan test --filter OAuth`
- **Results**: 12 tests, 34 assertions, 0 failures
- **Coverage**: OAuth2TokenService 94%, Models 100%

## PHPStan
- **Status**: PASS
- **Level**: 8
- **Command**: `vendor/bin/phpstan analyse app/Models/OAuth* app/Services/OAuth*`
- **Errors**: 0

## Pint
- **Status**: PASS (2 files auto-fixed)
- **Command**: `vendor/bin/pint app/Models/OAuth* app/Services/OAuth*`

## Agent Code Review
- **Status**: APPROVED with notes
- **Findings**:
  - [MINOR] Consider adding index on `expires_at` for cleanup queries
  - [INFO] Token generation uses `Str::random(64)` — sufficient for this use case

## Developer Approval
- **Status**: APPROVED
- **Approved by**: sonnt
- **Notes**: "Add the expires_at index in a follow-up migration"
```

#### `RESULT.md` — Phase Completion Summary

```markdown
# Phase 2 Result: Model Layer Refactor

## Completed
- Created OAuthAccessToken model with User relationship
- Created OAuthRefreshToken model
- Extended User model with token relationships and scopes
- Created OAuth2TokenService with full CRUD operations
- 12 unit tests covering all service methods

## Files Modified
- `app/Models/User.php` — added relationships (lines 45-62)
- `app/Models/OAuthAccessToken.php` — new file
- `app/Models/OAuthRefreshToken.php` — new file
- `app/Services/OAuth2TokenService.php` — new file
- `tests/Unit/OAuth2TokenServiceTest.php` — new file
- `tests/Unit/OAuthAccessTokenTest.php` — new file

## Deferred Items
- Index on `expires_at` column (follow-up migration)

## Impact on Next Phase
- Phase 3 can now use OAuth2TokenService to issue tokens from API endpoints
- User model's `activeTokens()` scope is available for gateway auth middleware
```

---

## 3. State Management Design

### State Transitions

```
[NEW] → discovery → spec → codebase-research → external-research → architecture → planning → phase-execution → completed
                                                                                                    ↑          ↓
                                                                                                    ←── (loop) ←
                                                                                              (each phase cycles:
                                                                                               discussion → planning →
                                                                                               implementation → verification)
```

Valid transitions and the commands that trigger them:

| From | To | Trigger | Gate |
|------|----|---------|------|
| (none) | discovery | `/forge:new` | None |
| discovery | spec | Automatic after understanding | None |
| spec | codebase-research | Spec approved by developer | Developer approval |
| codebase-research | external-research | Research complete | None |
| external-research | architecture | Research complete | None |
| architecture | planning | Architecture approved | Developer approval |
| planning | phase-execution | Plan approved | Developer approval |
| phase-execution | phase-execution | `/forge:next` (next phase) | Phase verification pass |
| phase-execution | completed | All phases done | Final developer approval |
| Any | blocked | Blocker identified | None |
| blocked | (previous) | Blocker resolved | None |

### Resume Logic

When a session starts (or `/forge:resume` is invoked):

1. Read `state.yaml` from `<workspace_root>/.ai-workflow/tasks/<task-id>/` — determine `status`, `current_phase`, `current_step`
2. Based on status, load ONLY the relevant documents:

| Status | Documents Loaded |
|--------|-----------------|
| `discovery` | spec-template only |
| `spec` | spec.md (draft) |
| `codebase-research` | spec.md |
| `external-research` | spec.md + research.md |
| `architecture` | spec.md + research.md + external-research.md |
| `planning` | architecture.md |
| `phase-execution` | plan.md + `phases/<current>/CONTEXT.md` + previous phase `RESULT.md` |
| `blocked` | state.yaml blockers + current phase context |

3. The Context Reconstructor agent reads these docs and produces a structured summary for the main conversation context
4. Developer is shown status dashboard and offered to continue

### Atomic State Updates

State updates happen through a script (`scripts/update-state.js`) that:
1. Reads current state.yaml
2. Applies the update (field path + new value)
3. Writes atomically (write to temp, rename)
4. This prevents partial writes on interruption

---

## 4. Meta-Prompt System

### Dynamic Prompt Composition

Each command file (`commands/forge/*.md`) acts as a meta-prompt that composes the actual workflow prompt dynamically. The key principle: **inject only what the current phase needs**.

The command markdown files use a pattern where they instruct Claude to:
1. Read `state.yaml` to determine current state
2. Read only the specific document files needed for that state
3. Follow phase-specific instructions embedded in the command

### Template Structure with Context Injection

Here is the pattern used in the main `/forge:new` command (and similar commands):

```markdown
---
description: Start a new spec-forge task with guided workflow
argument-hint: <task-name> [--source jira:KEY | --source linear:KEY | --source github:NUM]
---

# Spec-Forge: New Task

You are orchestrating a spec-driven development workflow. Follow each phase
strictly in order. Never skip phases. Never proceed without developer approval
at approval gates.

## Step 1: Initialize

1. Parse arguments from: $ARGUMENTS
2. Generate task ID: SF-<NNN> (read .ai-workflow/tasks/ dir to find next number)
3. Create task directory structure using the init-task script under .ai-workflow/tasks/
4. Create initial state.yaml from template

## Step 2: Discovery

[...phase instructions...]

## Step 3: Spec Generation

**Read**: templates/spec.md for format
**Use agent**: spec-writer to generate specification
**Inject context**: Only $ARGUMENTS and any source material
**Gate**: Present spec to developer, wait for approval

[...continues for each phase...]
```

### Token Optimization Strategy

The critical insight: a task spanning days accumulates enormous context. The prompt system fights this with aggressive scoping:

1. **Phase isolation**: Each phase's CONTEXT.md is a self-contained document. It contains exactly what is needed, nothing more. When resuming at phase 3, Claude never loads phase 1's raw research -- it loads phase 3's CONTEXT.md which contains a distilled summary.

2. **Progressive summarization**: Each RESULT.md is a compressed summary of what happened. The next phase's CONTEXT.md references RESULT.md, not the raw implementation logs.

3. **Agent delegation**: Heavy analysis work (codebase research, architecture design, code review) is delegated to subagents. Each subagent gets its own context window. The orchestrating command only receives the agent's output summary.

4. **Lazy file reading**: Commands instruct Claude to read specific files by path rather than loading everything upfront. "Read `app/Models/User.php` lines 45-62" not "understand the entire codebase."

---

## 5. Agent Design

### Agent 1: codebase-researcher

```yaml
# agents/codebase-researcher.md frontmatter
---
name: codebase-researcher
description: >
  Deeply analyzes existing codebase in a PHP service repository.
  Traces execution paths through Laravel and Yii2 codebases, maps
  architecture layers, identifies patterns, conventions, and relevant
  code for a given task context. Returns structured findings with
  file:line references.
tools: Glob, Grep, Read, Bash
model: sonnet
color: yellow
maxTurns: 30
---
```

**Responsibilities**:
- Trace execution flows in Laravel (routes -> controllers -> services -> models -> migrations) and Yii2 (config -> controllers -> actions -> models -> migrations)
- Identify existing design patterns (Repository pattern, Service layer, etc.)
- Map relevant database schema
- Find similar features as reference implementations
- Document conventions (naming, directory structure, testing patterns)
- Return structured research with file:line references and a "key files" list

**Body prompt focus**: Expert PHP code analyst specializing in Laravel and Yii2 advanced framework patterns. Trace comprehensively. Always return file:line references. Identify the 10 most essential files for understanding the relevant area.

### Agent 2: spec-writer

```yaml
---
name: spec-writer
description: >
  Generates, validates, and refines requirement specifications from
  any source: manual description, Jira/Linear/GitHub issue content,
  or interactive Q&A with the developer. Outputs standardized spec.md
  format with functional requirements, acceptance criteria, and
  constraints.
tools: Read, WebFetch, WebSearch
model: sonnet
color: green
maxTurns: 20
---
```

**Responsibilities**:
- Parse requirements from any source format
- Identify ambiguities and missing information
- Generate standardized spec.md
- Validate spec completeness against checklist
- Produce clarifying questions for developer

### Agent 3: external-researcher

```yaml
---
name: external-researcher
description: >
  Researches external technology documentation, best practices, and
  similar implementations for PHP/Laravel/Yii2 development tasks.
  Evaluates packages, studies official docs, and finds reference
  implementations. Returns actionable research with source links.
tools: WebSearch, WebFetch, Read
model: sonnet
color: yellow
maxTurns: 25
---
```

**Responsibilities**:
- Search Laravel/Yii2 official documentation for relevant patterns
- Evaluate Composer packages for the task
- Find similar open-source implementations
- Research best practices for the specific technical challenge
- Return structured research with source URLs

### Agent 4: solution-architect

```yaml
---
name: solution-architect
description: >
  Designs PHP application architecture for Laravel and Yii2 services.
  Analyzes codebase research and external research to produce concrete
  solution designs with component specifications, data flows, API
  contracts, and database changes. Makes decisive architectural choices.
tools: Glob, Grep, Read, Bash
model: opus
color: green
maxTurns: 30
---
```

**Responsibilities**:
- Design solution architecture that fits existing codebase patterns
- Specify component interfaces (PHP interfaces, class signatures)
- Design database schema changes and migration strategy
- Define API contracts for cross-service communication
- Produce concrete file-level implementation map
- Make decisive choices -- pick one approach and commit

**Note**: This is the only agent that uses `opus` model. Architecture decisions have the highest leverage -- a wrong architectural choice cascades into hours of wasted implementation. The cost of one opus call is trivially offset by avoiding a bad design.

### Agent 5: phase-planner

```yaml
---
name: phase-planner
description: >
  Breaks an architecture design into sequential implementation phases
  with dependency ordering, effort estimates, and per-phase verification
  criteria. Each phase targets a single service and produces a
  self-contained deliverable.
tools: Read
model: sonnet
color: green
maxTurns: 15
---
```

**Responsibilities**:
- Decompose architecture into phases of 1-4 hours each
- Order phases by dependencies (database first, then models, then services, then API, then UI)
- Assign each phase to a specific service
- Define verification criteria per phase
- Generate CONTEXT.md template for each phase

### Agent 6: code-reviewer

```yaml
---
name: code-reviewer
description: >
  Reviews PHP code changes for bugs, security issues, convention
  violations, and quality problems. Uses confidence-based scoring
  to surface only high-priority findings. Checks against phpstan
  level expectations and Laravel/Yii2 best practices.
tools: Glob, Grep, Read, Bash
model: sonnet
color: red
maxTurns: 20
---
```

**Responsibilities**:
- Review git diff for the current phase's changes
- Check adherence to project conventions discovered in research phase
- Identify bugs, security vulnerabilities, logic errors
- Check PHP type safety, null handling, exception handling
- Verify test coverage for new code
- Use confidence scoring (report only findings >= 80 confidence)
- Group findings by severity: Critical / Important / Minor

### Agent 7: context-reconstructor

```yaml
---
name: context-reconstructor
description: >
  Rebuilds task context from documentation files when resuming a
  spec-forge task after a session break. Reads state.yaml and only
  the relevant documents for the current phase, producing a concise
  context summary that allows work to continue without re-reading
  everything.
tools: Read, Glob
model: sonnet
color: yellow
maxTurns: 10
---
```

**Responsibilities**:
- Read state.yaml to determine exact position
- Load only documents relevant to current phase (per the table in Section 3)
- Produce a structured context summary with: task objective, what's been done, what's in progress, what's next, key decisions made, relevant file references
- Keep output under 2000 tokens -- this is injected into the main conversation

---

## 6. Skill System

### Skill 1: codebase-research

```yaml
# skills/codebase-research/SKILL.md frontmatter
---
name: codebase-research
description: >
  This skill performs deep codebase analysis for PHP services using
  Laravel or Yii2 frameworks. Use when the user asks to "analyze the
  codebase", "understand the code", "find patterns", "trace execution",
  "explore the architecture", or when starting a new spec-forge task
  that requires understanding existing code. Launches parallel
  codebase-researcher agents targeting different aspects.
---
```

**Body content**: Instructions for launching 2-3 parallel `codebase-researcher` agents with different focus areas (similar features, architecture/patterns, data flow/schema). Collects outputs and merges into structured `research.md` format. Includes the research.md template inline for reference.

### Skill 2: spec-generation

```yaml
---
name: spec-generation
description: >
  This skill generates requirement specifications from any source:
  manual text, Jira issue content, Linear issue content, GitHub issue
  content, or interactive Q&A with the developer. Use when the user
  asks to "create a spec", "write requirements", "parse this issue",
  "generate specification", or at the spec phase of a spec-forge task.
---
```

**Body content**: Instructions for invoking the `spec-writer` agent with source material. Includes logic for different source types (if Jira URL, fetch and parse; if raw text, structure it; if no source, start interactive Q&A). References `references/spec-template.md` for the output format and `references/spec-examples.md` for good spec examples.

### Skill 3: external-research

```yaml
---
name: external-research
description: >
  This skill researches external documentation, packages, and best
  practices for PHP/Laravel/Yii2 development. Use when the user asks
  to "research best practices", "find packages", "check Laravel docs",
  "research how to implement", or during the external-research phase
  of a spec-forge task.
---
```

**Body content**: Instructions for invoking `external-researcher` agent with task context. Includes guidance on what to search for (official docs, Packagist packages, reference implementations). References `references/laravel-patterns.md` and `references/yii2-patterns.md` for framework-specific patterns to look for.

### Skill 4: verification

```yaml
---
name: verification
description: >
  This skill runs the multi-layer PHP verification pipeline: phpunit
  tests, phpstan static analysis, pint code style, agent code review,
  and developer approval. Use when the user asks to "verify", "run
  tests", "check quality", "review code", or during the verification
  step of a spec-forge phase.
---
```

**Body content**: Step-by-step verification pipeline instructions. Run `scripts/verify-php.js` which executes phpunit, phpstan, pint in sequence. If any fail, stop and report. If all pass, launch `code-reviewer` agent. Present consolidated results to developer for approval. Record results in VERIFICATION.md.

### Skill 5: context-reconstruction

```yaml
---
name: context-reconstruction
description: >
  This skill reconstructs task context when resuming a spec-forge
  task after a session break. Use when the user asks to "resume task",
  "continue where I left off", "pick up task", or when the SessionStart
  hook detects an active task.
---
```

**Body content**: Instructions for invoking `context-reconstructor` agent. Reads state.yaml, determines what documents to load, produces context summary. Displays status dashboard to developer.

---

## 7. Command Interface

### `/forge:new`

```yaml
# commands/forge/new.md
---
description: Create a new spec-forge task and begin the guided workflow
argument-hint: <task-name> [--source jira:KEY | linear:KEY | github:NUM]
---
```

**Workflow**:
1. Parse `$ARGUMENTS` for task name and optional source
2. Resolve `workspace_root` from forge.yaml config
3. Scan `<workspace_root>/.ai-workflow/tasks/` to determine next task ID number
4. Run `scripts/init-task.js` to create directory structure under `<workspace_root>/.ai-workflow/tasks/`
5. Initialize `state.yaml` from template with status `discovery`
6. If source provided, fetch and parse issue content
7. Begin Discovery phase: understand the requirement
8. Transition to Spec phase: generate `spec.md` using spec-generation skill
9. Present spec to developer for approval
10. On approval, transition to codebase-research
11. Run codebase-research skill (parallel agents)
12. Present research summary, transition to external-research
13. Run external-research skill
14. Present research, transition to architecture
15. Run solution-architect agent (opus model)
16. Present architecture to developer, wait for approval
17. On approval, run phase-planner agent
18. Present plan to developer, wait for approval
19. On approval, transition to phase-execution, set current_phase to 1
20. Begin first phase's discussion step

The command is long but each step is clearly delineated. Developer approval gates are at steps 9, 16, 18, and at every phase verification.

### `/forge:resume`

```yaml
---
description: Resume a spec-forge task from saved state
argument-hint: [task-id]
---
```

**Workflow**:
1. Resolve `workspace_root` from forge.yaml config
2. If task-id provided, look for `<workspace_root>/.ai-workflow/tasks/<task-id>*/state.yaml`
3. If no task-id, scan all `<workspace_root>/.ai-workflow/tasks/*/state.yaml` for status != completed, show menu
4. Run context-reconstruction skill
5. Display status dashboard
5. Continue from current state (invoke appropriate phase logic)

### `/forge:status`

```yaml
---
description: Display spec-forge task and phase status dashboard
argument-hint: [task-id]
---
```

**Workflow**:
1. Read state.yaml (current or specified task)
2. Display formatted dashboard:

```
╔══════════════════════════════════════════════════════╗
║  SF-042: Refactor user authentication to OAuth2      ║
║  Status: phase-execution | Phase 2/3 | Step: impl   ║
╠══════════════════════════════════════════════════════╣
║  Phase 1: Database migration      ✅ COMPLETED       ║
║  Phase 2: Model layer refactor    🔄 IN PROGRESS     ║
║    └─ Step: implementation                           ║
║  Phase 3: API endpoint migration  ⏳ PENDING          ║
╠══════════════════════════════════════════════════════╣
║  Services: user-service (in-progress)                ║
║            api-gateway (pending)                     ║
║  Blockers: none                                      ║
╚══════════════════════════════════════════════════════╝
```

### `/forge:next`

```yaml
---
description: Advance to the next phase or step within current phase
argument-hint: [--force]
---
```

**Workflow**:
1. Read state.yaml
2. If current step is not `verification` or verification not passed, warn (unless `--force`)
3. If current phase verification is complete:
   - Write RESULT.md for current phase
   - Increment `current_phase`
   - Reset `current_step` to `discussion`
   - Generate CONTEXT.md for next phase from plan.md + previous RESULT.md
4. If all phases complete, transition to `completed`

### `/forge:verify`

```yaml
---
description: Run the verification pipeline for the current phase
argument-hint: [--phpunit-only | --phpstan-only | --pint-only | --review-only]
---
```

**Workflow**:
1. Read state.yaml to get current phase and service
2. Determine verification commands from forge.yaml config
3. Run verification skill (full pipeline or specific tool if flag provided)
4. Write results to VERIFICATION.md
5. Update state.yaml verification fields
6. If all pass, ask developer for approval
7. On approval, update state to verification complete

### `/forge:spec`

```yaml
---
description: Generate or edit the task specification
argument-hint: [--from-jira KEY | --from-linear KEY | --from-github NUM | --interactive]
---
```

**Workflow**:
1. If task has existing spec.md, offer to edit or regenerate
2. Run spec-generation skill with appropriate source
3. Present spec for developer review

### `/forge:research`

```yaml
---
description: Run external technology research for the current task
argument-hint: [specific topic to research]
---
```

**Workflow**:
1. Read spec.md and research.md for context
2. Run external-research skill with task context and any specific topic from $ARGUMENTS
3. Write results to external-research.md

### `/forge:review`

```yaml
---
description: Run agent code review on current changes
argument-hint: [--diff-only | --full]
---
```

**Workflow**:
1. Launch 2-3 code-reviewer agents in parallel with different focuses
2. Consolidate findings
3. Present to developer

---

## 8. Handoff Protocol

### The Contract: Required Sections Per Phase Output

Each phase produces a structured markdown document. The next phase's CONTEXT.md is generated by extracting specific sections from the previous output. This is the formal contract.

| Document | Required Sections | Consumed By |
|----------|------------------|-------------|
| `spec.md` | Problem Statement, Functional Requirements, Non-Functional Requirements, Acceptance Criteria, Constraints | research, architecture |
| `research.md` | Key Files (table), Conventions Discovered, Existing Patterns, Database Schema | architecture, phase planning |
| `external-research.md` | Recommendations, Best Practices | architecture |
| `architecture.md` | Component Design (with interfaces), Database Changes, Cross-Service Impact, Testing Strategy | plan, phase CONTEXT.md |
| `plan.md` | Phase list with goals, files, verification criteria | each phase CONTEXT.md |
| Phase `RESULT.md` | Files Modified, Deferred Items, Impact on Next Phase | next phase CONTEXT.md |

### Context Chaining Rules

1. **spec.md** is the root document. Everything traces back to it.
2. **architecture.md** is the most referenced document. It is loaded for planning AND for phase execution.
3. **Phase CONTEXT.md** is a self-contained unit. It pulls from plan.md (this phase's plan) + previous RESULT.md (what's done) + architecture.md (relevant component design only, not the whole document).
4. **No document reads all previous documents.** Each reads only its direct dependencies per the table above.

### Token Budget Per Phase

| Phase | Estimated Input Tokens | Notes |
|-------|----------------------|-------|
| Discovery | ~500 | Just the user request |
| Spec Generation | ~2,000 | Source material + template |
| Codebase Research | ~8,000 per agent | Agents have own windows |
| External Research | ~5,000 per agent | Agents have own windows |
| Architecture | ~6,000 | spec + research summaries |
| Planning | ~4,000 | architecture doc |
| Phase Execution | ~4,000 | CONTEXT.md + PLAN.md |
| Verification | ~3,000 | Diff + review criteria |

The main conversation context (the orchestrating command) stays under ~10,000 tokens of injected task context at any given time. Heavier analysis is always delegated to subagents.

---

## 9. Cross-Service Coordination (Polyrepo)

### The Model

The `.ai-workflow/` directory at the workspace root is the **control plane**. Service repos are the **data plane**. The spec-forge repo is the **plugin source** (code only, no runtime state).

```
workspace root (central)
┌─────────────────────────────┐
│ .ai-workflow/                │
│   codebase/                  │     service repos (per-service)
│     index.md, stack.md, ...  │    ┌──────────────────┐
│   tasks/SF-042/              │    │ user-service/      │
│     state.yaml              │◄──►│   (actual code)   │
│     spec.md                  │    │   forge.yaml      │
│     architecture.md          │    └──────────────────┘
│     plan.md                  │    ┌──────────────────┐
│     phases/                  │    │ api-gateway/      │
│     services/                │◄──►│   (actual code)   │
│       user-service.yaml      │    │   forge.yaml      │
│       api-gateway.yaml       │    └──────────────────┘
└─────────────────────────────┘
```

### Per-Service State Tracking

Each service involved in a task gets a file under `<workspace_root>/.ai-workflow/tasks/<task-id>/services/<service-name>.yaml`:

```yaml
service: user-service
repo: "git@github.com:team/user-service.git"
local_path: "/Users/sonnt/Workspace/services/user-service"
branch: "feature/SF-042-oauth2"
status: "in-progress"
phases: [1, 2]                      # which phases affect this service
current_phase: 2
files_modified:
  - "database/migrations/2026_04_01_create_oauth_tokens.php"
  - "app/Models/OAuthAccessToken.php"
  - "app/Models/User.php"
```

### Developer Workflow for Switching Repos

When a task spans multiple services, the developer workflow is:

1. **In any service repo or the workspace root**: Run `/forge:new`, complete research/architecture/planning phases. These phases are repo-agnostic -- they read service repos but don't modify them. All output goes to `<workspace_root>/.ai-workflow/tasks/`.

2. **Switch to service repo**: For phase execution, the developer opens Claude Code in the relevant service repo (e.g., `cd ~/Workspace/services/user-service && claude`). The spec-forge plugin is installed in this repo. When Claude Code starts, the SessionStart hook:
   - Detects forge.yaml in the service repo
   - Reads `workspace_root` to locate `.ai-workflow/`
   - Checks `.ai-workflow/tasks/` for active phases targeting this service
   - Offers to resume

3. **Implementation happens in the service repo**: All code changes, test runs, verification happen in the service repo's working directory. State updates are written to `<workspace_root>/.ai-workflow/tasks/`.

4. **Switch services**: When phase 2 (user-service) completes and phase 3 (api-gateway) begins, developer switches to the api-gateway repo. Same SessionStart hook fires.

### forge.yaml in Service Repos

Each service repo contains a `forge.yaml` that configures the plugin for that service:

```yaml
# forge.yaml — placed in each service repo root
workspace_root: "/Users/sonnt/Workspace/services"   # parent folder holding all service repos
service_name: "user-service"
framework: "laravel"                 # or "yii2"
php_version: "8.2"

verification:
  phpunit:
    command: "php artisan test"
    filter_flag: "--filter"
  phpstan:
    command: "vendor/bin/phpstan analyse"
    level: 8
    paths: ["app/", "tests/"]
  pint:
    command: "vendor/bin/pint"
    config: "pint.json"

paths:
  models: "app/Models"
  services: "app/Services"
  controllers: "app/Http/Controllers"
  migrations: "database/migrations"
  tests_unit: "tests/Unit"
  tests_feature: "tests/Feature"
```

---

## 10. SessionStart Hook

### hooks/hooks.json

```json
{
  "description": "Spec-forge session initialization: detects active tasks and offers resume",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/detect-active-task.js",
            "timeout": 10,
            "statusMessage": "Checking for active spec-forge tasks..."
          }
        ]
      },
      {
        "matcher": "resume",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/detect-active-task.js",
            "timeout": 10,
            "statusMessage": "Restoring spec-forge context..."
          }
        ]
      }
    ]
  }
}
```

### hooks/detect-active-task.js

This script:

1. Looks for `forge.yaml` in the current working directory (the service repo)
2. If found, reads `workspace_root` from it
3. Scans `<workspace_root>/.ai-workflow/tasks/*/state.yaml` for tasks where:
   - `status` is not `completed` or `abandoned`
   - The current service is listed in `services`
4. If active task(s) found, outputs JSON:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "SPEC-FORGE ACTIVE TASK DETECTED:\nTask: SF-042 - Refactor user authentication to OAuth2\nStatus: phase-execution | Phase 2/3 | Step: implementation\nService: user-service (in-progress)\nBranch: feature/SF-042-oauth2\n\nTo resume this task, run: /forge:resume SF-042\nTo see full status, run: /forge:status SF-042"
  }
}
```

If no `forge.yaml` is found, the script walks up from cwd looking for a `.ai-workflow/` directory at the workspace root. If found, it scans all tasks directly.

---

## 11. Verification Pipeline (PHP-Specific)

### Pipeline Flow

```
phpunit → phpstan → pint → agent review → developer approval
   ↓ fail    ↓ fail   ↓ fail    ↓ issues found
   STOP      STOP     AUTO-FIX  PRESENT findings
   report    report   re-run    developer decides
```

### scripts/verify-php.js

This script is invoked from the service repo working directory. It reads `forge.yaml` for configuration and accepts arguments for which tools to run.

**Behavior per tool**:

1. **PHPUnit**: Run the configured test command. Parse output for pass/fail count. If tests fail, output the failure details and exit with a structured report. Does NOT proceed to next tool on failure.

2. **PHPStan**: Run static analysis at the configured level. Parse output for error count. If errors found, output them grouped by file. Does NOT proceed on failure -- developer must fix phpstan errors.

3. **Pint/PHP-CS-Fixer**: Run code style fixer. This tool auto-fixes issues. After running, check if any files were modified. If yes, report which files were auto-fixed (developer should review and commit the fixes). This step does NOT block -- it auto-fixes and moves on.

4. **Agent Code Review**: This step is handled by the skill, not the bash script. After the script exits with a report of tool results, the verification skill launches `code-reviewer` agents.

5. **Developer Approval**: Presented as a summary of all verification results. Developer can approve, request fixes, or skip.

### Failure Handling

| Tool | On Failure | Recovery |
|------|-----------|----------|
| PHPUnit | Stop pipeline, show failure output | Developer fixes tests, runs `/forge:verify --phpunit-only` |
| PHPStan | Stop pipeline, show errors | Developer fixes type errors, runs `/forge:verify --phpstan-only` |
| Pint | Auto-fix and continue | Developer reviews auto-fixes |
| Agent Review | Present findings | Developer decides: fix now, fix later, or accept |
| Developer Approval | Block phase completion | Developer must explicitly approve to proceed |

---

## 12. Configuration

### forge.yaml — The Configuration File

There are two forge.yaml files:

1. **In the spec-forge repo root**: Default configuration and global settings
2. **In each service repo root**: Service-specific configuration (overrides defaults)

### spec-forge repo forge.yaml (defaults)

```yaml
# forge.yaml — spec-forge plugin defaults
version: 1

# Task ID prefix
task_prefix: "SF"

# Default frameworks supported
frameworks:
  laravel:
    version: "11"
    models_path: "app/Models"
    services_path: "app/Services"
    controllers_path: "app/Http/Controllers"
    migrations_path: "database/migrations"
    tests_unit_path: "tests/Unit"
    tests_feature_path: "tests/Feature"
    verification:
      phpunit:
        command: "php artisan test"
        filter_flag: "--filter"
      phpstan:
        command: "vendor/bin/phpstan analyse"
        level: 8
      pint:
        command: "vendor/bin/pint"

  yii2:
    version: "2.0"
    models_path: "common/models"
    services_path: "common/services"
    controllers_path: "frontend/controllers"      # or backend/controllers
    migrations_path: "console/migrations"
    tests_unit_path: "tests/unit"
    tests_feature_path: "tests/functional"
    verification:
      phpunit:
        command: "vendor/bin/phpunit"
        filter_flag: "--filter"
      phpstan:
        command: "vendor/bin/phpstan analyse"
        level: 6                                    # Yii2 typically lower level
      pint:
        command: "vendor/bin/php-cs-fixer fix"

# Verification defaults
verification:
  require_phpunit: true
  require_phpstan: true
  require_pint: true
  require_agent_review: true
  require_developer_approval: true

# Phase execution
phase_execution:
  max_retries_on_verification_failure: 3
  auto_fix_style: true                             # auto-run pint/cs-fixer

# Agent configuration
agents:
  codebase_researcher_count: 2                     # parallel agents for research
  architect_model: "opus"                          # model for architecture decisions
  reviewer_count: 2                                # parallel agents for code review
```

### Service repo forge.yaml (overrides)

```yaml
# forge.yaml — placed in service repo root
workspace_root: "/Users/sonnt/Workspace/services"   # parent folder holding all service repos
service_name: "user-service"
framework: "laravel"
php_version: "8.2"

# Override any defaults
verification:
  phpstan:
    level: 9                                        # this service uses strict phpstan
    paths: ["app/", "domain/"]
  phpunit:
    command: "php artisan test --parallel"

# Custom paths (if non-standard)
paths:
  services: "app/Domain/Services"                   # DDD structure
```

---

## 13. Trade-offs and Risks

### Token Cost Estimates

| Operation | Estimated Tokens | Cost (Sonnet) | Cost (Opus) |
|-----------|-----------------|---------------|-------------|
| Full task (7 phases, 3 impl phases) | ~200K input, ~50K output | ~$1.00 | N/A |
| Codebase research (2 agents) | ~40K input, ~8K output | ~$0.20 | N/A |
| Architecture design (1 agent) | ~20K input, ~6K output | N/A | ~$0.60 |
| Per implementation phase | ~15K input, ~10K output | ~$0.12 | N/A |
| Code review (2 agents) | ~30K input, ~6K output | ~$0.15 | N/A |
| Context reconstruction | ~10K input, ~2K output | ~$0.05 | N/A |
| **Estimated total per task** | **~400K input, ~100K output** | **~$2.50-4.00** | |

Only the solution-architect agent uses Opus. Everything else uses Sonnet. This is a deliberate cost optimization -- architecture decisions are high-leverage, everything else is execution.

### Context Window Management

**Risk**: A task that spans 5+ phases could exhaust the context window.

**Mitigation**:
- Phase CONTEXT.md is capped at ~2000 tokens through aggressive summarization
- Only current phase context is loaded, never full history
- Heavy work is delegated to subagents with their own context windows
- Session logs are written to disk, not kept in context
- The context-reconstructor agent is itself a subagent -- its analysis happens in a separate context window, and only the summary is injected

**Risk**: PreCompact hook could lose task state.

**Mitigation**: All state is on disk in state.yaml and document files. Context can always be reconstructed from documents. The PreCompact event could be used to ensure state.yaml is current before compaction.

### Failure Modes and Recovery

| Failure | Impact | Recovery |
|---------|--------|----------|
| Session crashes mid-phase | Work may be lost since last state update | `/forge:resume` reads state.yaml, picks up from last recorded step |
| state.yaml corruption | Task state lost | state.yaml is committed to git; `git checkout -- state.yaml` restores |
| Agent produces bad output | Phase document is malformed | Developer reviews and can regenerate with `/forge:research` or manual edit |
| Verification loop (tests keep failing) | Stuck in phase | `max_retries_on_verification_failure` config limits retries; `/forge:next --force` bypasses |
| Workspace root path changes | Service repos can't find tasks | Update `workspace_root` in service forge.yaml |
| Developer abandons task mid-way | Orphaned task state | Set status to `abandoned` manually or via future `/forge:abandon` command |

### Limitations

1. **No real-time collaboration**: Only one developer should work on a task at a time. The state.yaml is not designed for concurrent writes.

2. **No automatic git operations**: The plugin does not auto-commit, auto-push, or auto-create branches. The developer manages git operations. This is intentional -- git is too dangerous for automation without explicit consent.

3. **Polyrepo overhead**: The developer must manually switch between repos for cross-service tasks. The plugin detects context but cannot open a different repo.

4. **No Jira/Linear API integration in v1**: The spec command accepts issue content as text, not as API fetches. Adding MCP servers for issue tracker APIs is a natural v2 extension.

5. **PHP-only verification**: The verification pipeline is PHP-specific. Supporting other languages would require a more general configuration system.

---

## Plugin Manifest

### `.claude-plugin/plugin.json`

```json
{
  "name": "spec-forge",
  "version": "1.0.0",
  "description": "Spec-driven development workflow for PHP microservices. Manages multi-phase tasks with persistent state, cross-service coordination, and structured verification pipelines for Laravel and Yii2 projects.",
  "author": {
    "name": "sonnt",
    "url": "https://github.com/sonnt/spec-forge"
  },
  "repository": "https://github.com/sonnt/spec-forge",
  "license": "MIT",
  "keywords": ["php", "laravel", "yii2", "spec-driven", "workflow", "microservices"]
}
```

### CLAUDE.md

The CLAUDE.md file loaded automatically for every session provides awareness of the spec-forge system:

```markdown
# Spec-Forge Plugin

This project uses spec-forge for spec-driven development. Key points:

- Tasks are tracked under `<workspace_root>/.ai-workflow/tasks/<task-id>/`
- Each task follows a strict workflow: spec → research → architecture → planning → phased execution
- State is persisted in `state.yaml` — this is the source of truth
- Verification requires: phpunit, phpstan, pint, agent review, developer approval
- Use `/forge:status` to see current task state
- Use `/forge:resume` to continue a task after session break
- Never skip phases. Never proceed without developer approval at gates.
- When working in a service repo, check for `forge.yaml` in the repo root for service-specific configuration.
- All plugin output lives in `.ai-workflow/` at the workspace root (the parent folder holding all service repos).
```

### AGENTS.md

```markdown
# Agent Coordination

Spec-forge uses specialized agents for different phases:

- **codebase-researcher** (yellow): Launched in parallel (2-3 instances) to explore service code. Each targets a different aspect. Returns structured findings with file:line references.
- **spec-writer** (green): Generates specifications. Single instance.
- **external-researcher** (yellow): Researches docs and packages. Single instance.
- **solution-architect** (green, opus): Designs solutions. Single instance. High-cost, high-value.
- **phase-planner** (green): Breaks architecture into phases. Single instance.
- **code-reviewer** (red): Launched in parallel (2-3 instances) with different review focuses. Returns confidence-scored findings.
- **context-reconstructor** (yellow): Rebuilds context on resume. Single instance. Must be fast and concise.

All agents output structured markdown. The orchestrating command reads agent output and extracts what's needed for the next phase. Agents do NOT modify state.yaml — only the orchestrating command does.
```

---

### Critical Files for Implementation

- `/Users/sonnt/Workspace/dojo/spec-forge/commands/forge/new.md` — The primary command that orchestrates the entire task lifecycle from creation through all phases. This is the most complex file in the plugin and the one that defines the core workflow.
- `/Users/sonnt/Workspace/dojo/spec-forge/agents/solution-architect.md` — The highest-leverage agent (uses opus model). Its output quality determines the success of every implementation phase downstream.
- `/Users/sonnt/Workspace/dojo/spec-forge/hooks/detect-active-task.js` — The SessionStart hook script that enables resumability. Scans `<workspace_root>/.ai-workflow/tasks/` for active tasks. Without this, developers must manually remember and invoke resume. This script makes spec-forge "always on."
- `/Users/sonnt/Workspace/dojo/spec-forge/skills/verification/SKILL.md` — The verification skill that orchestrates the phpunit/phpstan/pint/review pipeline. This is the quality gate that prevents bad code from advancing.
- `/Users/sonnt/Workspace/dojo/spec-forge/templates/state.yaml` — The state template that defines the complete state schema. Every other component reads and writes this format. Getting this schema right is foundational.