# 19 — Skill: verification

**Phase**: 4 - Skills
**Priority**: Critical
**Depends on**: 14, 30
**Plan reference**: Section 6 (Skill 4), Section 11 (Verification Pipeline)

## Description

Create the verification skill that orchestrates the full verification pipeline for any stack.

## Deliverables

- [ ] `skills/verification/SKILL.md`

## Specification

```yaml
name: verification
description: >
  Runs the multi-layer verification pipeline: test, analyze, format,
  agent code review, and developer approval. Use when "verify", "run tests",
  "check quality", "review code", or at verification step of a spec-forge phase.
```

**Pipeline**: `test -> analyze -> format -> agent review -> developer approval`

**Behavior**:
1. Read verification commands from the service's stack profile in forge.yaml (or forge-service.yaml overrides)
2. Run `scripts/verify.sh` (test, analyze, format in sequence)
3. test/analyze failure -> STOP, report to developer
4. format -> auto-fix and continue
5. If all pass, launch 2-3 code-reviewer agents in parallel
6. Present consolidated results to developer
7. Record results in VERIFICATION.md
8. Update state.yaml verification fields (test, analyze, format, review)
