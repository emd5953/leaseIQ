/** Model output is data, not a typed API response. Preserve structured terms as readable text. */
export function reportText(value: unknown, depth = 0): string {
  if (value == null) return 'Not specified';
  if (typeof value === 'string') return value.trim() || 'Not specified';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (depth >= 6) return 'Complex value; verify in the original document';
  if (Array.isArray(value))
    return value.map((item) => reportText(item, depth + 1)).join('; ') || 'Not specified';
  if (typeof value === 'object')
    return (
      Object.entries(value)
        .map(
          ([key, item]) =>
            `${key.replace(/([a-z])([A-Z])/g, '$1 $2')}: ${reportText(item, depth + 1)}`,
        )
        .join('; ') || 'Not specified'
    );
  return 'Not specified';
}

export function normalizeLeaseReport(input: Record<string, any>) {
  const terms = (value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, reportText(item)]))
      : {};
  const list = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => reportText(item)) : [];
  return {
    summary: reportText(input.summary),
    overallRating: ['favorable', 'neutral', 'concerning'].includes(input.overallRating)
      ? (input.overallRating as 'favorable' | 'neutral' | 'concerning')
      : null,
    keyTerms: terms(input.keyTerms),
    financialSummary: leaseFinancialSummary(terms(input.keyTerms)),
    redFlags: Array.isArray(input.redFlags)
      ? input.redFlags
          .filter((flag: any) => flag && typeof flag === 'object')
          .map((flag: any) => ({
            title: reportText(flag.title),
            description: reportText(flag.description),
            severity: ['high', 'medium', 'low'].includes(flag.severity)
              ? (flag.severity as 'high' | 'medium' | 'low')
              : ('low' as const),
          }))
      : [],
    importantDates: Array.isArray(input.importantDates)
      ? input.importantDates
          .filter((item: any) => item && typeof item === 'object')
          .map((item: any) => ({
            date: reportText(item.date),
            description: reportText(item.description),
          }))
      : [],
    tenantRights: list(input.tenantRights),
    landlordObligations: list(input.landlordObligations),
    terminationClauses: list(input.terminationClauses),
    recommendations: list(input.recommendations),
  };
}

/** Derive subtotals only from unambiguous dollar amounts; model-generated totals are discarded. */
export function leaseFinancialSummary(keyTerms: Record<string, unknown>) {
  const cents = (value: unknown): number | null => {
    if (
      typeof value !== 'string' ||
      !/^\$\s*(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value.trim())
    )
      return null;
    const number = Math.round(Number(value.replace(/[$,\s]/g, '')) * 100);
    return Number.isSafeInteger(number) && number >= 0 ? number : null;
  };
  const rent = cents(keyTerms.monthlyRent);
  const deposit = cents(keyTerms.securityDeposit);
  if (rent === null || rent <= 0 || !Number.isSafeInteger(rent * 12)) return {};
  const dollars = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value % 100 ? 2 : 0,
    }).format(value / 100);
  return {
    monthlyTotal: dollars(rent),
    annualCost: dollars(rent * 12),
    ...(deposit !== null && Number.isSafeInteger(rent + deposit)
      ? { totalMoveInCost: dollars(rent + deposit) }
      : {}),
    calculationBasis:
      'Calculated from extracted rent and deposit. Other fees and utilities are excluded; this is not a complete move-in quote.',
  };
}
