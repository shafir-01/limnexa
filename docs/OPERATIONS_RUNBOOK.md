# Operations runbook

## Environments and migration

Production: `limnexa-jltls`; preview: `limnexa-jltls-preview`; Actions: `limnexa-jltls-ci`. The local `.env.local` uses preview. Runtime service identities are separately provisioned and cannot grant roles/configure policy. Never move a production token to CI.

From the repository's `spacetimedb` wrapper, publish with `spacetime publish DATABASE --server maincloud --module-path spacetimedb --yes=remote --delete-data=never --no-config`. Generate bindings with `spacetime generate --lang typescript --out-dir ../lib/spacetime/bindings --module-path spacetimedb`. Run static checks and deployment gates before production. Keep previous Vercel deployments available for application rollback; additive tables preserve previous evidence. Never erase the database to make a migration pass.

## Access

Open Operations, expand My access, copy the public device identity. From the owner-authenticated workspace run `npx tsx scripts/grant-role.ts DATABASE IDENTITY officer` or `scientist` / `health`. The health role sees only explicitly officer-authorized surveillance handoffs and may acknowledge its responsibility or request evidence at handed-off sites. It has no access to raw citizen evidence or private investigator notes. Reload/reconnect the device. Use `citizen` to revoke a professional role. Owner grants are audited operational account actions; a frontend cannot grant itself authority. Do not paste owner/service JWTs into a page. Use separate browser contexts for independent citizen follow-up and professional review.

Real site configuration, source enrollment and local scientific policy activation are owner-only reducers: `configureSite`, `registerSource`, `configurePolicy`. Preserve the source/version/reason. Do not activate the synthetic policy for real records. Open-Meteo support uses completed hourly rain totals, so only matching whole-hour policy windows are supported by that context provider.

## Runtime secrets

`.env.example` enumerates supported settings. Vercel stores production/preview secrets separately. `scripts/provision-service.ts DATABASE preview|production` creates a new restricted service identity and ignored environment file; `scripts/sync-runtime.ts preview|production` uploads it via stdin. Revoke the old service identity with an owner role grant to citizen after replacing the deployed credential. Rotate CRON_SECRET with the service environment. Private Blob credentials remain server-only.

A historical ElevenLabs key was exposed outside this repository. Revoke it in ElevenLabs, issue a fresh restricted key, and set ELEVENLABS_API_KEY in the intended Vercel environments. Set an authorized ELEVENLABS_VOICE_ID for guidance. Redeploy and test transcription and guidance once; never reuse the historical value. No key is committed here.

Set an authorized HTTPS FHIR_DESTINATION_URL (FHIR server base) and optional FHIR_DESTINATION_TOKEN. Delivery uses PUT `Bundle/{id}` and an idempotency key. Confirm that the receiver permits this Bundle type/profiles before activation. No receiving endpoint is invented. Downloads and official local validation work without an external receiver.

AI Gateway uses a server key or Vercel managed authentication. Model-purpose defaults are `openai/gpt-5.4-mini`, separately configurable for text and media. AI_DISABLED=true gives a reproducible total-outage fallback. Each authenticated identity is limited to 20 audited assistance reservations per hour. Voice uses the same audit limiter.

## Failure and recovery

- Evidence disconnect: drafts/images stay in IndexedDB; restore connectivity and let SDK reconnection retry the stable ID. Keep storage until the ledger confirms submission.
- Media interrupted: use Retry queued images. Existing private uploads are finalized before another upload. Observation submission is blocked while binary verification is pending.
- AI/voice outage: use typed reporting and displayed protocol text. An unavailable model supplies no default measurement or decision.
- Weather failure: Workflow retries; stored evidence remains, and missing context cannot satisfy the rainfall condition. Synthetic scenarios use their declared synthetic context.
- Delivery timeout/outage: inspect Operations status and durable Vercel workflow logs. Leases expire after five minutes; launch reservations after 15. Eight failed attempts produce dead status. An officer may call `retryDeadDelivery` with the outbox ID and accountable reason after fixing configuration. This records an immutable incident audit event and does not change its scientific state.
- Officer acknowledgement: the durable run sleeps ten minutes and records an engineering SLA event if the investigation remains unacknowledged; it does not assert increased hazard.
- Cron: daily at 05:00 UTC, authenticated by CRON_SECRET. Professionals can trigger immediate dispatch; a confirmed citizen report triggers only its own evidence site. A sweep handles at most 20 eligible rows; use additional authorized dispatches for a backlog.

`/api/health` exposes only the database name and configuration booleans. It is configuration visibility, not proof of provider connectivity. Use the release probe/result files for verified delivery evidence. CI runs isolated live reducers, official FHIR fixtures, production build and browser/PWA tests. Live Blob and hosted durable workflow checks run as release probes, avoiding repeated provider work in every UI test.
