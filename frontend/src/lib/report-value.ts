// Defensive rendering for reports from older deployments or unexpected provider shapes.
export function reportValue(value: unknown, depth = 0): string {
  if (value == null) return 'Not specified'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (depth >= 6) return 'Complex value; verify in the original document'
  if (Array.isArray(value)) return value.map(item => reportValue(item, depth + 1)).join('; ')
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key.replace(/([a-z])([A-Z])/g, '$1 $2')}: ${reportValue(item, depth + 1)}`).join('; ')
  return 'Not specified'
}
