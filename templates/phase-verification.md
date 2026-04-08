# Phase {{PHASE_NUM}} Verification: {{PHASE_NAME}}

**Task**: {{TASK_TITLE}} (`{{TASK_ID}}`)
**Service**: {{SERVICE_NAME}}
**Date**: {{DATE}}

---

## Test

**Status**: <!-- pending | pass | fail -->
**Command**: `<!-- e.g. php artisan test --filter=FeatureName -->`
**Attempts**: <!-- N of max_retries (see forge.yaml verification.max_retries) -->

```
<!-- Paste relevant test output here.
     On pass: summary line (e.g. "Tests: 42 passed").
     On fail: failing assertion with file:line. -->
```

---

## Analyze

**Status**: <!-- pending | pass | fail -->
**Command**: `<!-- e.g. ./vendor/bin/phpstan analyse --level=8 -->`

```
<!-- Paste analysis output.
     On pass: "No errors".
     On fail: each error with file:line. -->
```

---

## Format

**Status**: <!-- pending | pass | fail -->
**Command**: `<!-- e.g. ./vendor/bin/pint -->`
**Auto-fixed**: <!-- yes | no | n/a -->

```
<!-- Paste formatter output. If auto-fixed, list the files changed. -->
```

---

## Code Review

**Status**: <!-- pending | approved | changes-requested -->
**Reviewers**: code-reviewer (parallel agents)

### Findings

<!-- One finding per line: [SEVERITY] file:line — description
     Severity levels: CRITICAL | IMPORTANT | MINOR
     Leave this section empty if there are no findings. -->

-

---

## Developer Approval

**Status**: <!-- pending | approved | rejected -->
**Approved by**: _____ on _____

**Notes**:

<!-- Conditions attached to approval, items deferred to a follow-up phase,
     or action items discovered during review. Leave empty if none. -->

-
