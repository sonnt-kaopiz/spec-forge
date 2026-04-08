# 11 — Agent: external-researcher

**Phase**: 3 - Agents
**Priority**: High
**Depends on**: 01
**Plan reference**: Section 5 (Agent 3)

## Description

Create the external researcher agent that researches official docs, packages, and best practices for the target stack.

## Deliverables

- [x] `agents/external-researcher.md`

## Specification

```yaml
name: external-researcher
tools: WebSearch, WebFetch, Read
model: sonnet
color: yellow
```

**Responsibilities**:
- Read the service's stack identity (language, framework) from context
- Search official documentation for the target framework/language
- Evaluate relevant packages from the appropriate registry (Packagist, RubyGems, PyPI, npm, Maven Central, crates.io, etc.)
- Find similar open-source implementations
- Research best practices for the specific technical challenge
- Return structured research with source URLs

**Output format**: Must match `templates/external-research.md` structure
