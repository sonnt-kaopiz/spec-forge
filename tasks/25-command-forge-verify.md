# 25 — Command: /forge:verify

**Phase**: 5 - Commands
**Priority**: High
**Depends on**: 19
**Plan reference**: Section 7 (/forge:verify)

## Description

Create the command that runs the verification pipeline.

## Deliverables

- [ ] `commands/forge/verify.md`

## Specification

```yaml
description: Run the verification pipeline for the current phase
argument-hint: [--test-only | --analyze-only | --format-only | --review-only]
```

**Workflow**:
1. Read state.yaml for current phase and service
2. Determine verification commands from the stack profile in forge.yaml (or service overrides)
3. Run verification skill (full pipeline or specific step if flag provided)
4. Write results to VERIFICATION.md
5. Update state.yaml verification fields
6. If all pass, ask developer for approval
7. On approval, mark verification complete
