# Domain architecture decisions

These decisions were accepted for the first Limnexa release. [ADR 001](ADR_001_TOOLCHAIN.md) covers the toolchain.

## ADR 002: SpacetimeDB owns operational truth

SpacetimeDB reducers validate commands, enforce roles, append evidence and incident events, and commit rule/outbox effects atomically. Next.js renders scoped views and performs external integrations. This keeps a browser, AI model or workflow retry from independently declaring scientific or operational state. Maincloud production, preview and CI databases are separate. Schema migrations are additive and preserve evidence.

## ADR 003: Rules decide; AI proposes

Validation and routing use deterministic code and sourced, versioned policy data. AI is limited to structured extraction, visible image features and explanation. A proposal needs user confirmation before any report fields are accepted; it has no reducer permission to confirm an incident. This preserves reproducibility and allows complete typed operation during a provider outage.

## ADR 004: Transactional outbox for side effects

Reducers write outbox records with the authoritative change. A launcher reserves a durable run atomically, and the worker leases each delivery and records attempts. Idempotency keys suppress repeat inbox and FHIR effects. External services can fail or retry without rolling back or silently changing evidence. The cost is explicit delivery monitoring and retry operations.

## ADR 005: FHIR at the exchange boundary

Internal entities describe freshwater evidence and accountable operations directly. A frozen export maps selected records to FHIR R4 Location, Observation, Provenance, Task and prepared Communication using pinned draft OneAquaHealth material where semantically valid. There is no fabricated Patient or clinical diagnosis. The official fixture validator is a release gate; a download and a delivered packet remain distinct statuses.

## ADR 006: Ten dimensions instead of one trust score

Evidence retains acquisition, protocol, spatial, temporal, instrument, plausibility, completeness, corroboration, media and provenance findings independently. Unknown or not applicable is explicit. Eligibility follows documented checks, including source independence. A single confidence number would hide missing context and encourage false certainty.

## ADR 007: Corrections append

A submission has an immutable original and content hash. An authorized correction adds a reasoned revision linked to it; historical policy traces retain the exact evidence and policy they used. Later expert review affects subsequent eligibility without rewriting the earlier decision. Storage and review costs are accepted to maintain an auditable record.

## ADR 008: Canonical reach before H3 coverage

Canonical site and reach identity controls scientific matching and incident scope. H3 resolution 9 is a public spatial coverage and map aggregation aid, not proof that two reports describe the same reach or come from independent sources. The first release uses MapLibre with synthetic GeoJSON/H3 overlays; it does not claim an authoritative surveyed stream network or PMTiles coverage that has not been supplied.

## ADR 009: Private, normalized media

The client normalizes accepted images to WebP, removing common location metadata before private Blob upload. The server checks identity, ownership, MIME signature, metadata absence and hash before registering an artifact. Media retrieval uses authenticated no-store routes. Keeping uploaded objects private adds service cost and token management but avoids publishing location-bearing citizen evidence.

## ADR 010: Synthetic policy is isolated

The seeded flagship uses explicit fictional sites, source lineages, stored weather and parameters, then traverses the same reducer, rule, workflow and FHIR code as ordinary evidence. Real routing requires administrator-enrolled lineages and a separately sourced local policy. The demo can demonstrate mechanics without presenting its parameters as environmental standards.
