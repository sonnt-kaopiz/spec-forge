# 30 — Verification Script

**Phase**: 6 - Hooks & Scripts
**Priority**: High
**Depends on**: 03
**Plan reference**: Section 11 (Verification Pipeline)

## Description

Create the PHP verification pipeline script.

## Deliverables

- [ ] `scripts/verify-php.sh`

## Specification

Invoked from service repo working directory. Reads `forge.yaml` for commands.

**Arguments**: `[--phpunit-only | --phpstan-only | --pint-only | --all]`

**Pipeline**:
1. **PHPUnit**: Run test command, parse output, STOP on failure
2. **PHPStan**: Run analysis, parse errors, STOP on failure
3. **Pint**: Run fixer, report auto-fixed files, CONTINUE (does not block)

**Output**: Structured JSON report with per-tool status, output, and pass/fail.

**Failure handling**:
| Tool | On Failure | Action |
|------|-----------|--------|
| PHPUnit | Stop, show failures | Exit with report |
| PHPStan | Stop, show errors | Exit with report |
| Pint | Auto-fix, continue | Report fixed files |

## Notes

- Script only runs the CLI tools — agent code review is handled by the skill layer
- Must work in both Laravel and Yii2 repos (reads commands from forge.yaml)
- Exit code: 0 = all pass, 1 = failures found
