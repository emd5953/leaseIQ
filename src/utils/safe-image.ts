import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';

export class DownloadError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function isPublicAddress(address: string): boolean {
  try {
    const ip = ipaddr.parse(address);
    if (ip.range() !== 'unicast') return false;
    if (ip.kind() === 'ipv6')
      return (
        ip.match(ipaddr.parseCIDR('2000::/3')) &&
        !['2001::/23', '2001:db8::/32', '2002::/16', '3fff::/20'].some((cidr) =>
          ip.match(ipaddr.parseCIDR(cidr)),
        )
      );
    return true;
  } catch {
    return false;
  }
}

export async function publicDestination(raw: string, resolver = lookup) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DownloadError('Invalid image URL');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port))
  ) {
    throw new DownloadError('Only public HTTP(S) image URLs on standard ports are supported');
  }
  const addresses = ipaddr.isValid(host)
    ? [{ address: host, family: ipaddr.parse(host).kind() === 'ipv4' ? 4 : 6 }]
    : await resolver(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new DownloadError('Internal and reserved destinations are not allowed');
  return { url, address: addresses[0] };
}

export function imageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (/^GIF8[79]a/.test(buffer.toString('ascii', 0, 6))) return 'image/gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  return null;
}

/** Pin every connection, including redirects. One deadline covers DNS and the full body. */
export async function downloadImage(
  raw: string,
  options: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<{ buffer: Buffer; mimeType: string }> {
  const signal = AbortSignal.timeout(options.timeoutMs ?? 10000);
  const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
  async function visit(
    target: string,
    redirects: number,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const { url, address } = await publicDestination(target);
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const request = (url.protocol === 'https:' ? https : http).get(
        url,
        {
          signal,
          agent: false,
          lookup: ((_hostname: string, opts: any, callback: any) =>
            opts.all
              ? callback(null, [address])
              : callback(null, address.address, address.family)) as any,
          headers: {
            Accept: 'image/png,image/jpeg,image/webp,image/gif',
            'Accept-Encoding': 'identity',
          },
        },
        (response) => {
          const status = response.statusCode ?? 0;
          if ([301, 302, 303, 307, 308].includes(status)) {
            response.destroy();
            if (redirects >= 3 || !response.headers.location)
              return reject(new DownloadError('Too many or invalid redirects'));
            try {
              visit(new URL(response.headers.location, url).toString(), redirects + 1).then(
                resolve,
                reject,
              );
            } catch {
              reject(new DownloadError('Invalid redirect URL'));
            }
            return;
          }
          const mime = response.headers['content-type']?.split(';')[0].trim().toLowerCase();
          if (
            status !== 200 ||
            !mime ||
            !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime) ||
            (response.headers['content-encoding'] &&
              response.headers['content-encoding'] !== 'identity')
          ) {
            response.destroy();
            return reject(new DownloadError('Source did not return a supported image', 502));
          }
          if (Number(response.headers['content-length']) > maxBytes) {
            response.destroy();
            return reject(new DownloadError('Image exceeds size limit', 413));
          }
          let bytes = 0;
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > maxBytes) {
              response.destroy();
              reject(new DownloadError('Image exceeds size limit', 413));
            } else chunks.push(chunk);
          });
          response.on('error', reject);
          response.on('aborted', () =>
            reject(new DownloadError('Image download interrupted', 502)),
          );
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if (imageMime(buffer) !== mime)
              return reject(
                new DownloadError('Image content does not match its content type', 415),
              );
            resolve({ buffer, mimeType: mime });
          });
        },
      );
      request.on('error', reject);
    });
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DownloadError('Image download timed out', 504));
    signal.addEventListener('abort', onAbort, { once: true });
    visit(raw, 0)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}
