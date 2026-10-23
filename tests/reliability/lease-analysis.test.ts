import { afterEach, describe, expect, it, vi } from 'vitest';
const { complete } = vi.hoisted(() => ({ complete: vi.fn() }));
vi.mock('openai', () => ({ default: class { chat = { completions: { create: complete } }; } }));
import { LeaseService } from '../../src/services/lease.service';
afterEach(() => vi.resetAllMocks());
describe('Evidence-based lease extraction', () => {
  it('does not assume a jurisdiction or fill gaps with example facts, and discloses truncation', async () => {
    complete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ summary: 'Document summary', keyTerms: { parking: 'Not specified' } }) } }] });
    const result = await LeaseService.analyzeLease('x'.repeat(16000));
    const messages = complete.mock.calls[0][0].messages;
    expect(messages[0].content).toContain('untrusted data');
    expect(messages[1].content).not.toContain('Pennsylvania');
    expect(messages[1].content).toContain('Never invent');
    expect(result.tenantRights).toEqual([]);
    expect(result.limitations?.join(' ')).toContain('15,000');
  });
  it.each([null, '{}', '{broken'])('rejects absent or malformed model results (%s)', async content => {
    complete.mockResolvedValue({ choices: [{ message: { content } }] });
    await expect(LeaseService.analyzeLease('test lease')).rejects.toThrow('temporarily unavailable');
  });
  it('propagates provider failure instead of returning a neutral successful rating', async () => {
    complete.mockRejectedValue(new Error('provider unavailable'));
    await expect(LeaseService.analyzeLease('test lease')).rejects.toThrow('temporarily unavailable');
  });
});

describe('Structured model values from the real upload regression', () => {
  it('renders structured utilities, financial amounts and narrative items as readable text', async () => {
    complete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({
      summary: 'Fictional lease', keyTerms: { utilities: { heat: 'included', hotWater: 'included', electricity: 'tenant', internet: 'tenant' }, monthlyRent: 3200, parking: null },
      financialSummary: { totalMoveInCost: { rent: 3200, deposit: 3200, total: 6400 } },
      tenantRights: [{ entry: '24 hours notice' }], redFlags: [null, { title: 'Review', description: { clause: 'Example' }, severity: 'medium' }],
    }) } }] });
    const result = await LeaseService.analyzeLease('fictional lease');
    expect(result.keyTerms.utilities).toBe('heat: included; hot Water: included; electricity: tenant; internet: tenant');
    expect(result.keyTerms.monthlyRent).toBe('3200');
    expect(result.keyTerms.parking).toBe('Not specified');
    expect(result.financialSummary.totalMoveInCost).toContain('total: 6400');
    expect(result.tenantRights).toEqual(['entry: 24 hours notice']);
    expect(result.redFlags).toHaveLength(1);
    expect(result.redFlags[0].description).toBe('clause: Example');
  });
});
