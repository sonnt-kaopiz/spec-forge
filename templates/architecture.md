# Architecture: {{TASK_TITLE}}

**Task ID**: {{TASK_ID}}
**Slug**: {{TASK_SLUG}}
**Created**: {{CREATED_AT}}
**Architect**: solution-architect (Opus)

---

## Approach

<!--
Single chosen approach — no option lists. Name the approach and give a 2-3
sentence summary of what will be built and why this design was selected.
The architect is decisive: pick ONE path and commit to it.
-->

---

## Services Involved

<!--
List each service affected by this change. For each, describe in one or two
sentences what role it plays and what changes. Do not go into code-level
detail — focus on responsibility and impact.
-->

- **{{service-name}}**: <!-- what this service does and what changes -->
- **{{service-name}}**: <!-- what this service does and what changes -->

---

## Data Flow

<!--
Step-by-step walkthrough of the primary use case. Name the services/components
involved at each hop. Cover the happy path first; note key error branches if
they affect design. No code — describe behavior, not implementation.
-->

1.
2.
3.

---

## Cross-Service Impact

<!--
Describe how services interact across boundaries. Call out contracts that must
stay stable and any coordinated deploys required.
-->

- **{{service-name}}**: <!-- what changes at the boundary -->
- **{{service-name}}**: <!-- what changes at the boundary -->

---

## Testing Strategy

<!--
Describe the types of tests that verify this design works. Keep it high-level —
what is being proven, not how to write the tests.
-->

- **Unit tests**: <!-- behaviors to verify within a service -->
- **Integration tests**: <!-- cross-service or cross-component flows -->
- **Migration tests**: <!-- if data migration is involved, how correctness is verified -->

---

## Rejected Alternatives

<!--
List approaches that were considered and explicitly rejected. Each entry
should name the alternative and state the reason it was not chosen.
-->

- **{{Alternative A}}**: rejected because <!-- reason -->
- **{{Alternative B}}**: rejected because <!-- reason -->

---

## Developer Approval

<!--
The architect presents this document; the developer must sign off before
the planning phase begins.
-->

- [ ] Approved by: _____ on _____
