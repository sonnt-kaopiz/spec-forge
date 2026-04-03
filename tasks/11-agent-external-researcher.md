# 11 — Agent: external-researcher

**Phase**: 3 - Agents
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 5 (Agent 3)

## Description

Create the external researcher agent that researches Laravel/Yii2 docs, packages, and best practices.

## Deliverables

- [ ] `agents/external-researcher.md`

## Specification

```yaml
name: external-researcher
tools: WebSearch, WebFetch, Read
model: sonnet
color: yellow
```

**Responsibilities**:
- Search Laravel/Yii2 official documentation for relevant patterns
- Evaluate Composer packages on Packagist
- Find similar open-source implementations
- Research best practices for the specific technical challenge
- Return structured research with source URLs

**Output format**: Must match `templates/external-research.md` structure
