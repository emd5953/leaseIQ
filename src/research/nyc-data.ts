import { ResearchSource } from './types';

export const datasets = {
  buildings: { id: 'kj4p-ruqc', name: 'HPD · Buildings subject to jurisdiction' },
  violations: { id: 'wvxf-dwi5', name: 'HPD · Housing maintenance code violations' },
  registrations: { id: 'tesw-yqqr', name: 'HPD · Multiple dwelling registrations' },
  contacts: { id: 'feu5-w2e2', name: 'HPD · Registration contacts' },
  pluto: { id: '64uk-42ks', name: 'City Planning · PLUTO tax lot records' },
  subway: { id: '39hk-dx4f', name: 'MTA · Subway stations' },
} as const;
export type Dataset = keyof typeof datasets;
export type Row = Record<string, string>;
export interface DataResult { rows: Row[]; source: ResearchSource }
export interface ResearchDataClient {
  query(dataset: Dataset, params: Record<string, string>): Promise<DataResult>;
}
export const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

/** Bounded, read-only access to a fixed set of NYC Open Data datasets. */
export class NycDataClient implements ResearchDataClient {
  private metadata = new Map<string, { updated: string | null; expires: number }>();
  private pendingMetadata = new Map<string, Promise<string | null>>();
  constructor(private fetcher: typeof fetch = fetch) {}

  private async updatedAt(id: string, domain: string): Promise<string | null> {
    const cached = this.metadata.get(id);
    if (cached && cached.expires > Date.now()) return cached.updated;
    const pending = this.pendingMetadata.get(id);
    if (pending) return pending;
    const request = (async () => {
      let updated: string | null = null;
      try {
        const response = await this.fetcher(`https://${domain}/api/views/${id}.json`, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('Metadata unavailable');
        const data = await response.json() as { rowsUpdatedAt?: number };
        if (data.rowsUpdatedAt && Number.isFinite(data.rowsUpdatedAt)) updated = new Date(data.rowsUpdatedAt * 1000).toISOString();
      } catch { /* Missing metadata must never masquerade as today's date. */ }
      this.metadata.set(id, { updated, expires: Date.now() + (updated ? 3600000 : 60000) });
      return updated;
    })();
    this.pendingMetadata.set(id, request);
    try { return await request; } finally { this.pendingMetadata.delete(id); }
  }

  async query(dataset: Dataset, params: Record<string, string>): Promise<DataResult> {
    const { id, name } = datasets[dataset];
    const domain = dataset === 'subway' ? 'data.ny.gov' : 'data.cityofnewyork.us';
    const url = new URL(`https://${domain}/resource/${id}.json`);
    Object.entries({ '$limit': '50', ...params }).forEach(([key, value]) => url.searchParams.set(key, value));
    const source: ResearchSource = {
      id: dataset, name, url: `https://${domain}/d/${id}`, queryUrl: url.toString(),
      retrievedAt: new Date().toISOString(), datasetUpdatedAt: null, status: 'unavailable', detail: '',
    };
    const metadata = this.updatedAt(id, domain);
    try {
      const response = await this.fetcher(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Source returned an unexpected response');
      source.status = rows.length ? 'available' : 'empty';
      source.detail = rows.length ? 'Records retrieved for this query.' : 'No records returned for this query; this is not a clean bill of health.';
      source.datasetUpdatedAt = await metadata;
      return { rows, source };
    } catch (error) {
      source.detail = error instanceof Error && error.name === 'TimeoutError'
        ? 'Source timed out. Retry the report or check the source directly.'
        : error instanceof Error ? error.message : 'Source unavailable';
      source.datasetUpdatedAt = await metadata;
      return { rows: [], source };
    }
  }
}
