# Data governance and evidence claims

## Claim classes

Citizen text and photos are reported observations, not confirmed environmental facts. An instrument reading is a measurement only when the source declares an instrument, protocol, value, unit and acquisition context. Validation assertions describe evidence quality. Weather enrichment and computed corroboration are derived context. Model output is a proposed inference. A professional finding and an operational decision each identify their author and source records. The interface and FHIR mapper keep these classes separate; none is silently promoted to another.

## History and provenance

The original report has a stable client submission ID and content hash. A correction appends a revision linked to the original, with a reason and owner check. The initial rule trace contains the evidence IDs, policy snapshot, inputs, check results, time and hash that supported the decision at that time. Later expert rejection affects later eligibility; it does not rewrite that trace. Professional findings, intervention descriptions, review results, incident transitions and delivery attempts are recorded separately. See [domain model](DOMAIN_MODEL.md).

## Synthetic and real material

Demonstration data, sites, policy and weather are explicitly marked synthetic. Seeding submits synthetic inputs through production reducers and leaves existing records intact. Real source lineage must be enrolled by an administrator; a real alert additionally needs a canonical site and sourced local policy. The demonstration's parameters must never be treated as local legal or scientific standards. The public map presents sanitized synthetic records and coarsens real site coordinates.

## Privacy and retention

Private evidence is exposed through identity- and role-scoped database views. A device identity is pseudonymous, not a verified person. Health recipients see only authorized handoff summaries and their own responsibilities, not raw citizen evidence or investigator notes. Images are normalized before upload to remove metadata, held in private Blob storage, checked for signature/hash/metadata, and retrieved through authenticated no-store routes. Offline drafts and queued media remain on the capturing device until submission and verification. Limnexa does not persist raw microphone audio. FHIR exports use pseudonymous lineage and coarsened real coordinates.

Evidence, revisions and professional audits are retained by the application; releases do not delete them. An operator collecting real data must define lawful retention periods, subject rights, incident holds, provider retention settings, and operational deletion/export procedures for the jurisdiction. This build does not assert a universal retention schedule or verified human identity. See [threat model](THREAT_MODEL.md) and [runbook](OPERATIONS_RUNBOOK.md).
