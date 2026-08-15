import { appOrigin } from '../../../core/app-origin';

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'pinterest' | 'x' | 'unknown';

export interface VideoInfo {
  thumb: string | null;
  title: string | null;
  author: string | null;
  desc: string | null;
}

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

/**
 * Shared text is rarely just a URL — TikTok and friends wrap it in a caption
 * ("Mira este vídeo … https://vm.tiktok.com/xxx"), so pull the first link out.
 */
export function extractUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : '';
}

/** The leftover text once URLs and hashtags are stripped, usable as an exercise name. */
export function extractCaption(text: string): string {
  if (!text.trim()) return '';
  const clean = text.replace(/https?:\/\/[^\s]+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > 60 ? clean.slice(0, 57) + '...' : clean;
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

async function proxyOEmbed(provider: string, url: string): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(`${appOrigin()}/api/oembed?provider=${provider}&url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const platform = detectPlatform(url);
  if (platform === 'unknown' || platform === 'x') return { thumb: null, title: null, author: null, desc: null };

  const data = await proxyOEmbed(platform, url);
  if (!data) return { thumb: getThumbnailUrl(url), title: null, author: null, desc: null };

  return {
    thumb: data['thumbnail_url'] ?? getThumbnailUrl(url) ?? null,
    title: data['title'] ?? null,
    author: data['author_name'] ?? null,
    desc: data['description'] ?? null,
  };
}

/**
 * A name for the exercise, not the whole caption. Instagram titles are the full post text —
 * several paragraphs — and only the first line reads like a heading.
 */
export async function fetchVideoTitle(url: string): Promise<string | null> {
  return toExerciseName((await fetchVideoInfo(url)).title);
}

export function toExerciseName(title: string | null): string | null {
  const firstLine = (title ?? '').split('\n').map(l => l.trim()).find(Boolean);
  if (!firstLine) return null;
  return firstLine.length > 80 ? firstLine.slice(0, 79).trimEnd() + '…' : firstLine;
}
