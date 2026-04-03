# 29 — SessionStart Hook

**Phase**: 6 - Hooks & Scripts
**Priority**: High
**Depends on**: 03, 04
**Plan reference**: Section 10 (SessionStart Hook)

## Description

Create the SessionStart hook that auto-detects active tasks when Claude Code starts.

## Deliverables

- [ ] `hooks/hooks.json` — hook configuration (SessionStart on startup and resume)
- [ ] `hooks/detect-active-task.sh` — detection script

## Specification

**hooks.json**: Triggers `detect-active-task.sh` on "startup" and "resume" matchers with 10s timeout.

**detect-active-task.sh** behavior:
1. Look for `forge.yaml` in current working directory (service repo)
2. If found, read `spec_forge_path`
3. Scan `<spec_forge_path>/tasks/*/state.yaml` for active tasks targeting this service
4. If no forge.yaml (in spec-forge repo itself), scan all tasks directly
5. Output JSON with `hookSpecificOutput.additionalContext` containing task summary and resume instructions

## Notes

- Must be fast (< 10 seconds)
- If no active tasks, output nothing (empty JSON or no output)
- Output is injected into Claude Code's system prompt for the session
