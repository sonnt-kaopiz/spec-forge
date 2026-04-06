# Spec-Forge — Project TODO

> Master tracking file for plugin implementation.
> Full design: [spec-forge-plan-raw.md](../spec-forge-plan-raw.md)

---

## Phase 1: Foundation

| # | Task | Priority | Depends | Status |
|---|------|----------|---------|--------|
| 01 | [Plugin scaffold](01-plugin-scaffold.md) | Critical | — | [x] |
| 02 | [CLAUDE.md & AGENTS.md](02-claude-md-agents-md.md) | Critical | 01 | [x] |
| 03 | [forge.yaml config](03-forge-yaml-config.md) | Critical | 01 | [x] |
| 03.1 | [Built-in stack profiles](03.1-stack-profiles.md) | High | 03 | [x] |
| 04 | [State schema (templates/state.yaml)](04-state-schema.md) | Critical | 01 | [x] |
| 04.1 | [Agent: codebase-mapper](04.1-agent-codebase-mapper.md) | High | 01 | [x] |
| 04.2 | [Command: forge:map-codebase](04.2-command-forge-map-codebase.md) | High | 04.1 | [x] |
| 05 | [Task init script](05-task-init-script.md) | Critical | 04 | [x] |
| 06 | [State management scripts](06-state-management-scripts.md) | High | 04 | [ ] |

## Phase 2: Templates

| # | Task | Priority | Depends | Status |
|---|------|----------|---------|--------|
| 07 | [Document templates](07-document-templates.md) | High | 01 | [ ] |
| 08 | [Phase templates](08-phase-templates.md) | High | 01 | [ ] |

## Phase 3: Agents

| # | Task | Priority | Depends | Status |
|---|------|----------|---------|--------|
| 09 | [Agent: codebase-researcher](09-agent-codebase-researcher.md) | High | 01 | [ ] |
| 10 | [Agent: spec-writer](10-agent-spec-writer.md) | High | 01 | [ ] |
| 11 | [Agent: external-researcher](11-agent-external-researcher.md) | High | 01 | [ ] |
| 12 | [Agent: solution-architect](12-agent-solution-architect.md) | Critical | 01 | [ ] |
| 13 | [Agent: phase-planner](13-agent-phase-planner.md) | High | 01 | [ ] |
| 14 | [Agent: code-reviewer](14-agent-code-reviewer.md) | High | 01 | [ ] |
| 15 | [Agent: context-reconstructor](15-agent-context-reconstructor.md) | High | 04 | [ ] |

## Phase 4: Skills

| # | Task | Priority | Depends | Status |
|---|------|----------|---------|--------|
| 16 | [Skill: codebase-research](16-skill-codebase-research.md) | High | 09 | [ ] |
| 17 | [Skill: spec-generation](17-skill-spec-generation.md) | High | 10 | [ ] |
| 18 | [Skill: external-research](18-skill-external-research.md) | High | 11 | [ ] |
| 19 | [Skill: verification](19-skill-verification.md) | Critical | 14, 30 | [ ] |
| 20 | [Skill: context-reconstruction](20-skill-context-reconstruction.md) | High | 15 | [ ] |

## Phase 5: Commands

| # | Task | Priority | Depends | Status |
|---|------|----------|---------|--------|
| 21 | [/forge:new](21-command-forge-new.md) | Critical | 04,05,16,17,18,12,13 | [ ] |
| 22 | [/forge:resume](22-command-forge-resume.md) | Critical | 04, 20 | [ ] |
| 23 | [/forge:status](23-command-forge-status.md) | High | 04 | [ ] |
| 24 | [/forge:next](24-command-forge-next.md) | High | 04, 08 | [ ] |
| 25 | [/forge:verify](25-command-forge-verify.md) | High | 19 | [ ] |
| 26 | [/forge:spec](26-command-forge-spec.md) | Medium | 17 | [ ] |
| 27 | [/forge:research](27-command-forge-research.md) | Medium | 18 | [ ] |
| 28 | [/forge:review](28-command-forge-review.md) | Medium | 14 | [ ] |
| 31 | [/forge:plan](31-command-forge-plan.md) | Medium | 04 | [ ] |

## Phase 6: Hooks & Scripts

| # | Task | Priority | Depends | Status |
|---|------|----------|---------|--------|
| 29 | [SessionStart hook](29-session-start-hook.md) | High | 03, 04 | [ ] |
| 30 | [Verification script](30-verification-script.md) | High | 03 | [ ] |

## Phase 7: Polish

| # | Task | Priority | Depends | Status |
|---|------|----------|---------|--------|
| 32 | [README documentation](32-readme.md) | Medium | All | [ ] |
| 33 | [Integration testing](33-integration-testing.md) | Medium | All | [ ] |

---

## Summary

| Phase | Tasks | Critical | Status |
|-------|-------|----------|--------|
| 1. Foundation | 9 | 4 | In progress |
| 2. Templates | 2 | 0 | Not started |
| 3. Agents | 7 | 1 | Not started |
| 4. Skills | 5 | 1 | Not started |
| 5. Commands | 9 | 2 | Not started |
| 6. Hooks & Scripts | 2 | 0 | Not started |
| 7. Polish | 2 | 0 | Not started |
| **Total** | **36** | **8** | |

## Recommended Build Order

Build in dependency order, not strictly by phase number:

1. **01** Plugin scaffold (unlocks everything)
2. **02, 03, 04** in parallel (CLAUDE.md, forge.yaml, state schema)
3. **04.1** codebase-mapper agent (unlocks 04.2)
4. **04.2, 05, 06, 07, 08** in parallel (map-codebase command, init script, state scripts, templates)
5. **09-15** all agents in parallel (no inter-dependencies)
6. **29, 30** hooks & scripts (need forge.yaml + state schema)
7. **16-20** skills (each depends on its matching agent)
8. **23, 31** simple commands first (status, plan — just read state)
9. **22, 24, 25, 26, 27, 28** medium commands
10. **21** /forge:new last (depends on almost everything)
11. **32, 33** documentation and testing
