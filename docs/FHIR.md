# FHIR R4 interoperability

The exact conformance target, source commit, mapping rationale, validator checksum and limitations are in [FHIR_TARGET.md](FHIR_TARGET.md). Limnexa targets FHIR R4 4.0.1 and the draft OneAquaHealth `hl7.eu.fhir.oah` `0.1.0-ci-build` source at commit `b907cf0869b59d82d9138b3d147fca66f333d911`.

The export maps a canonical site to Location; supported environmental measurements to Observation; source and transformation lineage to Provenance; an operational assignment to Task; and a prepared handoff to Communication. There is no fabricated Patient, clinical finding or physical Specimen. An unsent packet is never labeled as delivered. Export includes synthetic markers where applicable.

Run `npm run validate:fhir` with Java 21. The script checks the pinned HL7 validator 6.10.4 SHA-256 and validates a positive fixture and an intentionally invalid negative fixture. The [recorded result](validation/fhir-result.json) is positive 0 errors/0 warnings and negative 2 errors. Hosted export retrieval was also checked in the [preview probe](validation/preview-result.json). Runtime export contract and reference checks do not replace a per-packet official validator invocation. External delivery requires an authorized HTTPS receiver and is idempotent; none is configured in this build.
