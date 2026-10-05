# Limnexa

Limnexa is an evidence-to-action prototype for urban freshwater monitoring. It separates citizen observations from deterministic rule decisions and shows a **fully synthetic** investigation scenario.

## Run locally

Node 20.9 or newer is required. Run `npm install`, `npm run dev`, then open `http://localhost:3000`. Run `npm run typecheck`, `npm test`, and `npm run build` to check this build.

## Current scope

The synthetic scenario uses the domain rule functions in `lib/domain.ts`. The citizen form persists an offline draft locally. It does **not** submit to an authoritative database. Officer transitions, authentication, SpacetimeDB, media, AI, voice, outbox, FHIR validation, and deployment are not implemented. The interface labels these boundaries rather than presenting them as operational.

## Activation requirements

Install the SpacetimeDB CLI, create a private Maincloud module with identity-aware reducers, and generate client bindings. Configure Vercel and runtime secrets before activating external flows. Rotate the previously exposed ElevenLabs credential before using voice. See `.env.example`; never put secret values in the repository.

The full target and acceptance criteria are in `../LIMNEXA_AGENT_BUILD_PROMPT.md`. This repository is a partial build and does not yet meet that specification's definition of done.
