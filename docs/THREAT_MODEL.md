# Threat model

| Threat | Implemented boundary | Verification |
|---|---|---|
| Client role spoofing / AI authority | Reducer owner/professional checks; no browser role selector; service cannot grant roles | Live unauthorized transition and scoped-view integration checks |
| Cross-user record or revision access | Owner views and immutable original ownership; same-body idempotence and revision fork checks | Live two-identity privacy/revision tests |
| Fake independent corroboration | Enrolled real source lineage, copied-media connected components, same canonical reach and policy scope | Core tests and synthetic/real policy separation |
| Bad units / invented GPS or measurements | Strict schemas, declared units/calibration, unknown GPS state, site distance, broad data bounds | Core tests and typed form browser tests |
| Prompt injection / chemistry from images | Untrusted evidence treated as data; enum-only output schema, fixed unsupported inference list, no measurements or reducer authority | Injection contract tests and explicit unconfirmed proposal browser test |
| Secret disclosure | Server-only credentials, ignored env/tool directories, Vercel exclusions, redacted staged/history scans | Gitleaks CI and release scans |
| Public media / metadata location leak | Private Blob, identity-bound token prefix, size/type limits, normalized WebP, server signatures/hash/metadata rejection, authenticated no-store retrieval | Actual private Blob upload and metadata tests |
| Duplicate uploads / offline loss | Persistent normalized media queue, retry finalization, persisted hash before binary deletion, stable observation IDs | Production PWA reload/reconnect and media release checks |
| Duplicate workflows / notifications | Atomic launch reservations, delivery leases, unique inbox keys and FHIR PUT/idempotency key | Integration duplicate-delivery test and hosted release probe |
| Provider failure corrupts truth | Optional AI/voice typed fallback; weather absent is not zero; FHIR ledger failure cannot mutate incident state | Browser outage checks, weather contract tests, FHIR outage/idempotence tests |
| Preview/CI changes production | Distinct databases/credentials and production mutation guard in integration suite | Deployed health check and CI environment inspection |

Anonymous persistent device identities are not verified human identities. Real enrollment is administrator-managed; a citizen cannot enroll itself. Clearing browser storage loses that device token; professional grants must be revoked and reissued if needed. Root owner credentials are read only by local provisioning scripts, kept in memory and never stored as CI secrets. CI credentials authorize only the isolated CI database.

Limnexa retains immutable evidence and accountable professional audit records. Raw audio is not stored. Queued media remains on its capturing device until registered; submitted images remain private. A deployment owner must adopt a local lawful retention policy and provider account retention settings before real data collection. Historical evidence is not destructively deleted by a software release.
