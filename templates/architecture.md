# Architecture: {{TASK_TITLE}}

**Task ID**: {{TASK_ID}}
**Slug**: {{TASK_SLUG}}
**Created**: {{CREATED_AT}}
**Architect**: solution-architect (Opus)

---

## Approach

<!-- Single chosen approach — no option lists. State what will be built and why. -->

---

## Services Involved

| Service | Role | Branch |
|---------|------|--------|
| | | `feature/{{TASK_SLUG}}` |

---

## API Contracts

### Endpoint: `METHOD /path`

**Request**:
```json
{
}
```

**Response `200`**:
```json
{
}
```

**Error responses**: <!-- 400, 401, 404, 422, 500 -->

---

## Database Changes

### New Table / Collection: `table_name`

```sql
CREATE TABLE table_name (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Migrations Required

-

---

## Interfaces & Type Signatures

```
// Key interfaces, types, or abstract classes
```

---

## Component Interactions

```
ServiceA → ServiceB: description
ServiceB → DB: description
```

---

## Security & Validation

-

## Performance Considerations

-

## Testing Strategy

-

---

## Open Decisions

<!-- Anything deferred to implementation phase -->

-
