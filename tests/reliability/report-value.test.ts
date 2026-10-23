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


import { leaseFinancialSummary } from '../../src/utils/lease-report';
describe('Ambiguous financial terms', () => {
  it('does not assume a missing deposit is zero or turn a range into an exact amount', () => {
    expect(leaseFinancialSummary({ monthlyRent: '$3,200', securityDeposit: 'Not specified' })).not.toHaveProperty('totalMoveInCost');
    expect(leaseFinancialSummary({ monthlyRent: '$3,200–$3,500', securityDeposit: '$3,200' })).toEqual({});
    expect(leaseFinancialSummary({ monthlyRent: 'EUR 3200', securityDeposit: 'EUR 3200' })).toEqual({});
    expect(leaseFinancialSummary({ monthlyRent: '$3,200.50', securityDeposit: '$0' })).toMatchObject({ totalMoveInCost: '$3,200.50', annualCost: '$38,406' });
  });
});
