# 14 — Agent: code-reviewer

**Phase**: 3 - Agents
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 5 (Agent 6)

## Description

Create the code reviewer agent for PHP code quality review.

## Deliverables

- [ ] `agents/code-reviewer.md`

## Specification

```yaml
name: code-reviewer
tools: Glob, Grep, Read, Bash
model: sonnet
color: red
```

**Responsibilities**:
- Review git diff for current phase changes
- Check adherence to project conventions from research phase
- Identify bugs, security vulnerabilities, logic errors
- Check PHP type safety, null handling, exception handling
- Verify test coverage for new code
- Confidence scoring: only report findings >= 80 confidence
- Group findings: Critical / Important / Minor

**Notes**:
- Launched in parallel (2-3 instances) with different focuses
- Each instance gets a different review lens (correctness, conventions, security)
