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

const NAMED_ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

/**
 * Meta tags arrive HTML-encoded: accents as `&#xf1;`, quotes as `&quot;`, and every emoji as
 * a numeric reference like `&#x1f48c;`. Only `&amp;` used to be handled, so the raw entities
 * ended up on screen.
 */
function decodeEntities(text) {
  if (!text) return text;
  return String(text)
    .replace(/&#x([0-9a-f]{1,6});/gi, (m, hex) => codePoint(parseInt(hex, 16), m))
    .replace(/&#(\d{1,7});/g, (m, dec) => codePoint(parseInt(dec, 10), m))
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function codePoint(value, original) {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return original;
  try {
    return String.fromCodePoint(value);
  } catch {
    return original;
  }
}

function extractOg(html, prop) {
  const m = html.match(new RegExp(`property=["']${prop}["'][^>]+content=["']([^"']+)["']`)) ||
            html.match(new RegExp(`content=["']([^"']+)["'][^>]+property=["']${prop}["']`));
  return m ? decodeEntities(m[1]) : null;
}

/**
 * Instagram wraps the caption in boilerplate on both meta tags:
 *   og:title       `Marta Peña on Instagram: "MOVILIDAD TREN SUPERIOR …"`
 *   og:description `24K likes, 10 comments - entrenaconmarta on June 10, 2026: "MOVILIDAD …"`
 * Both carry the same caption, so the pair was rendered twice with different noise in front.
 */
function unquoteCaption(text) {
  if (!text) return null;
  const m = text.match(/:\s*["“](.+)["”]\.?\s*$/s);
  return m ? m[1].trim() || null : null;
}

function instagramAuthor(ogTitle) {
  const m = ogTitle && ogTitle.match(/^(.+?)\s+on Instagram\s*[:•]/i);
  return m ? m[1].trim() || null : null;
}

function isStatsBlurb(text) {
  if (!text) return false;
  const stats = /^[\d.,\s]+[kmb]?\s*(likes?|me gusta|curtidas|mi piace|j'aime|followers|seguidores)/i;
  return stats.test(text.trim()) || /See Instagram photos and videos/i.test(text);
}

/** Reduce Instagram's scraped tags to what a reader actually wants: author + caption. */
function normalizeInstagramOg(og) {
  if (!og) return og;

  const caption = unquoteCaption(og.title) || unquoteCaption(og.description);
  const author = instagramAuthor(og.title);

  if (caption) {
    og.title = caption;
    og.description = null; // same caption, wrapped in like/comment counts
  } else {
    if (isStatsBlurb(og.description)) og.description = null;
    if (isStatsBlurb(og.title)) og.title = null;
  }
  if (author) og.author_name = author;

  return og;
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

    if (provider === 'instagram') normalizeInstagramOg(og);

    if (!upstream.ok) {
      if (needsOg && og?.thumbnail_url) return res.status(200).json(og);
      return res.status(upstream.status).end();
    }

    const data = await upstream.json();
    if (og?.description && !data.description) data.description = og.description;
    if (og?.thumbnail_url && !data.thumbnail_url) data.thumbnail_url = og.thumbnail_url;
    if (og?.author_name && !data.author_name) data.author_name = og.author_name;
    res.status(200).json(data);
  } catch {
    res.status(500).end();
  }
};

module.exports.decodeEntities = decodeEntities;
module.exports.normalizeInstagramOg = normalizeInstagramOg;
