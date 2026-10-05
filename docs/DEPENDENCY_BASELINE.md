# Dependency baseline

Inspected 2026-10-05. Local Node: 24.14.1. `pnpm`, `spacetime`, and `vercel` CLIs were absent at initial inspection. Next.js installation docs require Node 20.9+ and document Next.js 16 App Router setup. SpacetimeDB TypeScript quickstart documents `spacetimedb/server` tables and reducers, and its chat tutorial states tables are private by default. The OneAquaHealth guide lists `hl7.eu.fhir.oah#0.1.0-ci-build`, FHIR R4, draft CI build dated 2026-06-11. A CI build is not a stable conformance target; no OAH conformance claim is made here.

Sources: https://nextjs.org/docs/app/getting-started/installation ; https://spacetimedb.com/docs/quickstarts/typescript/ ; https://spacetimedb.com/docs/tutorials/chat-app/ ; https://build.fhir.org/ig/hl7-eu/oah/downloads.html
