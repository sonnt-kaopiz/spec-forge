# Codebase Map — {{SYSTEM_NAME}}
_Generated: {{TIMESTAMP}} | Services mapped: {{SERVICE_COUNT}}_

| Document | Scope | Lines |
|----------|-------|-------|
| [Stack](stack.md) | Languages, frameworks, databases, dependencies | {{stack_lines}} |
| [Integration](integration.md) | Service communication, auth, external integrations | {{integration_lines}} |
| [Architecture](architecture.md) | Service roles, system layers, data flows | {{architecture_lines}} |
| [Structure](structure.md) | Workspace layout, per-service key paths | {{structure_lines}} |

## Services Mapped

| Service | Scout Status | Scout File |
|---------|-------------|------------|
| {{service_name}} | done ({{lines}} lines) | [scouts/{{service_name}}.md](scouts/{{service_name}}.md) |

<!-- Status variants:
  done:    done ({{lines}} lines)
  partial: partial — {{reason}} ({{lines}} lines)
  failed:  failed — {{reason}}
-->
