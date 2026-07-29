export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'pinterest' | 'x' | 'unknown';

export function detectPlatform(url: string): Platform {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'pinterest';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'x';
  return 'unknown';
}

export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    pinterest: 'Pinterest',
    x: 'X',
    unknown: 'video'
  };
  return names[platform];
}

export function getYouTubeVideoId(url: string): string | null {
  const patterns = [/[?&]v=([^&]+)/, /youtu\.be\/([^?]+)/, /shorts\/([^?/]+)/, /embed\/([^?/]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function getThumbnailUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export async function fetchVideoTitle(url: string): Promise<string | null> {
  const platform = detectPlatform(url);
  try {
    if (platform === 'youtube') {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (!res.ok) return null;
      return (await res.json()).title ?? null;
    }
    if (platform === 'tiktok') {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      return (await res.json()).title ?? null;
    }
    if (platform === 'pinterest') {
      const res = await fetch(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      return (await res.json()).title ?? null;
    }
    if (platform === 'instagram') {
      const res = await fetch(`https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      return (await res.json()).title ?? null;
    }
  } catch {}
  return null;
}

export async function fetchPinterestThumbnail(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return (await res.json()).thumbnail_url ?? null;
  } catch {
    return null;
  }
}
