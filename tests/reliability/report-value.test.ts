import { describe, expect, it } from 'vitest';
import { reportValue } from '../../frontend/src/lib/report-value';
describe('Safe report display across deployment versions', () => {
  it('preserves structured utilities without passing an object to React', () => {
    expect(reportValue({ heat: 'included', hotWater: 'included', electricity: 'tenant' })).toBe('heat: included; hot Water: included; electricity: tenant');
    expect(reportValue(['one', { fee: 25 }])).toBe('one; fee: 25');
    expect(reportValue(null)).toBe('Not specified');
    expect(reportValue(0)).toBe('0');
  });
});
