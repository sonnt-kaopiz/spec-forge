# 10 — Agent: spec-writer

**Phase**: 3 - Agents
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 5 (Agent 2)

## Description

Create the spec writer agent that generates/validates requirement specifications.

## Deliverables

- [ ] `agents/spec-writer.md`

## Specification

```yaml
name: spec-writer
tools: Read, WebFetch, WebSearch
model: sonnet
color: green
```

**Responsibilities**:
- Parse requirements from any source format (manual text, Jira content, GitHub issue, interactive Q&A)
- Identify ambiguities and missing information
- Generate standardized spec.md matching the template
- Validate spec completeness against checklist
- Produce clarifying questions for developer

**Output format**: Must match `templates/spec.md` structure
