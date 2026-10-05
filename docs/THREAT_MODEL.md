# Threat model baseline

Untrusted reports can contain false claims or prompt injection. Keep them as data; validate schema and provenance before any rule run. Identity and role checks must live in authoritative reducers, not in UI conditionals. Public views must omit exact contributor identity and private media. Retryable side effects require stable idempotency keys. Runtime provider credentials must never reach the browser. This build has no production backend, so these controls are design requirements rather than verified protections.
