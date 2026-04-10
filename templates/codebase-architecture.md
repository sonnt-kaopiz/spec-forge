# Architecture — {{SYSTEM_NAME}}
_Generated: {{TIMESTAMP}} | Services: {{SERVICE_COUNT}}_

## Overview

<!-- One paragraph summarising the system's architectural style, primary responsibilities,
and the relationship between major service groups. -->

## Service Roles

| Service | Domain | Responsibility |
|---------|--------|----------------|
| {{service_name}} | {{domain}} | {{responsibility}} |

<!-- One row per service. -->

## System Layers

| Layer | Services |
|-------|----------|
| Presentation / Edge | <!-- services that are public-facing or act as API gateways --> |
| Service Tier | <!-- core business logic services --> |
| Background Jobs | <!-- worker or scheduler services --> |
| Data Access | <!-- notes on data ownership — shared DB, per-service DB, etc. --> |

## Primary Data Flows

<!-- For each major cross-service flow identified from the scouts, write a numbered flow.
If no cross-service flows could be inferred, write a note explaining what was found. -->

### {{flow_name}}

1. Request enters at {{service}} via {{mechanism}}
2. {{service}} calls {{service}} via {{mechanism}}
3. {{event_or_response}} triggers {{service}}

<!-- Repeat flow block for each identified data flow. -->

## Entry Points

<!-- For each service, list its primary entry point file(s) and their purpose. -->

- `{{service_name}}`: `{{file}}` — {{purpose}}
