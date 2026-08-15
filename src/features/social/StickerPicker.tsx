import { useEffect, useRef, useState } from 'react'

/* Online GIF stickers. Live search + trending come from the Giphy API when a
 * real VITE_GIPHY_KEY is configured. Without one (guests, preview), a curated
 * catalog of GIFs is hotlinked straight from Giphy's media CDN — no key needed,
 * so the sticker shelf always works. */

const API_KEY = (import.meta.env.VITE_GIPHY_KEY as string | undefined) || ''
const ENDPOINT = 'https://api.giphy.com/v1/gifs'

interface GifItem {
  id: string
  url: string
  title: string
}

/* Verified-working Giphy media-CDN ids (HTTP 200, keyless). Grouped loosely by
 * mood so the shelf feels curated, not random. */
const FALLBACK_IDS: string[] = [
  '3o7aD2saalBwwftBIY',
  'l0HlNaQ6gWfllcjDO',
  '26ufdipQqU2lhNA4g',
  '3oEjI6SIIHBdRxXI40',
  'l0MYt5jPR6QX5pnqM',
  '3o7abKhOpu0NwenH3O',
  '11sBLVxNs7v6WA',
  '3oKIPnAiaMCws8nOsE',
  '8vQSQ3cNXuDGo',
  'l0Exk8EUzSLsrErEQ',
  '3o7aCbNPU5wWhqV9oY',
  'l46Cy1rHbQ92uuLXa',
  '3o7abKhOpu0NwenH3O',
]

const fallbackItems = (): GifItem[] =>
  FALLBACK_IDS.map((id, i) => ({
    id: `g-${id}`,
    url: `https://media.giphy.com/media/${id}/giphy.gif`,
    title: 'Sticker',
  }))

function toItem(g: Record<string, unknown>): GifItem | null {
  const img = (g.images as Record<string, { url?: string }> | undefined)?.fixed_height
  if (!img?.url) return null
  return { id: g.id as string, url: img.url, title: (g.title as string) || 'Sticker' }
}

export function StickerPicker({ onPick, onClose }: { onPick: (id: string, url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<GifItem[]>(fallbackItems)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const debounce = useRef<number | null>(null)

  const load = async (query: string) => {
    // Without a real key the API 401s — skip it and use the curated shelf.
    if (!API_KEY) {
      setItems(fallbackItems())
      setErr(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const path = query.trim() ? `${ENDPOINT}/search` : `${ENDPOINT}/trending`
      const params = new URLSearchParams({
        api_key: API_KEY,
        limit: '30',
        rating: 'g',
        ...(query.trim() ? { q: query.trim() } : {}),
      })
      const res = await fetch(`${path}?${params}`)
      if (!res.ok) throw new Error(`Giphy ${res.status}`)
      const json = (await res.json()) as { data?: Array<Record<string, unknown>> }
      const fetched = (json.data ?? []).map(toItem).filter((x): x is GifItem => !!x)
      setItems(fetched.length ? fetched : fallbackItems())
    } catch {
      // API unreachable (offline, bad key) — the curated shelf still works.
      setErr('Live search unavailable — showing curated stickers.')
      setItems(fallbackItems())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearch = (v: string) => {
    setQ(v)
    if (debounce.current) window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => void load(v), 450)
  }

  return (
    <div className="sh-sticker-picker">
      <header className="sh-sticker-head">
        <strong>Stickers</strong>
        <button className="sh-icon" type="button" onClick={onClose} aria-label="Close">×</button>
      </header>
      <input
        className="sh-sticker-search"
        type="text"
        placeholder="Search stickers…"
        value={q}
        onChange={(e) => onSearch(e.target.value)}
        disabled={!API_KEY}
      />
      {err && <p className="sh-sticker-err">{err}</p>}
      {loading && <p className="sh-sticker-loading">Loading…</p>}
      <div className="sh-sticker-grid">
        {items.map((g) => (
          <button
            key={g.id}
            className="sh-sticker-cell"
            type="button"
            title={g.title}
            onClick={() => onPick(g.id, g.url)}
          >
            <img src={g.url} alt={g.title} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}
