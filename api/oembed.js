const ENDPOINTS = {
  pinterest: (url) => `https://www.pinterest.com/oembed.json?url=${url}`,
  tiktok:    (url) => `https://www.tiktok.com/oembed?url=${url}`,
  instagram: (url) => `https://www.instagram.com/oembed/?url=${url}`,
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { url, provider } = req.query;
  if (!url || !provider || !ENDPOINTS[provider]) {
    return res.status(400).end();
  }

  try {
    const upstream = await fetch(ENDPOINTS[provider](encodeURIComponent(url)));
    if (!upstream.ok) return res.status(upstream.status).end();
    const data = await upstream.json();
    res.status(200).json(data);
  } catch {
    res.status(500).end();
  }
};
