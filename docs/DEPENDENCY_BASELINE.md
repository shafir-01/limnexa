# Reproducible dependency baseline

Inspected and installed 5 October 2026. Node 24.14.1 / npm 11.11, Next 16.3.8, React 19, TypeScript 5.9, Tailwind 4.3, SpacetimeDB CLI/SDK 2.10.2, Workflow 5.0.1, AI SDK 7.0.127 / Gateway 4.0.103, Vercel CLI 62.2, Playwright 1.63, Gitleaks 8.30.0, SUSHI 3.20.1, Java 21 and official HL7 validator 6.10.4. Exact transitive versions are locked in package-lock.json.

Portable Windows tooling lives only in ignored `.tools`; SpacetimeDB CLI is installed under LOCALAPPDATA. CI sets up Node and Java, installs from the lockfile, and checksum-verifies downloaded Gitleaks and the official FHIR validator. The validator digest and official OAH source/artifact hashes are committed. Production dependency audit is a required CI gate; compatible patch overrides address Workflow's devalue/nanoid advisories. Development CLI advisories are tracked separately in ADR_001_TOOLCHAIN.md.

The OAH target is the exact official draft source snapshot and compiled environmental profiles described in FHIR_TARGET.md, not an unpinned CI URL or a claimed normative release. Local generated bindings match the published TypeScript module and are generated through the CLI.
