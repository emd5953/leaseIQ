// Malformed provider output must remain a failed analysis, rather than a
// successful report with invented empty findings.
function object(value: any): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid analysis object');
  return value;
}
function text(value: any): string {
  if (typeof value !== 'string') throw new Error('Invalid analysis text');
  return value;
}
function strings(value: any): string[] {
  if (!Array.isArray(value)) throw new Error('Invalid analysis list');
  return value.map(text);
}
function terms(value: any): Record<string, any> {
  return Object.fromEntries(
    Object.entries(object(value)).map(([key, v]) => [key, v === null ? null : text(v)]),
  );
}
function numberOrNull(value: any): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error('Invalid room count');
  return value;
}
export function validateLease(value: any) {
  const v = object(value);
  if (
    !text(v.summary).trim() ||
    ![null, 'favorable', 'neutral', 'concerning'].includes(v.overallRating)
  )
    throw new Error('Invalid lease summary');
  if (!Array.isArray(v.redFlags) || !Array.isArray(v.importantDates))
    throw new Error('Invalid lease findings');
  return {
    summary: v.summary,
    overallRating: v.overallRating,
    redFlags: v.redFlags.map((flag: any) => {
      const f = object(flag);
      if (!['high', 'medium', 'low'].includes(f.severity)) throw new Error('Invalid severity');
      return { title: text(f.title), description: text(f.description), severity: f.severity };
    }),
    keyTerms: terms(v.keyTerms),
    financialSummary: terms(v.financialSummary),
    importantDates: v.importantDates.map((d: any) => ({
      date: text(object(d).date),
      description: text(d.description),
    })),
    tenantRights: strings(v.tenantRights),
    landlordObligations: strings(v.landlordObligations),
    terminationClauses: strings(v.terminationClauses),
    recommendations: strings(v.recommendations),
  };
}
export function validateFloorPlan(value: any) {
  const v = object(value),
    layout = object(v.layout);
  if (
    !text(v.summary).trim() ||
    ![null, 'Excellent', 'Good', 'Fair', 'Poor'].includes(v.spaceEfficiency)
  )
    throw new Error('Invalid floor plan summary');
  return {
    summary: v.summary,
    spaceEfficiency: v.spaceEfficiency,
    layout: {
      bedrooms: numberOrNull(layout.bedrooms),
      bathrooms: numberOrNull(layout.bathrooms),
      totalRooms: numberOrNull(layout.totalRooms),
      estimatedSquareFeet: numberOrNull(layout.estimatedSquareFeet) ?? undefined,
    },
    features: strings(v.features),
    pros: strings(v.pros),
    cons: strings(v.cons),
    recommendations: strings(v.recommendations),
  };
}
