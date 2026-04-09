# Spec-Forge

A Claude Code plugin that orchestrates **spec-driven development** for microservices. Spec-Forge guides you from raw requirements through specification, research, architecture, planning, and verified implementation — across any language or framework — with persistent state that survives session restarts.

## Why Spec-Forge?

Building features in a microservices codebase is messy. Requirements are vague. Architecture decisions spread across services. Claude Code sessions reset. And CI failures discovered late waste hours of rework.

Spec-Forge enforces a structured workflow:

1. Discover and clarify requirements before writing a line of code
2. Research your existing codebase and external docs in parallel
3. Lock in an architecture with explicit developer approval gates
4. Break work into phases with service assignments and dependencies
5. Verify each phase (tests + static analysis + formatting + code review) before moving on
6. Resume exactly where you left off after any session restart

---

## Installation

Install into the current project with npx (Node.js 18+ required, no global install needed):

```bash
npx @sonnt0411/spec-forge install
```

This copies the plugin runtime into `.claude/.spec-forge/` and drops 10 slash commands into `.claude/commands/forge/`. Add `.claude/.spec-forge/` to your `.gitignore`.

To upgrade when a new version is released:

```bash
npx @sonnt0411/spec-forge@latest update
```

Open Claude Code and type `/forge` to see the available commands.

> The plugin has no npm dependencies. All scripts use Node.js built-ins and run on macOS and Linux.

---

## Quick Start

### 1. Set up a service repo

Copy `templates/forge-service.yaml` to the root of your service repository and fill in the fields:

```yaml
workspace_root: "/path/to/workspace"   # parent folder holding all your service repos
service_name: "my-service"
stack: "laravel"                        # or rails, django, express, springboot, go, yii2
```

### 2. Create a new task

From inside your service repo (or any directory under `workspace_root`):

```
/forge:new add-user-notifications
```

Spec-Forge will:
- Prompt you for a task description and discovery questions
- Draft a specification for your approval
- Run codebase and external research in parallel
- Design an architecture (using the Opus model)
- Produce a phased implementation plan

### 3. Implement phase by phase

```
/forge:next
```

Follow the CONTEXT.md guide for the current phase, implement the code, then run:

```
/forge:verify
```

Spec-Forge runs your stack's test + analyze + format pipeline and spawns code review agents. On pass, it marks the phase complete and unlocks the next one.

### 4. Resume after a session restart

```
/forge:resume
```

The context-reconstructor agent reads your saved `state.yaml` and prints a compact summary of where you left off and what to do next.

---

## Command Reference

| Command | Description |
|---------|-------------|
| `/forge:new <task-slug>` | Create a new task and drive it through discovery → spec → research → architecture → planning |
| `/forge:resume [task-id]` | Resume a task from saved state, rebuilding context |
| `/forge:status [task-id]` | Show current state, phase progress, and blockers |
| `/forge:next` | Begin the next pending phase (generates CONTEXT.md guide) |
| `/forge:verify` | Run the verification pipeline for the current phase |
| `/forge:spec` | Regenerate or update the specification for the active task |
| `/forge:research [topic]` | Run additional external research on a specific topic |
| `/forge:review` | Run code-review agents on the current phase without full verification |
| `/forge:plan` | Regenerate or inspect the phased implementation plan |

### `/forge:new`

```
/forge:new <task-slug> [--source jira:KEY | linear:KEY | github:NUM]
```

- `task-slug`: lowercase letters, digits, and hyphens (e.g. `add-user-notifications`)
- `--source`: optionally link to an external issue for the discovery prompt

Creates a task directory under `<workspace_root>/.ai-workflow/tasks/<slug>/`, initialises `state.yaml`, and walks through each workflow stage with developer approval gates.

### `/forge:resume`

```
/forge:resume [task-id-or-slug]
```

If no argument is given, lists active tasks and prompts you to pick one. Runs the `context-reconstruction` skill and prints a compact summary (≤ 2000 tokens) of the current state plus the next recommended action.

### `/forge:status`

```
/forge:status [task-id-or-slug]
```

Prints a dashboard showing: current workflow state, phase completion, per-service status, any blockers, and recent session log entries.

### `/forge:next`

```
/forge:next
```

Must be run from a service repo with `forge-service.yaml`. Begins the next pending phase by generating a `CONTEXT.md` implementation guide for the current service and phase. The guide includes the relevant spec excerpts, architecture decisions, and step-by-step implementation notes.

### `/forge:verify`

```
/forge:verify
```

Runs the three-stage verification pipeline defined in the stack profile:

1. **test** — run the test suite
2. **analyze** — run static analysis
3. **format** — run the formatter

Then spawns two code-review agents in parallel. On success, marks the phase verified and prompts for developer approval before advancing. Retries automatically on failure (up to 3 times by default).

### `/forge:spec`

```
/forge:spec [--regenerate]
```

Shows the current specification. With `--regenerate`, re-runs the `spec-generation` skill to produce an updated spec draft for your review.

### `/forge:research`

```
/forge:research [topic]
```

Runs the `external-research` skill targeted at a specific topic. Results are appended to the task's `external-research.md` document.

### `/forge:review`

```
/forge:review
```

Spawns two code-review agents in parallel focused on the current phase's changes. Produces a `review.md` with Critical / Important / Minor findings. Does not run the test/analyze/format pipeline.

### `/forge:plan`

```
/forge:plan [--regenerate]
```

Shows the current phased implementation plan. With `--regenerate`, re-runs the `phase-planner` agent to produce an updated plan for your approval.

---

## Configuration Guide

### Central config: `forge.yaml`

Located in the spec-forge plugin directory. Defines:

- **Stack profiles** — language, framework, paths, and verification commands for each supported stack
- **Verification defaults** — which checks are required and retry limits
- **Agent settings** — how many researcher/reviewer agents to spawn, which model to use for architecture

Example snippet:

```yaml
version: 2

stacks:
  laravel:
    language: "php"
    framework: "laravel"
    version: "11"
    manifest: "composer.json"
    paths:
      models: "app/Models"
      services: "app/Services"
      controllers: "app/Http/Controllers"
      migrations: "database/migrations"
      tests_unit: "tests/Unit"
      tests_feature: "tests/Feature"
    verification:
      test:
        command: "php artisan test"
        filter_flag: "--filter"
      analyze:
        command: "vendor/bin/phpstan analyse"
        config:
          level: 8
      format:
        command: "vendor/bin/pint"

verification:
  require_test: true
  require_analyze: true
  require_format: true
  require_agent_review: true
  require_developer_approval: true

phase_execution:
  max_retries_on_verification_failure: 3
  auto_fix_format: true

agents:
  codebase_researcher_count: 2
  architect_model: "opus"
  reviewer_count: 2
```

### Service config: `forge-service.yaml`

Place this file in each service repo root. References the stack profile from `forge.yaml` and can override any setting:

```yaml
workspace_root: "/path/to/workspace"
service_name: "my-service"
stack: "laravel"

# Optional overrides:
# verification:
#   analyze:
#     config:
#       level: 9
# paths:
#   services: "app/Domain/Services"
```

### Adding a custom stack profile

Add a new entry under `stacks:` in `forge.yaml`:

```yaml
stacks:
  my-nestjs:
    language: "javascript"
    framework: "nestjs"
    version: "10"
    manifest: "package.json"
    paths:
      models: "src/entities"
      services: "src/services"
      controllers: "src/controllers"
      migrations: "migrations"
      tests_unit: "test/unit"
      tests_feature: "test/e2e"
    verification:
      test:
        command: "npm test"
        filter_flag: "--testNamePattern"
      analyze:
        command: "npx eslint ."
      format:
        command: "npx prettier --write ."
```

No code changes needed — services can reference the new profile immediately via `stack: "my-nestjs"` in `forge-service.yaml`.

---

## Workflow Diagram

```
  /forge:new
       |
       v
  [discovery]  <-- requirements, questions, source issue
       |
       v
    [spec]  <-- spec-writer agent drafts
       |
  [GATE: developer approves spec]
       |
       +--------------------+
       |                    |
       v                    v
 [codebase-research]  [external-research]  <-- parallel agents
       |                    |
       +--------------------+
                |
                v
        [architecture]  <-- solution-architect (Opus model)
                |
        [GATE: developer approves architecture]
                |
                v
          [planning]  <-- phase-planner agent
                |
        [GATE: developer approves plan]
                |
                v
       [phase-execution]
         |
         | For each phase:
         |
         +--> discussion --> planning --> implementation
                                              |
                                              v
                                        /forge:verify
                                              |
                                    test | analyze | format
                                              |
                                       code-review agents
                                              |
                                    [GATE: developer approves]
                                              |
                                         (next phase)
                |
                v
          [completed]
```

---

## Agent Descriptions

Spec-Forge uses specialized subagents for different tasks:

| Agent | Tier | Model | Role |
|-------|------|-------|------|
| `codebase-researcher` | Research (Yellow) | Sonnet | Analyzes similar features, architecture patterns, and data flow in existing service code |
| `external-researcher` | Research (Yellow) | Sonnet | Researches official docs, package registries, and reference implementations |
| `spec-writer` | Generation (Green) | Sonnet | Drafts specifications from discovery inputs, checks completeness, flags ambiguities |
| `solution-architect` | Architecture (Green) | Opus | Designs interfaces, database schemas, and API contracts — one decisive approach, no option lists |
| `phase-planner` | Generation (Green) | Sonnet | Orders phases by dependency, assigns services, generates CONTEXT.md guides |
| `code-reviewer` | Review (Red) | Sonnet | Reviews code for correctness, security, and style — runs two in parallel per phase |
| `context-reconstructor` | Session (Yellow) | Sonnet | Reads `state.yaml` and phase docs to rebuild a compact session summary (≤ 2000 tokens) |
| `codebase-mapper` | Utility | Sonnet | Generates a structural map of a service codebase for use by other agents |

---

## Task Folder Structure

Each task gets a directory under `<workspace_root>/.ai-workflow/tasks/<slug>/`:

```
.ai-workflow/tasks/add-user-notifications/
├── state.yaml              # Single source of truth — workflow state, phase progress, session log
├── spec.md                 # Approved specification
├── research.md             # Codebase research findings
├── external-research.md    # External docs and package research
├── architecture.md         # Approved architecture decisions
├── plan.md                 # Approved phased implementation plan
└── phases/
    ├── 01/
    │   ├── CONTEXT.md      # Phase implementation guide (generated by /forge:next)
    │   └── review.md       # Code review findings for this phase
    └── 02/
        └── CONTEXT.md
```

`state.yaml` is the only file that commands modify directly. All other documents are produced by agents and read-only after approval.

---

## Polyrepo Setup Guide

Spec-Forge is designed for polyrepo microservice environments where each service lives in its own repository.

### Directory layout

```
workspace/                          ← workspace_root
├── spec-forge/                     ← plugin (clone here or elsewhere)
├── .ai-workflow/                   ← created automatically by Spec-Forge
│   └── tasks/
│       └── add-user-notifications/
│           ├── state.yaml
│           └── ...
├── user-service/
│   └── forge-service.yaml          ← stack: "laravel", workspace_root: "/path/to/workspace"
├── notification-service/
│   └── forge-service.yaml          ← stack: "express"
└── api-gateway/
    └── forge-service.yaml          ← stack: "go"
```

### Steps

1. **Create a workspace root** — a parent directory that holds all your service repos.

2. **Place `forge-service.yaml`** in each service repo root, pointing `workspace_root` at the shared parent.

3. **Run `/forge:new`** from any service directory. The task directory is created under the shared `workspace_root/.ai-workflow/tasks/`.

4. **Run `/forge:next` and `/forge:verify`** from the specific service directory for each phase. The phase-planner assigns phases to services; Spec-Forge reads `forge-service.yaml` to know which stack profile to use for that service.

5. **Cross-service tasks** — if a task spans multiple services, the phase-planner orders phases by dependency (e.g., `user-service` phase 1 before `notification-service` phase 2). Switch to the appropriate service directory before running `/forge:next` for each phase.

---

## FAQ / Troubleshooting

**Q: Can I use Spec-Forge on a single monorepo?**

Yes. Set `workspace_root` to the monorepo root and place a single `forge-service.yaml` there. If the monorepo has multiple services with different stacks, you can define multiple stack profiles in `forge.yaml` and reference them from multiple `forge-service.yaml` files at different paths within the monorepo.

---

**Q: The verification step keeps failing — how do I debug it?**

Run `/forge:verify` — it prints the full output of each failed command. Check:
- Is the test command correct for your stack? Verify `verification.test.command` in `forge.yaml`.
- Are the tool binaries installed in the service repo? (e.g., `vendor/bin/phpstan` requires `composer install`)
- Did `auto_fix_format: true` apply a format change that breaks a linter expectation?

You can override any verification command in `forge-service.yaml` without touching the central config.

---

**Q: How do I skip a verification step (e.g., no static analysis yet)?**

In `forge-service.yaml`, set the relevant require flag to false:

```yaml
verification:
  require_analyze: false
```

---

**Q: The architecture agent keeps producing option lists instead of decisions.**

The `solution-architect` agent (Opus) is instructed to be decisive. If it produces options, add a clarifying note in the discovery or spec phase: "We have decided to use X approach." The architect uses the spec as input — clearer specs produce more decisive architectures.

---

**Q: How do I add support for a new language/framework?**

Add a new profile under `stacks:` in `forge.yaml`. See the "Adding a custom stack profile" section above. No code changes needed.

---

**Q: What happens if I close Claude Code mid-task?**

`state.yaml` is updated after every significant action. Run `/forge:resume` in your next session — the context-reconstructor agent will read the state and tell you exactly where you left off and what to do next.

---

**Q: Can multiple developers work on the same task?**

Spec-Forge is designed for single-developer use per task. If two developers run commands against the same `state.yaml` concurrently, writes may conflict. For team use, coordinate so only one developer runs Spec-Forge commands on a given task at a time.

---

**Q: How do I abandon a task?**

Update `state.yaml` manually or use the state script:

```bash
node scripts/update-state.js <task-path>/state.yaml status abandoned
```

---

## Built-in Stack Profiles

| Profile | Language | Framework | Test command |
|---------|----------|-----------|-------------|
| `laravel` | PHP | Laravel 11 | `php artisan test` |
| `yii2` | PHP | Yii2 | `vendor/bin/phpunit` |
| `rails` | Ruby | Rails 7 | `bundle exec rails test` |
| `django` | Python | Django 5 | `python manage.py test` |
| `express` | JavaScript | Express 5 | `npm test` |
| `springboot` | Java | Spring Boot 3 | `mvn test` |
| `go` | Go | stdlib | `go test ./...` |

Custom profiles can be added without code changes — see the Configuration Guide above.

---

## License

MIT
