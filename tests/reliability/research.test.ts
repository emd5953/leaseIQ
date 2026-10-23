import { describe, it, expect, vi } from 'vitest';
import { ResearchService, validateResearchAddress } from '../../src/services/research.service';
import { NycDataClient, ResearchDataClient, Dataset, Row, DataResult } from '../../src/research/nyc-data';

const fixture: Record<Dataset, Row[]> = {
  buildings: [{ buildingid: '34133', bin: '1078861', block: '1026', lot: '7502', housenumber: '230', streetname: 'WEST 55 STREET', boro: 'MANHATTAN', zip: '10019' }],
  violations: [{ class: 'C', violationstatus: 'Open', count: '2' }, { class: 'A', violationstatus: 'Close', count: '5' }],
  registrations: [{ registrationid: '139588', lastregistrationdate: '2025-08-01', registrationenddate: '2026-09-01' }],
  contacts: [{ type: 'Agent', corporationname: 'Example Management' }],
  subway: [],
  pluto: [{ yearbuilt: '1979', unitsres: '232', numbldgs: '1', cd: '105', policeprct: '18', ownername: 'Example Owner' }],
};
function dataClient(overrides: Partial<Record<Dataset, Row[] | 'unavailable'>> = {}) {
  return { query: vi.fn(async (dataset: Dataset, params: Record<string, string>): Promise<DataResult> => {
    const records = overrides[dataset] ?? fixture[dataset];
    const rows = records === 'unavailable' ? [] : dataset === 'violations' && params.$order ? [
      { violationid: '42', class: 'C', violationstatus: 'Open', novdescription: 'Repair leak', novissueddate: '2025-01-01', currentstatusdate: '2025-01-02', apartment: '8B' },
      { violationid: '42', class: 'C', violationstatus: 'Open', novdescription: 'Repair leak', novissueddate: '2025-01-01' },
    ] : records;
    return { rows, source: { id: dataset, name: dataset, url: 'https://data.cityofnewyork.us/', retrievedAt: new Date().toISOString(), datasetUpdatedAt: '2026-08-12T00:00:00.000Z', status: records === 'unavailable' ? 'unavailable' : rows.length ? 'available' : 'empty', detail: records === 'unavailable' ? 'HTTP 403' : 'Retrieved' } };
  }) } satisfies ResearchDataClient;
}
const address = { street: '230 W. 55th St #8B', borough: 'Manhattan' };
describe('Evidence-backed rental reports', () => {
  it('matches the building without conflating a unit, counts distinct evidence, and attributes every fact', async () => {
    const client = dataClient();
    const report = await ResearchService.researchAddress(address, client);
    expect(client.query.mock.calls[0][1].$where).toContain("housenumber='230' AND streetname='WEST 55 STREET'");
    expect(report.match).toMatchObject({ buildingId: '34133', bbl: '1010267502', status: 'matched' });
    expect(report.metrics.map(m => m.value)).toEqual([2, 2, 7]);
    expect(report.violations).toHaveLength(1);
    expect(report.sections.flatMap(s => s.facts).every(f => f.sourceIds.every(id => report.sources.some(s => s.id === id)))).toBe(true);
    expect(report.summary).toContain('including 2 class C');
    expect(report.sections[2].analysis.join(' ')).toContain('published dataset may lag');
    expect(report).not.toHaveProperty('neighborhood.crimeLevel');
    expect(report).not.toHaveProperty('neighborhood.walkScore');
  });
  it('never converts a failed violation query into a zero or clean record', async () => {
    const report = await ResearchService.researchAddress(address, dataClient({ violations: 'unavailable' }));
    expect(report.metrics.every(m => m.value === null)).toBe(true);
    expect(report.summary).toContain('unavailable');
    expect(report.sources.find(s => s.id === 'violations')?.status).toBe('unavailable');
  });
  it('does not interpret malformed count data as zero', async () => {
    const report = await ResearchService.researchAddress(address, dataClient({ violations: [{ count: 'NaN' }] }));
    expect(report.metrics[0].value).toBeNull();
  });
  it('qualifies a successful zero result and leaves reputation unverified', async () => {
    const report = await ResearchService.researchAddress(address, dataClient({ violations: [] }));
    expect(report.metrics[0].value).toBe(0);
    expect(report.sections[0].analysis.join()).toContain('does not establish');
    expect(report.sections[2].unknowns.join()).toContain('not been independently verified');
  });
  it.each([['not_found', []], ['ambiguous', [...fixture.buildings, { ...fixture.buildings[0], buildingid: '999' }]], ['unavailable', 'unavailable']] as const)('stops downstream joins when building identity is %s', async (status, rows) => {
    const client = dataClient({ buildings: rows as Row[] | 'unavailable' });
    const report = await ResearchService.researchAddress(address, client);
    expect(report.match.status).toBe(status);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(report.metrics).toEqual([]);
    expect(report.sources.slice(1).every(s => s.status === 'not_checked')).toBe(true);
  });
  it('keeps useful building evidence when registration is unavailable', async () => {
    const client = dataClient({ registrations: 'unavailable' });
    const report = await ResearchService.researchAddress(address, client);
    expect(report.metrics[0].value).toBe(2);
    expect(client.query.mock.calls.some(([id]) => id === 'contacts')).toBe(false);
    expect(report.sections[2].unknowns.join()).toContain('could not be established');
  });
  it('adds nearby stations with explicit distance and service limitations', async () => {
    const report = await ResearchService.researchAddress(address, dataClient({
      pluto: [{ latitude: '40.7646861', longitude: '-73.9826939' }],
      subway: [{ station_id: '1', complex_id: '1', stop_name: 'Test station', daytime_routes: 'N W', gtfs_latitude: '40.765', gtfs_longitude: '-73.983' }],
    }));
    expect(report.sections[1].facts[0].value).toContain('straight-line');
    expect(report.sections[1].analysis.join()).toContain('not entrances or walking routes');
    expect(report.sources.find(s => s.id === 'subway')?.status).toBe('available');
  });
  it('rejects unsupported or incomplete addresses', () => {
    expect(validateResearchAddress({ street: '123 Main Street', borough: 'Boston' })).toBe(false);
    expect(validateResearchAddress({ street: 'Broadway', borough: 'Manhattan' })).toBe(false);
    expect(validateResearchAddress({ street: '123 Main St', borough: '__proto__' })).toBe(false);
  });
});

describe('Source access and provenance', () => {
  it('uses publisher timestamps rather than retrieval time and escapes user strings', async () => {
    const fetcher = vi.fn(async (url: any) => new Response(JSON.stringify(String(url).includes('/api/views/') ? { rowsUpdatedAt: 1700000000 } : [{ buildingid: '1' }]), { status: 200 }));
    const result = await new NycDataClient(fetcher as typeof fetch).query('buildings', { '$where': "housenumber='1'" });
    expect(result.source.datasetUpdatedAt).toBe('2023-11-14T22:13:20.000Z');
    expect(result.source.retrievedAt).not.toBe(result.source.datasetUpdatedAt);
    expect(result.source.queryUrl).toContain('%24where=');
  });
  it.each([403, 429, 500])('preserves HTTP %s as unavailable', async status => {
    const fetcher = vi.fn(async () => new Response('{}', { status }));
    const result = await new NycDataClient(fetcher as typeof fetch).query('violations', {});
    expect(result.source.status).toBe('unavailable');
    expect(result.source.detail).toContain(String(status));
    expect(result.source.datasetUpdatedAt).toBeNull();
  });
  it('preserves timeouts as unavailable', async () => {
    const fetcher = vi.fn(async () => { throw new DOMException('Timed out', 'TimeoutError'); });
    const result = await new NycDataClient(fetcher as typeof fetch).query('violations', {});
    expect(result.source.status).toBe('unavailable');
    expect(result.source.detail).toContain('timed out');
  });
});
