# Integration — {{SYSTEM_NAME}}
_Generated: {{TIMESTAMP}} | Services: {{SERVICE_COUNT}}_

## Overview

<!-- One paragraph summarising how services communicate: dominant mechanisms,
auth approach, external dependencies. -->

## Communication Topology

<!-- ASCII diagram or bullet-point list showing which services call/emit-to which.
Example:
  api-gateway  ──REST──►  user-service
  api-gateway  ──REST──►  order-service
  order-service  ──Event(Kafka)──►  notification-service
-->

## Service Dependency Matrix

| From | To | Mechanism | Purpose |
|------|----|-----------|---------|
| {{from_service}} | {{to_service}} | {{mechanism}} | {{purpose}} |

<!-- One row per service-pair interaction. Use REST / Event / Queue / gRPC / DB / etc. for Mechanism. -->

## Per-Mechanism Details

### REST / HTTP

<!-- List of service-pair interactions with endpoint patterns and auth requirements.
Write — if no REST communication found. -->

### Events / Message Queue

<!-- Topics or queue names, producers, consumers, and payload shape summary.
Write — if no event/queue communication found. -->

### Realtime

<!-- WebSocket or SSE channels and subscribing services.
Write — if no realtime communication found. -->

### Third-party Integrations

<!-- Payment gateways, email providers, cloud storage, analytics, etc. across all services.
Write — if none found. -->

## Authentication & Authorization

- **Mechanism**: <!-- JWT / OAuth2 / session / API key -->
- **Token issuance**: <!-- which service issues tokens -->
- **Validation points**: <!-- which services validate, and how -->
- **Auth guards per service**: <!-- brief list -->
