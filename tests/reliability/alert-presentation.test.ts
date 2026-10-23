import { describe, expect, it, vi } from 'vitest';
import { EmailService } from '../../src/services/email.service';

describe('Rental alerts preserve uncertainty', () => {
  it('renders unknown, building and weekly rents without inventing no-fee claims or sending email', async () => {
    const send = vi.spyOn(EmailService, 'send').mockResolvedValue({ success: true });
    const base = { address: { street: '<img src=x onerror=alert(1)>', city: 'Brooklyn' }, sources: [{ source: 'streeteasy', sourceUrl: 'https://streeteasy.com/rental/test', lastSeenAt: new Date('2026-01-01') }] };
    try {
      await EmailService.sendListingAlert('test@example.com', [
        { ...base, price: { amount: null, status: 'unknown' } },
        { ...base, listingScope: 'building', price: { status: 'building', amount: null }, buildingRent: { status: 'range', minimum: 2500, maximum: 4000 } },
        { ...base, price: { amount: 800, period: 'weekly' } },
      ], '<script>unsafe</script>');
      const html = send.mock.calls[0][0].html;
      expect(html).toContain('Rent unknown');
      expect(html).toContain('$2,500–$4,000 / month · building range');
      expect(html).toContain('$800 / week');
      expect(html).toContain('Broker fee not reported');
      expect(html).toContain('stale');
      expect(html).toContain('https://streeteasy.com/rental/test');
      expect(html).not.toContain('✓ No Fee');
      expect(html).not.toContain('<img src=x');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('undefined');
    } finally { send.mockRestore(); }
  });
});
