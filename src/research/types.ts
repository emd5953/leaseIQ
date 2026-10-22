export type EvidenceStatus = 'available' | 'empty' | 'unavailable' | 'not_checked';
export interface ResearchSource {
  id: string;
  name: string;
  url: string;
  queryUrl?: string;
  retrievedAt: string;
  datasetUpdatedAt: string | null;
  status: EvidenceStatus;
  detail: string;
}
export interface Finding {
  label: string;
  value: string;
  sourceIds: string[];
}
export interface ResearchSection {
  id: 'building' | 'neighborhood' | 'management';
  title: string;
  facts: Finding[];
  analysis: string[];
  unknowns: string[];
  questions: string[];
}
export interface ResearchResult {
  version: 2;
  generatedAt: string;
  address: string;
  summary: string;
  match: {
    status: 'matched' | 'not_found' | 'ambiguous' | 'unavailable';
    explanation: string;
    buildingId?: string;
    bin?: string;
    bbl?: string;
    matchedAddress?: string;
  };
  metrics: { label: string; value: number | null; detail: string; sourceIds: string[] }[];
  sections: ResearchSection[];
  violations: { id: string; class: string; status: string; description: string; issuedAt: string | null; statusAt: string | null; apartment: string | null }[];
  sources: ResearchSource[];
  limitations: string[];
  resourceLinks: { name: string; url: string }[];
  tips: string[];
}
