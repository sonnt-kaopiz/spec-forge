# Spec-Forge — Development Guide

Spec-forge is a Claude Code plugin that orchestrates spec-driven development for PHP microservices (Laravel & Yii2). This file guides agents working on building the plugin itself.

## Project Structure

```
.claude-plugin/plugin.json  — Plugin manifest (name, version, metadata)
forge.yaml                  — Central config: framework paths, verification commands, agent settings
AGENTS.md                   — Agent coordination rules (read by Claude Code automatically)
templates/
  state.yaml                — Template for per-task state tracking
  forge-service.yaml        — Template users place in their service repos
commands/forge/             — Slash command definitions (/forge new, /forge resume, etc.)
skills/                     — Skill definitions (codebase-research, spec-generation, etc.)
agents/                     — Agent definitions (codebase-researcher, spec-writer, etc.)
hooks/                      — Hook definitions (session-start, etc.)
scripts/                    — Shell scripts (verification pipeline, state management)
tasks/                      — Implementation task specs and TODO tracker
```

## Build Progress

See `tasks/TODO.md` for the full task list, dependency graph, and recommended build order. Tasks 01-04 (scaffold, CLAUDE.md, forge.yaml, state schema) are done. Everything else is pending.

## How Plugin Components Work

- **Commands** (`commands/<name>/`): Slash commands users invoke. Each needs a prompt markdown file. Commands orchestrate the workflow by calling skills/agents and updating state.
- **Skills** (`skills/<name>/`): Reusable prompt-based capabilities. Each skill wraps an agent or a sequence of tool calls. Skills do NOT modify `state.yaml` directly.
- **Agents** (`agents/<name>/`): Subagent definitions with specific models and tool access. See `AGENTS.md` for the full roster and their responsibilities.
- **Hooks** (`hooks/`): Triggered automatically on events (e.g., session start). Used for context reconstruction.
- **Scripts** (`scripts/`): Shell scripts for verification pipeline, task initialization, state file manipulation.

## Key Design Rules

- `state.yaml` is the single source of truth for task progress. Only orchestrating commands (in `commands/`) modify it — agents and skills never write state directly.
- `forge.yaml` holds global config (framework paths, verification commands, agent counts). Service repos have their own `forge-service.yaml` that can override settings.
- `templates/state.yaml` is a template, not live state. Live state files are created per-task in service repos.
- All agent output is structured markdown. Agents return data; commands decide what to do with it.

## Development Conventions

- Task specs in `tasks/` describe what to build and acceptance criteria. Read the relevant task spec before implementing.
- Follow the Claude Code plugin format: each command/skill/agent lives in its own subdirectory with a markdown prompt file.
- Keep prompts self-contained — each prompt file should include all context the agent/skill needs without depending on CLAUDE.md being loaded.
- When writing shell scripts, target bash with POSIX-compatible fallbacks. Scripts must work on macOS and Linux.
- Test commands manually by installing the plugin locally and running the slash commands.
