/** Live, read-only source smoke test. No listing credentials, email, or DB required. */
import { ResearchService } from '../src/services/research.service';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const outputDir = process.env.RESEARCH_VALIDATION_OUTPUT;
  const properties = [
    { street: '230 West 55 Street', borough: 'Manhattan' },
    { street: '125 Court Street', borough: 'Brooklyn' },
    { street: '42-12 28 Street', borough: 'Queens' },
  ];
  for (const property of properties) {
    const report = await ResearchService.researchAddress(property);
    const unavailable = report.sources.filter(s => s.status === 'unavailable');
    console.log(JSON.stringify({ address: report.address, match: report.match.status, buildingId: report.match.buildingId, metrics: report.metrics.map(m => ({ label: m.label, value: m.value })), sourceStatus: report.sources.map(s => ({ name: s.name, status: s.status, datasetUpdatedAt: s.datasetUpdatedAt })), transit: report.sections[1].facts.filter(f => f.label.startsWith('Subway')) }, null, 2));
    if (report.match.status !== 'matched' || unavailable.length) process.exitCode = 1;
    if (outputDir) {
      await mkdir(outputDir, { recursive: true });
      await writeFile(path.join(outputDir, `${property.borough.toLowerCase()}.json`), JSON.stringify(report, null, 2));
    }
  }
  const unmatched = await ResearchService.researchAddress({ street: '999999 Unmatched Street', borough: 'Manhattan' });
  if (unmatched.match.status !== 'not_found' || unmatched.metrics.length) throw new Error('Unmatched addresses must never receive building findings');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
