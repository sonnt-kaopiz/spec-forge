# Agent Coordination

Spec-forge uses specialized agents for different workflow phases. All agents output structured markdown. Only the orchestrating command modifies state.yaml — agents never write state directly.

## Agents

### codebase-researcher (yellow, sonnet)
- Launched in parallel (2-3 instances) to explore service code
- Each instance targets a different aspect: similar features, architecture/patterns, data flow/schema
- Returns structured findings with file:line references and a list of 10 essential files

### spec-writer (green, sonnet)
- Single instance
- Generates specifications from any source: manual text, issue tracker content, or interactive Q&A
- Validates completeness and identifies ambiguities

### external-researcher (yellow, sonnet)
- Single instance
- Researches official docs, package registries, and reference implementations for the target stack
- Returns actionable research with source URLs

### solution-architect (green, opus)
- Single instance — highest-cost, highest-leverage agent
- Designs solution architecture with interfaces, database changes, and API contracts
- Makes decisive choices: picks one approach and commits to it
- Receives: spec.md + research.md + external-research.md

### phase-planner (green, sonnet)
- Single instance
- Decomposes architecture into 1-4 hour phases ordered by dependencies
- Assigns each phase to a specific service
- Generates CONTEXT.md template for each phase

### code-reviewer (red, sonnet)
- Launched in parallel (2-3 instances) with different review focuses
- Uses confidence scoring — only reports findings >= 80 confidence
- Groups findings by severity: Critical / Important / Minor

### context-reconstructor (yellow, sonnet)
- Single instance — must be fast
- Rebuilds task context from documentation files on session resume
- Reads state.yaml, loads only relevant docs for current phase
- Output capped at 2000 tokens

---

### codebase-mapper (yellow, sonnet)
- Utility agent — stateless, not part of the task workflow
- Spawned by `forge:map-codebase`, one instance per service, all in parallel
- Explores a single service root across all four domains in one pass: stack, integration, architecture, structure
- Writes a structured raw-findings file directly to `output_path`
- Returns `{ status, lines, path, service, reason? }` — status is `done`, `partial`, or `failed`
- File is always written even on failure (stub content), so the orchestrator can rely on path existence
