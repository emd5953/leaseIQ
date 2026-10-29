import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { downloadImage } from '../../src/utils/safe-image';
const png = Buffer.from('89504e470d0a1a0a0000000049454e44', 'hex');
afterEach(() => vi.restoreAllMocks());
function source(
  status = 200,
  headers: Record<string, string> = { 'content-type': 'image/png' },
  body: Buffer | null = png,
) {
  return vi.spyOn(http, 'get').mockImplementation(((_url: any, options: any, callback: any) => {
    const request = new EventEmitter();
    const response = new PassThrough();
    Object.assign(response, { statusCode: status, headers });
    options.signal.addEventListener(
      'abort',
      () => {
        response.destroy();
        request.emit('error', new Error('timeout'));
      },
      { once: true },
    );
    queueMicrotask(() => {
      callback(response);
      if (body) response.end(body);
    });
    return request;
  }) as any);
}
describe('Bounded image downloads with controlled transport', () => {
  it('pins the verified address and validates image bytes', async () => {
    const get = source();
    expect((await downloadImage('http://8.8.8.8/image.png')).buffer).toEqual(png);
    const options = get.mock.calls[0][1] as any;
    const callback = vi.fn();
    options.lookup('changed.example', { all: true }, callback);
    expect(callback).toHaveBeenCalledWith(null, [{ address: '8.8.8.8', family: 4 }]);
    expect(options.agent).toBe(false);
  });
  it('revalidates redirects before making the next connection', async () => {
    const get = source(302, { location: 'http://169.254.169.254/latest/meta-data' });
    await expect(downloadImage('http://8.8.8.8/a')).rejects.toThrow(/Internal/);
    expect(get).toHaveBeenCalledTimes(1);
  });
  it('bounds redirect chains', async () => {
    const get = source(302, { location: '/again' });
    await expect(downloadImage('http://8.8.8.8/a')).rejects.toThrow(/redirects/);
    expect(get).toHaveBeenCalledTimes(4);
  });
  it.each([
    ['image/svg+xml', Buffer.from('<svg/>')],
    ['image/png', Buffer.from('<html>not an image</html>')],
    ['text/html', png],
  ])('rejects unsafe/mismatched content %s', async (mime, body) => {
    source(200, { 'content-type': mime as string }, body as Buffer);
    await expect(downloadImage('http://8.8.8.8/a')).rejects.toThrow();
  });
  it('rejects large announced and chunked bodies', async () => {
    source(200, { 'content-type': 'image/png', 'content-length': '999999' });
    await expect(downloadImage('http://8.8.8.8/a', { maxBytes: 32 })).rejects.toThrow(/size/);
    vi.restoreAllMocks();
    source(200, { 'content-type': 'image/png' }, Buffer.concat([png, Buffer.alloc(500)]));
    await expect(downloadImage('http://8.8.8.8/a', { maxBytes: 32 })).rejects.toThrow(/size/);
  });
  it('keeps the deadline active after headers while the body stalls', async () => {
    source(200, { 'content-type': 'image/png' }, null);
    await expect(downloadImage('http://8.8.8.8/a', { timeoutMs: 25 })).rejects.toThrow(/timed out/);
  });
});
