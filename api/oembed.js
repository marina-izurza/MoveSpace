const ENDPOINTS = {
  youtube:   (url) => `https://www.youtube.com/oembed?url=${url}&format=json`,
  pinterest: (url) => `https://www.pinterest.com/oembed.json?url=${url}`,
  tiktok:    (url) => `https://www.tiktok.com/oembed?url=${url}`,
  instagram: (url) => `https://www.instagram.com/oembed/?url=${url}`,
};

async function resolveUrl(url) {
  // pin.it short links redirect to the canonical pin URL — follow the redirect server-side
  if (!url.includes('pin.it')) return url;
  try {
    const r = await fetch(url, { redirect: 'follow' });
    return r.url || url;
  } catch {
    return url;
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
    if (!upstream.ok) return res.status(upstream.status).end();
    const data = await upstream.json();
    res.status(200).json(data);
  } catch {
    res.status(500).end();
  }
};
