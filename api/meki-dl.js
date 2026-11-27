import { Readable } from 'node:stream';

const ALLOW = ['tikwm.com', 'tiktokcdn.com', 'tiktokcdn-us.com'];

export default async function handler(req, res) {
  try {
    const u = new URL(req.query.url);
    const ok = u.protocol === 'https:' &&
      ALLOW.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
    if (!ok) return res.status(400).send('URL tidak diizinkan');

    const name = req.query.name === 'audio.mp3' ? 'audio.mp3' : 'video.mp4';
    const r = await fetch(u.href, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TikTokAPIProxy/1.0)' }
    });
    if (!r.ok || !r.body) return res.status(502).send('Gagal ambil media');

    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/octet-stream');
    const len = r.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    Readable.fromWeb(r.body).pipe(res);
  } catch {
    res.status(400).send('Error');
  }
}
