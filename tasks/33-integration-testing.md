# 33 — Integration Testing

**Phase**: 7 - Polish
**Priority**: Medium
**Depends on**: All previous tasks

## Description

End-to-end testing of the complete workflow.

## Deliverables

- [x] `tests/verify.test.js` — automated unit tests for verify.js (30 tests)
- [x] `docs/integration-test-guide.md` — manual end-to-end test guide (8 scenarios)

## Test Scenarios

- [ ] `/forge:new test-feature` — verify task directory created under `<workspace_root>/.ai-workflow/tasks/`, state.yaml initialized
- [ ] Full workflow walkthrough: new -> spec -> research -> architecture -> plan -> phase execution -> verify -> next -> complete
- [ ] `/forge:resume` — verify context reconstruction after session break
- [ ] `/forge:status` — verify dashboard displays correctly
- [ ] `/forge:verify` — verify pipeline runs test/analyze/format steps correctly for the configured stack
- [ ] `/forge:next --force` — verify force-skip works
- [ ] SessionStart hook — verify active task detection in service repo
- [ ] Cross-service task — verify state tracking across multiple services
- [ ] Error recovery — verify resume after simulated crash mid-phase

## Notes

- Testing is manual (run commands in Claude Code and verify behavior)
- Document any issues found and fix before v1.0 release
