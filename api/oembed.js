const INSTAGRAM_TOKEN = process.env.INSTAGRAM_TOKEN;

const ENDPOINTS = {
  youtube:   (url) => `https://www.youtube.com/oembed?url=${url}&format=json`,
  pinterest: (url) => `https://www.pinterest.com/oembed.json?url=${url}`,
  tiktok:    (url) => `https://www.tiktok.com/oembed?url=${url}`,
  instagram: (url) => INSTAGRAM_TOKEN
    ? `https://graph.facebook.com/v18.0/instagram_oembed?url=${url}&access_token=${INSTAGRAM_TOKEN}&fields=thumbnail_url,title,author_name`
    : `https://www.instagram.com/oembed/?url=${url}`,
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

function extractOg(html, prop) {
  const m = html.match(new RegExp(`property=["']${prop}["'][^>]+content=["']([^"']+)["']`)) ||
            html.match(new RegExp(`content=["']([^"']+)["'][^>]+property=["']${prop}["']`));
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

// Instagram's og:description is a stats blurb rather than the caption:
//   `12K likes, 340 comments - user on January 5, 2024: "the actual caption"`
//   `686M Followers, 274 Following, 8,557 Posts - See Instagram photos and videos from X`
// Graph's instagram_oembed exposes no description field at all, so this is the only source —
// keep the quoted caption when there is one and drop the blurb when there is not.
function captionFromInstagramOg(desc) {
  if (!desc) return null;

  const quoted = desc.match(/:\s*["“](.+)["”]\.?\s*$/s);
  if (quoted) return quoted[1].trim() || null;

  const stats = /^[\d.,\s]+[KMB]?\s*(likes?|me gusta|curtidas|mi piace|j'aime|followers|seguidores|seguidores?)/i;
  if (stats.test(desc.trim())) return null;
  if (/See Instagram photos and videos/i.test(desc)) return null;

  return desc.trim() || null;
}

async function scrapeOgData(url) {
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
    return {
      thumbnail_url: extractOg(html, 'og:image'),
      title: extractOg(html, 'og:title'),
      description: extractOg(html, 'og:description'),
    };
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

  const needsOg = provider === 'instagram' || provider === 'pinterest' || provider === 'tiktok';

  try {
    const [upstream, og] = await Promise.all([
      fetch(ENDPOINTS[provider](encodeURIComponent(url))),
      needsOg ? scrapeOgData(url) : Promise.resolve(null),
    ]);

    if (og && provider === 'instagram') og.description = captionFromInstagramOg(og.description);

    if (!upstream.ok) {
      if (needsOg && og?.thumbnail_url) return res.status(200).json(og);
      return res.status(upstream.status).end();
    }

    const data = await upstream.json();
    if (og?.description && !data.description) data.description = og.description;
    if (og?.thumbnail_url && !data.thumbnail_url) data.thumbnail_url = og.thumbnail_url;
    res.status(200).json(data);
  } catch {
    res.status(500).end();
  }
};

module.exports.captionFromInstagramOg = captionFromInstagramOg;
