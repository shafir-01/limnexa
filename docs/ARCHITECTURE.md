# Architecture and remaining production work

The current app is a static Next.js interface over deterministic TypeScript domain functions. Synthetic source observations pass through `evaluatePolicy`; the same trace powers the operations page and tests. `transition` rejects illegal incident moves. The browser report form stores only a local draft.

The production architecture requires identity-scoped private SpacetimeDB tables and reducers for observations, revisions, validation, policies, traces, incidents, actions, missions, and outbox messages. Reducers must enforce roles and commit an outbox record atomically with state. A durable worker must deliver side effects idempotently. Media belongs in private Blob storage. FHIR mapping belongs at the export boundary and must pass a pinned validator. AI and voice must remain optional aids with no authority to change incidents.

The present build does not contain those services. It should not be used for real environmental incident management.
