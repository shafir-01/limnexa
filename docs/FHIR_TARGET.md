# Pinned interoperability target

Limnexa maps to FHIR R4 4.0.1. The environmental Location and indicator Observation profiles come from the official OneAquaHealth repository at commit `b907cf0869b59d82d9138b3d147fca66f333d911`, inspected 5 October 2026. Its configuration declares `hl7.eu.fhir.oah` version `0.1.0-ci-build`.

The exact source is pinned at https://github.com/hl7-eu/oah/tree/b907cf0869b59d82d9138b3d147fca66f333d911 and compiled with SUSHI 3.20.1: 0 errors, 0 warnings. Relevant generated StructureDefinitions and their terminology are committed in `standards/oah` as pinned upstream artifacts. Compilation uses R4 core 4.0.1 and cross-version extensions `hl7.fhir.uv.xver-r5.r4#0.1.0`.

The mapper uses the OAH `foam`, `dissolvedO2`, `waterTemperature`, `pH`, and `conductivity` concepts when the evidence actually supports them. Numeric readings originate only in explicit instrument records. Other text reports use a base R4 Observation. There are no patients, individual clinical records, or DetectedIssue resources. Specimen is omitted because this build does not claim to collect physical samples.

Every included source Observation has linked Provenance, a content hash, capture time, and pseudonymous source lineage. Public exports omit exact citizen identity and coarsen real coordinates. Task carries operational work, and Communication has status `preparation`: exporting a packet does not falsely assert that its notification was delivered. The observation intake Organization is the data custodian; Provenance separately records the original contributor.

Run `npm run validate:fhir` with Java 21 available. It downloads the official validator 6.10.4 if absent and checks SHA-256 `1106b9d58f9e363e47bea7c4fc065841e5fc91fe9d062775c3bfdd212bd653cc`. It validates the committed positive and deliberately invalid fixtures against R4, the pinned profiles, and https://tx.fhir.org/r4. The positive fixture must have no error/fatal issues; the missing-status negative fixture must be rejected. The recorded outcome is in `docs/validation/fhir-result.json`.

Runtime exports additionally check their narrow mapping contract and every internal reference. This is not a claim that the Java validator runs on each HTTP request. The official validator tests the mapping fixtures and runs as a CI release gate. Changing the mapper or profiles requires rerunning that gate. Synthetic labels appear on every exported resource.
