import {it,expect,vi} from 'vitest';
import {fixture} from './fixture';
import {toBundle} from './map';
import {deliverBundle} from './delivery';
it('repeats the same PUT resource and idempotency key',async()=>{const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:200})),bundle=toBundle(fixture());await deliverBundle(bundle,'stable-key',{url:'https://fhir.example/r4'},fetcher);await deliverBundle(bundle,'stable-key',{url:'https://fhir.example/r4'},fetcher);expect(fetcher.mock.calls[0]?.[0]).toBe(fetcher.mock.calls[1]?.[0]);expect(fetcher.mock.calls[0]?.[1]?.method).toBe('PUT');expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({'idempotency-key':'stable-key'})});
it('destination outages leave the caller with a retryable failure',async()=>{const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:503}));await expect(deliverBundle(toBundle(fixture()),'stable-key',{url:'https://fhir.example/r4'},fetcher)).rejects.toThrow('FHIR_DESTINATION_RETRYABLE')});
