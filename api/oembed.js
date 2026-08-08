const ENDPOINTS = {
  youtube:   (url) => `https://www.youtube.com/oembed?url=${url}&format=json`,
  pinterest: (url) => `https://www.pinterest.com/oembed.json?url=${url}`,
  tiktok:    (url) => `https://www.tiktok.com/oembed?url=${url}`,
  instagram: (url) => `https://www.instagram.com/oembed/?url=${url}`,
};

async function resolveUrl(url) {
  // pin.it short links redirect to the canonical pin URL — follow the redirect server-side
  if (url.includes('pin.it')) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      url = r.url || url;
    } catch {}
  }
  // Localized Pinterest subdomains (es., de., fr., …) rejected by oEmbed — normalize to www
  url = url.replace(/https?:\/\/[a-z]{2}\.pinterest\.com/, 'https://www.pinterest.com');
  return url;
}

async function scrapeOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/) ||
              html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/);
    return m ? m[1].replace(/&amp;/g, '&') : null;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let { url, provider } = req.query;
  if (!url || !provider || !ENDPOINTS[provider]) {
    return res.status(400).end();
  }

  url = await resolveUrl(url);

  try {
    const upstream = await fetch(ENDPOINTS[provider](encodeURIComponent(url)));
    if (!upstream.ok) {
      if (provider === 'instagram') {
        const thumb = await scrapeOgImage(url);
        if (thumb) return res.status(200).json({ thumbnail_url: thumb });
      }
      return res.status(upstream.status).end();
    }
    const data = await upstream.json();
    res.status(200).json(data);
  } catch {
    res.status(500).end();
  }
};
