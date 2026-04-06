# 33 — Integration Testing

**Phase**: 7 - Polish
**Priority**: Medium
**Depends on**: All previous tasks

## Description

End-to-end testing of the complete workflow.

## Test Scenarios

- [ ] `/forge:new test-feature` — verify task directory created under `<workspace_root>/.ai-workflow/tasks/`, state.yaml initialized
- [ ] Full workflow walkthrough: new -> spec -> research -> architecture -> plan -> phase execution -> verify -> next -> complete
- [ ] `/forge:resume` — verify context reconstruction after session break
- [ ] `/forge:status` — verify dashboard displays correctly
- [ ] `/forge:verify` — verify pipeline runs phpunit/phpstan/pint correctly
- [ ] `/forge:next --force` — verify force-skip works
- [ ] SessionStart hook — verify active task detection in service repo
- [ ] Cross-service task — verify state tracking across multiple services
- [ ] Error recovery — verify resume after simulated crash mid-phase

## Notes

- Testing is manual (run commands in Claude Code and verify behavior)
- Document any issues found and fix before v1.0 release
