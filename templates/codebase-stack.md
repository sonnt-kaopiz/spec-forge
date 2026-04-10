# Stack — {{SYSTEM_NAME}}
_Generated: {{TIMESTAMP}} | Services: {{SERVICE_COUNT}}_

## Overview

<!-- One paragraph summarising the technology landscape: dominant language(s), frameworks,
shared infrastructure patterns, notable divergences across services. -->

## Technology Matrix

| Service | Language | Version | Framework | Database | Cache | Queue |
|---------|----------|---------|-----------|----------|-------|-------|
| {{service_name}} | {{lang}} | {{ver}} | {{fw}} | {{db}} | {{cache}} | {{queue}} |

<!-- One row per service. Use — for unknown or absent fields. -->

## Per-Service Details

<!-- Repeat this block for each service. -->

### {{service_name}}
- **Language**: <!-- language and version -->
- **Framework**: <!-- framework and version -->
- **Database**: <!-- platform and version, or — -->
- **Cache**: <!-- platform, or — -->
- **Queue / Messaging**: <!-- platform, or — -->
- **Key dependencies**:
  - ORM/data: <!-- packages -->
  - Auth: <!-- packages -->
  - HTTP client: <!-- packages -->
  - Testing: <!-- packages -->
  - Queue/jobs: <!-- packages -->
  - Observability: <!-- packages -->
- **Build tooling**: <!-- Makefile present, docker-compose.yml present, CI: .github/workflows/, etc. -->

## Shared Infrastructure

<!-- Notes on tooling, CI/CD pipelines, Docker Compose setups, or environment patterns
shared across multiple services. Write — if nothing is shared. -->
