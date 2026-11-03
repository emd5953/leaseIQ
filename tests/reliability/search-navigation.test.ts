import { describe, expect, it } from 'vitest';
import { searchReturnPath } from '../../frontend/src/lib/search-navigation';

describe('Listing return navigation', () => {
  it('retains filters, sort and pagination in a rental search link', () => {
    const path = '/search?q=Brooklyn&maxPrice=4500&bedrooms=0&sort=price-asc&page=2';
    expect(searchReturnPath(path)).toBe(path);
  });
  it.each([null, 'https://example.com/search', '//example.com/search', '/searching', '/dashboard', 'javascript:alert(1)'])('rejects non-search return destinations: %s', value => {
    expect(searchReturnPath(value)).toBe('/search');
  });
});
