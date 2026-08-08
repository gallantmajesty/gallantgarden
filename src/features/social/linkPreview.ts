import type { LinkPreview } from '../../lib/types'

// Turns raw pasted URLs into a structured preview card. Focus Lily can't call
// arbitrary third-party sites from the browser (CORS + secrets), so we resolve
// the preview client-side from the URL itself: Instagram / YouTube / Spotify /
// TikTok / X each get a recognizable, branded card, and everything else gets a
// clean link card with a favicon. A server-side unfurl could later replace the
// web branch — the LinkPreview shape stays the same.

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi

export function extractUrls(text: string): string[] {
  return text.match(URL_RE) ?? []
}

interface ProviderMatch {
  provider: string
  title: string
  subtitle: string
  image: string | null
}

function matchProvider(raw: string): ProviderMatch | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const path = url.pathname

  if (host.endsWith('instagram.com')) {
    let kind = 'post'
    if (/\/reel/.test(path)) kind = 'reel'
    else if (/\/tv\//.test(path)) kind = 'video'
    else if (/\/p\//.test(path)) kind = 'post'
    else if (/^\/[^/]+\/?$/.test(path)) kind = 'profile'
    return {
      provider: 'instagram',
      title: kind === 'profile' ? 'Instagram profile' : `Instagram ${kind}`,
      subtitle: `@${host === 'instagram.com' ? (path.replace(/\//g, '') || 'instagram') : path.split('/')[1] ?? 'instagram'}`,
      image: null,
    }
  }

  if (host.endsWith('youtube.com') || host.endsWith('youtu.be')) {
    const id = host.endsWith('youtu.be') ? path.slice(1) : url.searchParams.get('v')
    return {
      provider: 'youtube',
      title: 'YouTube video',
      subtitle: id ? `Watch on YouTube` : 'YouTube',
      image: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
    }
  }

  if (host.endsWith('spotify.com')) {
    const seg = path.split('/').filter(Boolean)
    const kind = seg[0] ?? 'track'
    return {
      provider: 'spotify',
      title: `Spotify ${kind}`,
      subtitle: seg.slice(1).join(' ') || 'Open in Spotify',
      image: null,
    }
  }

  if (host.endsWith('tiktok.com')) {
    return { provider: 'tiktok', title: 'TikTok video', subtitle: 'Watch on TikTok', image: null }
  }

  if (host.endsWith('x.com') || host.endsWith('twitter.com')) {
    return { provider: 'x', title: 'Post on X', subtitle: 'Open in X', image: null }
  }

  if (host.endsWith('github.com')) {
    return { provider: 'github', title: 'GitHub', subtitle: path.replace(/\//g, ' ').trim() || 'Repository', image: null }
  }

  // Generic web link.
  const name = host.split('.')[0]
  return {
    provider: 'web',
    title: titleFromHost(host),
    subtitle: raw.replace(/^https?:\/\//, '').slice(0, 60),
    image: null,
  }
}

function titleFromHost(host: string): string {
  const map: Record<string, string> = {
    'openai.com': 'OpenAI',
    'discord.com': 'Discord',
    'notion.so': 'Notion',
    'figma.com': 'Figma',
    'reddit.com': 'Reddit',
    'wikipedia.org': 'Wikipedia',
    'medium.com': 'Medium',
  }
  return map[host] ?? host.charAt(0).toUpperCase() + host.slice(1)
}

export function buildLinkPreview(raw: string): LinkPreview | null {
  const m = matchProvider(raw)
  if (!m) return null
  try {
    const u = new URL(raw)
    return {
      url: raw,
      provider: m.provider,
      host: u.hostname.replace(/^www\./, ''),
      title: m.title,
      subtitle: m.subtitle,
      image: m.image,
    }
  } catch {
    return null
  }
}

export const PROVIDER_BADGE: Record<string, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: '#E1306C' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  spotify: { label: 'Spotify', color: '#1DB954' },
  tiktok: { label: 'TikTok', color: '#00F2EA' },
  x: { label: 'X', color: '#1d9bf0' },
  github: { label: 'GitHub', color: '#8b949e' },
  web: { label: 'Link', color: '#caa84a' },
}
