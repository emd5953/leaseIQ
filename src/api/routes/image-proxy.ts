import { Router, Request, Response } from 'express';

const router = Router();

// Simple in-memory cache for failed URLs to avoid repeated attempts
const failedUrls = new Set<string>();

/**
 * Image proxy endpoint to bypass hotlinking restrictions
 * GET /api/image-proxy?url=<encoded-image-url>
 */
router.get('/', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Skip known failed URLs
    if (failedUrls.has(decodedUrl)) {
      return res.status(404).json({ error: 'Image not available' });
    }
    
    // Validate URL
    let url: URL;
    try {
      url = new URL(decodedUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    // Build referer based on the source domain
    const referer = url.origin + '/';

    // Fetch the image with headers that mimic a browser
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(decodedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': referer,
        'Origin': url.origin,
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      failedUrls.add(decodedUrl);
      // Clear failed URLs cache periodically (keep last 1000)
      if (failedUrls.size > 1000) {
        const arr = Array.from(failedUrls);
        arr.slice(0, 500).forEach(u => failedUrls.delete(u));
      }
      return res.status(404).json({ error: 'Image not available' });
    }

    // Get content type and forward it
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      failedUrls.add(decodedUrl);
      return res.status(400).json({ error: 'Not an image' });
    }
    
    // Set caching headers (cache for 1 day)
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });

    // Stream the image data
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Image proxy timeout:', imageUrl);
    } else {
      console.error('Image proxy error:', error.message);
    }
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

export default router;
