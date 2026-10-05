# Domain model and claim boundaries

| Record | Authority and lineage |
|---|---|
| Evidence | Immutable citizen report or explicit instrument measurement; canonical site/reach, observation/submission time, actual GPS accuracy, protocol, owner, source lineage, media hashes, content hash |
| Revision | New evidence ID referencing its owned original, with a mandatory correction reason; originals remain queryable |
| Validation | Evidence ID plus ten independent dimensions, validator version, eligibility and diagnostic codes; no scalar trust score |
| Policy | Immutable ID/version, source title/URI/retrieval date, explicit synthetic/configured-local status, scoped site assignment |
| Weather | Stored context with source/method/time; real context is modelled rainfall with exact interval and units, synthetic context is explicitly synthetic |
| Rule execution | Immutable inputs, policy snapshot, execution time, checked conditions, independent groups, outcome, route and canonical trace hash |
| Incident | Initial rule trace and evidence IDs; officer-only legal transitions with append-only events |
| Finding / intervention | Professional authored proof required for confirmation / action; no action recommendation is automatically performed |
| Expert verification | Append-only accepted/rejected review with actor/reason; latest rejection and supersession exclude evidence from future decisions |
| Mission / participation | Evidence deficit or post-action request, explained rationale, device claim, submitted evidence, professional verification status |
| Outbox / delivery / launch | Transactional command, unique idempotency key, attempt/receipt/error status and reserved durable run |
| Assistance | Purpose/model/input hash, schema-bound structured proposal, usage and explicit completion/unavailability; never domain authority |

Validation dimensions are acquisition quality, protocol adherence, spatial integrity, temporal integrity, instrument integrity, physical plausibility, completeness, corroboration, media support, and provenance completeness. Unknown, warning and not-applicable remain explicit. GPS omission is preserved and requires spatial review; a selected site location is never called captured GPS. Units/calibration and broad physical data bounds are integrity checks, not universal environmental standards.

Independent evidence groups use connected components: a shared enrolled lineage or shared image hash cannot count twice, including chains of copies. Real rules additionally require enrolled contributors and a sourced policy assigned to the canonical site. Active incidents are not duplicated by repeated evidence. Later rejection does not silently rewrite the historical initial trace or automatically dismiss an officer investigation.

Wastewater routing requires validated independent reports, stored qualifying weather and canonical reach agreement. Its result is investigation required, never proven contamination or pathogen risk. The instrument ecological negative control routes to a scientist and creates no health emergency. The demonstration's parameters are explicitly synthetic.

Incident states: CANDIDATE, VALIDATING, TRIAGED, INVESTIGATION_REQUIRED, ACKNOWLEDGED, INVESTIGATING, CONFIRMED, ACTION_REQUIRED, ACTIONED, FOLLOW_UP, CLOSED, DISMISSED. The shared transition table rejects forbidden pairs. Confirmation needs an eligible linked finding; action needs a recorded intervention. Normal closure needs post-action mission evidence accepted by a professional. Exceptional authorized closure requires an explicit accountable rationale. Neither closure nor a before/after pair proves improvement or causation.

FHIR uses environmental Location and Observation, Provenance, operational Task and prepared Communication. No Patient, individual clinical health data, inferred numeric chemistry, or clinical DetectedIssue is created. Real-world downstream public-health interpretation requires separate authorized professional evidence and responsibility.
