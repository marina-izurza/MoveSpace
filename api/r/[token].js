// Serves /r/:token. Shared links are pasted into WhatsApp, Instagram and Telegram, and a
// plain SPA shell gives every routine the same generic preview — so the routine is resolved
// here and its Open Graph tags are injected into the app's index.html before it is returned.
// Real users still get the same SPA and Angular routes to the page as usual.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exllwrslkbdcojufpbcm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_FG--J41NAzG8jkjtdvNrqA_T5erpghq';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function youtubeThumb(url) {
  const patterns = [/[?&]v=([^&]+)/, /youtu\.be\/([^?]+)/, /shorts\/([^?/]+)/, /embed\/([^?/]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://img.youtube.com/vi/${m[1]}/maxresdefault.jpg`;
  }
  return null;
}

function buildTags({ title, description, image, url }) {
  const tags = [
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="MoveSpace">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  ];
  if (image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}">`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}">`);
  }
  return tags.join('\n  ');
}

module.exports = async (req, res) => {
  const { token } = req.query;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `${proto}://${host}`;

  // The SPA shell is the source of truth for the app itself; only the head is rewritten.
  let html;
  try {
    const shell = await fetch(`${origin}/index.html`);
    if (!shell.ok) throw new Error(`shell ${shell.status}`);
    html = await shell.text();
  } catch {
    return res.status(302).setHeader('Location', '/').end();
  }

  let meta = null;
  try {
    const routines = token
      ? await supabase(`routines?share_token=eq.${encodeURIComponent(token)}&is_public=eq.true&select=id,name,emoji`)
      : null;
    const routine = routines && routines[0];

    if (routine) {
      const exercises = await supabase(
        `exercises?routine_id=eq.${routine.id}&select=video_url&order=order.asc`
      ) || [];

      const image = exercises.map(e => youtubeThumb(e.video_url || '')).find(Boolean)
        || `${origin}/icons/icon-512.png`;

      meta = {
        title: `${routine.emoji ? routine.emoji + ' ' : ''}${routine.name}`,
        description: `${exercises.length} ejercicio${exercises.length === 1 ? '' : 's'} · Rutina compartida en MoveSpace`,
        image,
        url: `${origin}/r/${token}`,
      };
    }
  } catch {
    // Fall through to the untouched shell rather than failing the page.
  }

  if (meta) {
    // Drop the generic description so it cannot win over the injected one.
    html = html.replace(/\s*<meta name="description"[^>]*>/i, '');
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)} · MoveSpace</title>`);
    html = html.replace(/<\/head>/i, `  ${buildTags(meta)}\n</head>`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Crawlers re-fetch often; keep it fresh for the owner but cheap at the edge.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
};
