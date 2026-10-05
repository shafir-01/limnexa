# Limnexa

Traceable freshwater evidence, deterministic investigation routing, accountable intervention, and targeted follow-up. The public demonstration is entirely synthetic. Its source reports, instrument reading, weather context, rules, and incidents are stored in SpacetimeDB Maincloud and created through authoritative reducers.

## Run

Use Node 24 and `npm ci`. Copy `.env.example` to ignored `.env.local`, configure the preview database and its restricted service identity, then run `npm run dev`. On this Windows workspace the authenticated CLIs and ignored runtime files are already provisioned; `npx tsx scripts/prepare-local.ts` selects preview safely. Never commit an environment file or use the owner token as a server credential.

- Production database: `limnexa-jltls`
- Preview database: `limnexa-jltls-preview`
- Isolated Actions database: `limnexa-jltls-ci`
- GitHub: https://github.com/shafir-01/limnexa
- Deployment URLs and final verification evidence: `docs/BUILD_RESULT.md`

## Product

- Mobile reporting with actual GPS accuracy, optional declared instrument readings, immutable originals, and append-only corrections.
- IndexedDB drafts and private media queues, installed offline report shell, stable submission IDs, reconnect and retry recovery.
- Ten explicit trust dimensions, enrolled source lineage, copied-media independence checks, sourced versioned policies, deterministic rule traces and historical replay.
- Officer acknowledgement, recorded findings, intervention, independent post-action evidence, expert verification, and accountable closure. Ecological evidence routes separately to scientist responsibility.
- Claimed monitoring missions, evidence-gap rationale, contributor quality/review feedback and professional responsibility inboxes.
- Private Blob upload authorization, image re-encoding to remove metadata, server signature/hash/metadata checks, and authenticated retrieval.
- Optional Gateway classification and visible-feature image triage with explicit confirmation boundaries, rate limits and persistent invocation audits.
- ElevenLabs realtime transcription and fixed spoken protocol guidance with complete typed fallback.
- Transactional outbox, atomic launch reservation, durable Workflow steps, retry/dead delivery status, idempotent inbox/FHIR delivery, and acknowledgement SLA audit.
- FHIR R4 evidence/provenance packets targeting pinned draft OneAquaHealth profiles; official positive and negative validator gates.

## Verify

```text
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run validate:fhir
npm run build
npm run test:e2e
npm audit --omit=dev --audit-level=high
```

Integration tests refuse to mutate the production database. Browser CI uses the compiled production app and isolated CI identities; live private Blob verification is an explicit release check. Test results are recorded in `docs/validation`. Java 21 is required for the checksum-pinned official HL7 validator. The checked-in lockfile fixes the dependency graph.

## Configure external services

Voice requires a newly rotated `ELEVENLABS_API_KEY`; spoken guidance additionally needs `ELEVENLABS_VOICE_ID`. No historical exposed key is used. FHIR delivery requires an authorized HTTPS `FHIR_DESTINATION_URL` and optional server-only token. Neither missing service blocks reporting, rules, investigation, or downloadable validated FHIR packets. Real rule activation requires administrator-configured canonical sites, enrolled source lineages, and an immutable sourced local policy; synthetic demo parameters are not environmental standards.

See [architecture](docs/ARCHITECTURE.md), [domain model](docs/DOMAIN_MODEL.md), [data governance](docs/DATA_GOVERNANCE.md), [rules and policies](docs/RULES_AND_POLICIES.md), [threat model](docs/THREAT_MODEL.md), [runbook](docs/OPERATIONS_RUNBOOK.md), [demo script](docs/DEMO.md), and [FHIR mapping and exact target](docs/FHIR.md).
