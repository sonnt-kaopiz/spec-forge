# Spec Examples (reference)

Short before/after examples showing how the `spec-writer` agent should rewrite
vague developer input into concrete, testable spec language. Use these when
you need to demonstrate what "good" looks like or when phrasing a clarifying
question for the developer.

These are illustrative — they are not exhaustive templates. Every real spec
must follow `references/spec-template.md`.

---

## Example 1 — Vague verb → measurable behavior

**Raw input**

> We need to make the search faster.

**Bad spec excerpt** (what to avoid)

```markdown
## Problem Statement

The search is slow and needs to be faster.

### Functional Requirements

1. [FR-1] The system MUST improve search performance.
```

**Good spec excerpt**

```markdown
## Problem Statement

P95 latency for the product search endpoint is currently 1.8s under typical
load, exceeding the 500ms SLA agreed with the storefront team. The slowdown
blocks the new "search-as-you-type" feature scheduled for next quarter.

### Functional Requirements

1. [FR-1] The system MUST return product search results with P95 latency
   below 500ms at 100 requests per second on the production dataset.

### Non-Functional Requirements

1. [NFR-1] Performance: P95 < 500ms, P99 < 1s, measured at the API gateway.

## Acceptance Criteria

- [ ] AC-1: When the search endpoint is hit at 100 RPS for 5 minutes against
  the production-equivalent dataset, then P95 latency reported by the load
  test stays below 500ms.
```

**Why it is better**

- Names the actual metric (P95 latency) and the target (500ms).
- Names the workload (100 RPS) so verification can run a real load test.
- Avoids the verb "improve" — the system either meets the target or does not.

---

## Example 2 — Solution-as-requirement → underlying need

**Raw input**

> Add a Redis cache in front of the user service so the API is faster.

**Bad spec excerpt**

```markdown
### Functional Requirements

1. [FR-1] The system MUST add a Redis cache in front of the user service.
```

**Good spec excerpt**

```markdown
## Problem Statement

The `/users/:id` endpoint serves the same hot user records repeatedly during
checkout, causing redundant database load and tail latency spikes during peak
traffic.

### Functional Requirements

1. [FR-1] The system MUST serve repeated reads of the same user record within
   60 seconds without re-querying the primary database.
2. [FR-2] The system MUST invalidate cached user records within 5 seconds of
   any update to that user.

## Constraints

- The developer requested a Redis-backed cache as the implementation approach
  (recorded for the architect, not as a hard requirement).

## Open Questions

- Is Redis the only acceptable cache, or may the architect propose an
  in-process cache if it meets [FR-1] and [FR-2]?
```

**Why it is better**

- Captures the *outcome* (avoid redundant DB reads, invalidate on update) so
  the architect can choose the right tool.
- Records the developer's preferred solution as a Constraint, not as a
  Functional Requirement, and surfaces it as an Open Question.

---

## Example 3 — Unbounded scope → enumerated entities

**Raw input**

> The notification service should support all the new event types.

**Bad spec excerpt**

```markdown
### Functional Requirements

1. [FR-1] The notification service MUST support all new event types.
```

**Good spec excerpt**

```markdown
## Problem Statement

The notification service currently handles `order.placed` and
`order.shipped` events. Three new event types — `order.refunded`,
`order.cancelled`, `payment.failed` — are now emitted by the orders service
but have no consumers, blocking the customer-comms revamp.

### Functional Requirements

1. [FR-1] The notification service MUST consume the `order.refunded`,
   `order.cancelled`, and `payment.failed` events from the orders topic.
2. [FR-2] For each consumed event, the service MUST send the corresponding
   templated email to the customer named in the event payload.

## Open Questions

- Are there any other "new event types" beyond the three listed above? The
  spec is currently scoped to those three.
```

**Why it is better**

- Replaces "all" with the actual three event names.
- Surfaces the unbounded-scope ambiguity as an Open Question instead of
  silently guessing.

---

## How to use these examples

When the developer's raw input matches one of these patterns:

1. Quote the relevant Bad excerpt back to them as a "what we want to avoid".
2. Show the Good excerpt as the target shape.
3. Ask the clarifying questions needed to fill the Good shape (the
   numbers, the entity names, the cache invalidation rules, etc.).

These examples are *not* requirements for the agent to copy verbatim — they
exist to communicate the bar.
