# Structure — {{SYSTEM_NAME}}
_Generated: {{TIMESTAMP}} | Services: {{SERVICE_COUNT}}_

## Overview

<!-- One paragraph describing the workspace layout: monorepo vs polyrepo, how services
are organised at the filesystem level, any shared top-level directories. -->

## Workspace Layout

<!-- Key files and folders directly under the workspace root. -->

```
{{workspace_root_name}}/
├── {{service_a}}/          ← {{purpose}}
├── {{service_b}}/          ← {{purpose}}
├── {{shared_dir}}/         ← {{purpose}}
├── docker-compose.yml      ← if present
├── Makefile                ← if present
└── ...
```

<!-- Only list top-level entries. Do not recurse into service directories here. -->

## Per-Service Key Paths

<!-- For each service, list the key paths as bullets. No directory trees. -->

### {{service_name}}
- **Source root**: `{{path}}`
- **Models / domain**: `{{path}}`
- **Controllers / handlers**: `{{path}}`
- **Services / use cases**: `{{path}}`
- **Migrations**: `{{path}}`
- **Tests**: `{{path}}`
- **Config**: `{{path}}`
- **Entry point(s)**: `{{file}}` — {{purpose}}

<!-- Repeat service block for each service. Use — for paths not found. -->

## Shared / Common Directories

<!-- List any directories at workspace root that are shared across services.
Write — if none found. -->

## Layout Conventions

- **Layout type**: <!-- monorepo | polyrepo | mixed -->
- **Service naming**: <!-- e.g. kebab-case, *-service suffix, or describe the pattern -->
- **Consistent subdirectory conventions**: <!-- any patterns shared across services, or — -->
