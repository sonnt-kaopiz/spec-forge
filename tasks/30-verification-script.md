# 30 — Verification Script

**Phase**: 6 - Hooks & Scripts
**Priority**: High
**Depends on**: 03
**Plan reference**: Section 11 (Verification Pipeline)

## Description

Create the verification pipeline script that works for any stack.

## Deliverables

- [ ] `scripts/verify.js`

## Specification

Invoked from service repo working directory. Reads verification commands from the service's stack profile in `forge.yaml` (or overrides in `forge-service.yaml`).

**Arguments**: `[--test-only | --analyze-only | --format-only | --all]`

**Pipeline**:
1. **Test**: Run the `test.command` for the stack, parse output, STOP on failure
2. **Analyze**: Run the `analyze.command` for the stack, parse errors, STOP on failure
3. **Format**: Run the `format.command` for the stack, report auto-fixed files, CONTINUE (does not block)

**Output**: Structured JSON report with per-step status, output, and pass/fail.

**Failure handling**:
| Step | On Failure | Action |
|------|-----------|--------|
| Test | Stop, show failures | Exit with report |
| Analyze | Stop, show errors | Exit with report |
| Format | Auto-fix, continue | Report fixed files |

## Notes

- Script reads commands from the resolved stack profile — it is language/framework agnostic
- Agent code review is handled by the skill layer, not this script
- Exit code: 0 = all pass, 1 = failures found
- Must work on macOS and Linux
