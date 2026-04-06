# 03 — Configuration: forge.yaml

**Phase**: 1 - Foundation
**Priority**: Critical
**Depends on**: 01
**Plan reference**: Section 12 (Configuration)

## Description

Create the default forge.yaml configuration and the service repo template.

## Deliverables

- [ ] `forge.yaml` — default plugin configuration at spec-forge repo root:
  - Task ID prefix (SF)
  - Stack profiles for multiple languages/frameworks (language, framework, paths, verification commands)
  - Verification defaults (require test, analyze, format, agent review, developer approval)
  - Phase execution settings (max retries, auto-fix format)
  - Agent configuration (researcher count, architect model, reviewer count)
- [ ] `templates/forge-service.yaml` — template for service repos:
  - `workspace_root`, `service_name`, `stack` (references a profile name from forge.yaml)
  - Override sections for verification and paths

## Notes

- Service repos reference a stack profile by name in `forge-service.yaml` and can override specific settings
- Built-in profiles: `laravel`, `yii2`, `rails`, `django`, `express`, `springboot`, `go`
- Users may add custom profiles for any language/framework directly in `forge.yaml`
- Each profile's verification is organized as `test` (run tests), `analyze` (static analysis), `format` (style fixer)
