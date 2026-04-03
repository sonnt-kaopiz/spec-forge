# 19 — Skill: verification

**Phase**: 4 - Skills
**Priority**: Critical
**Depends on**: 14, 30
**Plan reference**: Section 6 (Skill 4), Section 11 (Verification Pipeline)

## Description

Create the verification skill that orchestrates the full PHP verification pipeline.

## Deliverables

- [ ] `skills/verification/SKILL.md`

## Specification

```yaml
name: verification
description: >
  Runs the multi-layer PHP verification pipeline: phpunit, phpstan, pint,
  agent code review, and developer approval. Use when "verify", "run tests",
  "check quality", "review code", or at verification step of a spec-forge phase.
```

**Pipeline**: `phpunit -> phpstan -> pint -> agent review -> developer approval`

**Behavior**:
1. Run `scripts/verify-php.sh` (phpunit, phpstan, pint in sequence)
2. phpunit/phpstan failure -> STOP, report to developer
3. pint -> auto-fix and continue
4. If all pass, launch 2-3 code-reviewer agents in parallel
5. Present consolidated results to developer
6. Record results in VERIFICATION.md
7. Update state.yaml verification fields
