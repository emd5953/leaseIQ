import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateLease, validateFloorPlan } from '../../src/services/analysis-validation';
import { EmailService } from '../../src/services/email.service';
import { GeocodingService } from '../../src/ingestion/services/geocoding';
import { config } from '../../src/config';
const lease = {
  summary: 'Observed text',
  overallRating: null,
  redFlags: [],
  keyTerms: { monthlyRent: null },
  financialSummary: {},
  importantDates: [],
  tenantRights: [],
  landlordObligations: [],
  terminationClauses: [],
  recommendations: [],
};
const floor = {
  summary: 'Observed image',
  layout: { bedrooms: null, bathrooms: 1, totalRooms: null },
  spaceEfficiency: null,
  features: [],
  pros: [],
  cons: [],
  recommendations: [],
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('Analysis provider boundaries', () => {
  it('preserves unknown values and rejects malformed provider output', () => {
    expect(validateLease(lease).keyTerms.monthlyRent).toBeNull();
    expect(validateFloorPlan(floor).layout.bedrooms).toBeNull();
    for (const bad of [
      {},
      { ...lease, summary: {} },
      { ...lease, redFlags: [{}] },
      { ...lease, keyTerms: { monthlyRent: {} } },
    ])
      expect(() => validateLease(bad)).toThrow();
    for (const bad of [
      {},
      { ...floor, layout: { bedrooms: -1 } },
      { ...floor, features: 'closet' },
      { ...floor, pros: [{}] },
    ])
      expect(() => validateFloorPlan(bad)).toThrow();
  });
  it('escapes document text in email and labels unknown room counts', async () => {
    const send = vi
      .spyOn(EmailService, 'send')
      .mockResolvedValue({ success: true, messageId: 'fixture' });
    await EmailService.sendCombinedAnalysis('fixture@example.com', {
      lease: { ...lease, summary: '<img src=x onerror=alert(1)>' },
      floorPlan: floor,
    });
    expect(send.mock.calls[0][0].html).toContain('&lt;img');
    expect(send.mock.calls[0][0].html).not.toContain('<img src=x');
    expect(send.mock.calls[0][0].html).toContain('Unknown');
  });
  it('requires provider confirmation instead of claiming success on rejection or timeout', async () => {
    const key = config.resend.apiKey;
    config.resend.apiKey = 'fixture';
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'rejected' }), { status: 422 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'fixture' }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    try {
      expect(
        await EmailService.send({ to: 'fixture@example.com', subject: 'fixture', html: 'fixture' }),
      ).toMatchObject({ success: false, uncertain: false });
      for (let i = 0; i < 2; i++)
        expect(
          await EmailService.send({
            to: 'fixture@example.com',
            subject: 'fixture',
            html: 'fixture',
          }),
        ).toMatchObject({ success: false, uncertain: true });
      expect(
        await EmailService.send({ to: 'fixture@example.com', subject: 'fixture', html: 'fixture' }),
      ).toMatchObject({ success: true, messageId: 'fixture' });
    } finally {
      config.resend.apiKey = key;
    }
  });
});
describe('Optional geocoding without invented matches', () => {
  const row = { geometry: { location_type: 'ROOFTOP', location: { lat: 40.7, lng: -73.9 } } };
  it('uses the fixed provider endpoint, caches a precise result and rejects ambiguous, partial, or invalid coordinates', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'OK', results: [row] })));
    vi.stubGlobal('fetch', fetcher);
    const service = new GeocodingService('fixture');
    expect(await service.geocode('Fixture address')).toEqual({ latitude: 40.7, longitude: -73.9 });
    await service.geocode('Fixture address');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toContain(
      'https://maps.googleapis.com/maps/api/geocode/json',
    );
    for (const results of [
      [],
      [row, row],
      [{ ...row, partial_match: true }],
      [{ geometry: { location_type: 'ROOFTOP', location: { lat: 100, lng: 0 } } }],
    ]) {
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'OK', results })));
      expect(await new GeocodingService('fixture').geocode('Fixture')).toBeNull();
    }
  });
});
