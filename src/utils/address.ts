/** Conservative address normalization. Never infer a unit or merge adjacent numbers. */
export function normalizeStreet(value: string): string {
  const words: Record<string, string> = { W: 'WEST', E: 'EAST', N: 'NORTH', S: 'SOUTH', ST: 'STREET', AV: 'AVENUE', AVE: 'AVENUE', RD: 'ROAD', BLVD: 'BOULEVARD', PL: 'PLACE', DR: 'DRIVE' };
  return value.toUpperCase().replace(/\b(\d+)(ST|ND|RD|TH)\b/g, '$1')
    .replace(/[.,]/g, '').replace(/\s+/g, ' ').trim().split(' ').map(w => words[w] || w).join(' ');
}

export function splitUnit(value: string): { street: string; unit: string | null } {
  const match = value.match(/^(.*?)\s*,?\s+(?:APT\.?|APARTMENT|UNIT|SUITE|#)\s*([\w-]+)\s*$/i)
    || value.match(/^(.*?)\s*#\s*([\w-]+)\s*$/);
  return match ? { street: match[1].trim().replace(/,$/, ''), unit: match[2].toUpperCase() } : { street: value.trim(), unit: null };
}

export function normalizeCity(value: string): string {
  const city = value.trim().toUpperCase();
  return ['NEW YORK', 'NEW YORK CITY', 'NYC', 'MANHATTAN'].includes(city) ? 'MANHATTAN' : city;
}

export function unitAddressKey(address: { street: string; unit?: string | null; city?: string | null; state?: string | null }): string | undefined {
  const split = splitUnit(address.street);
  const unit = (address.unit || split.unit || '').replace(/^(APT\.?|UNIT|#)\s*/i, '').trim().toUpperCase();
  if (!unit || !address.city || !address.state) return undefined;
  return [normalizeStreet(split.street), unit, normalizeCity(address.city), address.state.toUpperCase()].join('|');
}
