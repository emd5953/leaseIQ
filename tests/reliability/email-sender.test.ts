import { afterEach, describe, expect, it, vi } from 'vitest';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send }; } }));
import { EmailService } from '../../src/services/email.service';
import { config } from '../../src/config';
const original = { ...config.resend };
afterEach(() => { Object.assign(config.resend, original); vi.unstubAllEnvs(); vi.resetAllMocks(); });
const message = { to: 'qa@example.com', subject: 'Fictional test', html: '<p>Test</p>' };
describe('Production email sender configuration', () => {
  it.each(['', 'LeaseIQ <onboarding@resend.dev>'])('does not send with a missing or sandbox production sender (%s)', async from => {
    vi.stubEnv('NODE_ENV', 'production'); config.resend.apiKey = 'fake-test-key'; config.resend.from = from;
    expect(await EmailService.send(message)).toMatchObject({ success: false, error: expect.stringContaining('verified production sender') });
    expect(send).not.toHaveBeenCalled();
  });
  it('uses the configured sender and retains the provider receipt', async () => {
    vi.stubEnv('NODE_ENV', 'production'); config.resend.apiKey = 'fake-test-key'; config.resend.from = 'LeaseIQ <alerts@example.com>';
    send.mockResolvedValue({ data: { id: 'receipt-test' } });
    expect(await EmailService.send(message)).toEqual({ success: true, messageId: 'receipt-test' });
    expect(send.mock.calls[0][0].from).toBe(config.resend.from);
  });
  it('explains sandbox rejection without exposing the provider account owner address', async () => {
    vi.stubEnv('NODE_ENV', 'production'); config.resend.apiKey = 'fake-test-key'; config.resend.from = 'LeaseIQ <alerts@example.com>';
    send.mockResolvedValue({ error: { message: 'You can only send testing emails to owner@example.com; verify a domain' } });
    const result = await EmailService.send(message);
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('domain must be verified') });
    expect(result.error).not.toContain('owner@example.com');
  });
});
