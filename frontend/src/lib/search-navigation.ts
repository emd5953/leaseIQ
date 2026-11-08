/** Only allow a listing's return link to point to our rental search. */
export function searchReturnPath(value: string | null): string {
  return value && /^\/search(?:\?[^#]*)?$/.test(value) ? value : '/search'
}
