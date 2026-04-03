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
  - Framework configs for Laravel and Yii2 (paths, verification commands)
  - Verification defaults (require phpunit, phpstan, pint, agent review, developer approval)
  - Phase execution settings (max retries, auto-fix style)
  - Agent configuration (researcher count, architect model, reviewer count)
- [ ] `templates/forge-service.yaml` — template for service repos:
  - `spec_forge_path`, `service_name`, `framework`, `php_version`
  - Override sections for verification and paths

## Notes

- Service repos override defaults from the central forge.yaml
- Laravel and Yii2 have different default paths and verification commands
- Yii2 typically uses lower phpstan level (6 vs 8)
