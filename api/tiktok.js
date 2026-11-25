export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ code: -1, msg: 'Method not allowed. Use GET.' });
  }

  const videoUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  if (!videoUrl) {
    return res.status(400).json({ code: -1, msg: 'Parameter url is required.' });
  }

  let parsed;
  try {
    parsed = new URL(videoUrl);
  } catch {
    return res.status(400).json({ code: -1, msg: 'Invalid URL.' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ code: -1, msg: 'Only HTTP/HTTPS URLs are allowed.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const upstream = await fetch(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`,
      {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TikTokAPIProxy/1.0)' },
        signal: controller.signal
      }
    );

    const body = await upstream.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return res.status(502).json({ code: -1, msg: 'meki returned a non-JSON response.' });
    }

    // Branding fields are placed first at the top level of the JSON response.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      data = {
        author_by: '@mekinjir',
        tiktok: '@mekinjir',
        ...data
      };
    }

    return res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (error) {
    const isTimeout = error && error.name === 'AbortError';
    return res.status(isTimeout ? 504 : 502).json({
      code: -1,
      msg: isTimeout ? 'meki request timed out.' : 'Failed to reach meki API.'
    });
  } finally {
    clearTimeout(timeout);
  }
}
