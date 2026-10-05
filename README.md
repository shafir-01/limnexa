# Limnexa

Limnexa is an evidence-to-action build for urban freshwater monitoring. It separates citizen observations from deterministic rule decisions and shows a **fully synthetic** investigation scenario. The synthetic observations and incident are stored in SpacetimeDB Maincloud, not frontend fixtures.

## Run locally

Node 20.9 or newer is required. Run `npm install`, `npm run dev`, then open `http://localhost:3000`. The app connects to `limnexa-jltls` on Maincloud by default. Run `npm run typecheck`, `npm test`, and `npm run build` to check this build. The module is in `spacetimedb/spacetimedb`; build it with `spacetime build --module-path spacetimedb/spacetimedb`.

## Current scope

The synthetic scenario was seeded through the authoritative `seed_demo` reducer. Private tables store observations, incidents, transitions, missions, roles, and outbox messages; public views expose only sanitized synthetic data. The citizen form preserves an offline draft and submits typed observations through a reducer when connected. Browser identities persist through a locally stored SpacetimeDB token. The demo-only rule cannot open a real-world incident from citizen reports.

Officer authentication UI, durable outbox dispatch, media, AI, voice, FHIR validation/delivery, and complete deployment verification are still incomplete. Public operations views are read-only; only owner or granted officer identities can transition incidents. The interface labels these boundaries rather than presenting them as operational.

## Activation requirements

The SpacetimeDB CLI is installed locally and its module has been published to the existing Maincloud database. The Vercel CLI is installed and the app is linked to the existing `shafir-2f05a117/limnexa` project. Configure runtime secrets before activating external flows. Rotate the previously exposed ElevenLabs credential before using voice. See `.env.example`; never put secret values in the repository.

The full target and acceptance criteria are in `../LIMNEXA_AGENT_BUILD_PROMPT.md`. This repository does not yet meet that specification's definition of done.
