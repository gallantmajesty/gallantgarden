import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMusic, RADIO_STATIONS, type WidgetPos } from '../../store/music'
import { getMusic } from '../../lib/music/engine'
import { GENRES, tintFor, imageFor, type LiveTrack, type MusicGenre } from '../../lib/music/catalog'
import './MusicPlayer.css'

const MARGIN = 10

// ---- small inline SVG icons (no emojis, no image assets) --------------------

const I = {
  play: (s: number) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M4 1.7v12.6a.7.7 0 0 0 1.06.6l10-6.3a.7.7 0 0 0 0-1.2l-10-6.3A.7.7 0 0 0 4 1.7z" /></svg>,
  pause: (s: number) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden><rect x="3" y="2" width="4" height="12" rx="1.2" /><rect x="9" y="2" width="4" height="12" rx="1.2" /></svg>,
  prev: (s: number) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M3.5 2.5v11a.5.5 0 0 0 .77.42l9.5-5.5a.5.5 0 0 0 0-.84l-9.5-5.5a.5.5 0 0 0-.77.42z" /><rect x="12" y="2.5" width="1.8" height="11" rx="0.9" /></svg>,
  next: (s: number) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M12.5 2.5v11a.5.5 0 0 1-.77.42l-9.5-5.5a.5.5 0 0 1 0-.84l9.5-5.5a.5.5 0 0 1 .77.42z" /><rect x="2.2" y="2.5" width="1.8" height="11" rx="0.9" /></svg>,
  expand: (s: number) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" /></svg>,
  collapse: (s: number) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><path d="M4 4l6 6M10 4l-6 6" /></svg>,
  search: (s: number) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>,
  vol: (s: number) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M2.5 6h2.5L9 3v10l-4-3H2.5A1.5 1.5 0 0 1 1 8.5v-1A1.5 1.5 0 0 1 2.5 6z" /><path d="M10.5 5.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
  grip: () => <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.45" aria-hidden><circle cx="3" cy="2" r="1.2" /><circle cx="9" cy="2" r="1.2" /><circle cx="3" cy="6" r="1.2" /><circle cx="9" cy="6" r="1.2" /><circle cx="3" cy="10" r="1.2" /><circle cx="9" cy="10" r="1.2" /></svg>,
}

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Deterministic gradient art for tracks without artwork. */
function Art({ track, size }: { track: LiveTrack; size: number }) {
  const img = imageFor(track)
  const [a, b] = tintFor(track)
  if (img) {
    return (
      <img
        className="mp-art-img"
        src={img}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})` }}
      />
    )
  }
  return (
    <div
      className="mp-art-grad"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-hidden
    >
      <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="currentColor" opacity="0.55">
        <path d="M9 18.5V6.8a1 1 0 0 1 .76-.97l8-2A1 1 0 0 1 19 4.8v11.2a2.8 2.8 0 1 1-1.6-2.53V7.4l-6.4 1.6v9.5a2.8 2.8 0 1 1-2-2.5z" />
      </svg>
    </div>
  )
}

/** Now-playing progress polled from the engine. */
function useProgress(playing: boolean) {
  const [p, setP] = useState({ position: 0, duration: 0, src: null as string | null })
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const g = getMusic().getProgress()
      setP((prev) => (prev.src === g.src ? { ...g } : { ...g }))
    }, 500)
    return () => window.clearInterval(id)
  }, [playing])
  return p
}

// ─── Main MusicPlayer ───────────────────────────────────────────────────────
export function MusicPlayer() {
  const current = useMusic((s) => s.current)
  const playing = useMusic((s) => s.playing)
  const expanded = useMusic((s) => s.expanded)
  const volume = useMusic((s) => s.volume)
  const pos = useMusic((s) => s.pos)
  const query = useMusic((s) => s.query)
  const results = useMusic((s) => s.results)
  const browsing = useMusic((s) => s.browsing)
  const search = useMusic((s) => s.search)
  const browseGenre = useMusic((s) => s.browseGenre)
  const playTrack = useMusic((s) => s.playTrack)
  const toggle = useMusic((s) => s.toggle)
  const next = useMusic((s) => s.next)
  const prev = useMusic((s) => s.prev)
  const setVolume = useMusic((s) => s.setVolume)
  const setExpanded = useMusic((s) => s.setExpanded)
  const setPos = useMusic((s) => s.setPos)

  const [searchInput, setSearchInput] = useState(query)
  const [genre, setGenre] = useState<MusicGenre | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const progress = useProgress(playing)

  useEffect(() => { setSearchInput(query) }, [query])

  const clamp = useCallback((x: number, y: number): WidgetPos => {
    const el = rootRef.current
    const w = el?.offsetWidth ?? 340
    const h = el?.offsetHeight ?? 480
    const maxX = window.innerWidth - w - MARGIN
    const maxY = window.innerHeight - h - MARGIN
    return {
      x: Math.max(MARGIN, Math.min(x, maxX)),
      y: Math.max(MARGIN, Math.min(y, maxY)),
    }
  }, [])

  useLayoutEffect(() => {
    if (!pos) return
    const c = clamp(pos.x, pos.y)
    if (c.x !== pos.x || c.y !== pos.y) setPos(c)
  }, [pos, expanded, clamp, setPos])

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button,input,a')) return
      const el = rootRef.current
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      const sx = e.clientX
      const sy = e.clientY
      const bx = rect.left
      const by = rect.top
      let last: WidgetPos = { x: bx, y: by }
      const ac = new AbortController()
      abortRef.current = ac
      const move = (ev: PointerEvent) => {
        last = clamp(bx + (ev.clientX - sx), by + (ev.clientY - sy))
        el.style.left = `${last.x}px`
        el.style.top = `${last.y}px`
        el.style.right = 'auto'
        el.style.bottom = 'auto'
      }
      const finish = () => {
        ac.abort()
        abortRef.current = null
        setPos(last)
      }
      window.addEventListener('pointermove', move, { signal: ac.signal })
      window.addEventListener('pointerup', finish, { signal: ac.signal })
      window.addEventListener('pointercancel', finish, { signal: ac.signal })
    },
    [clamp, setPos],
  )

  useEffect(() => () => abortRef.current?.abort(), [])

  const submitSearch = useCallback((q: string) => {
    setGenre(null)
    void search(q)
  }, [search])

  const pickGenre = useCallback((g: MusicGenre | null) => {
    setGenre(g)
    setSearchInput('')
    void browseGenre(g)
  }, [browseGenre])

  const style = pos ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const } : { left: 16, bottom: 16 }
  const portalStyle = { ...style, position: 'fixed' as const, zIndex: 9999 }
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  const isRadio = current?.kind === 'radio'
  const pct = progress.duration > 0 ? Math.min(1, progress.position / progress.duration) : 0
  const live = playing && isRadio

  // ─── Compact chip ──────────────────────────────────────────────────────
  if (!expanded) {
    return createPortal(
      <div
        ref={rootRef}
        className="mp mp-compact"
        style={portalStyle}
        data-no-hotkeys
        onPointerDown={stop}
      >
        <div className="mp-bar" onPointerDown={startDrag}>
          {current ? (
            <span className="mp-chip-art">
              <Art track={current} size={30} />
            </span>
          ) : (
            <span className="mp-chip-empty">{I.play(14)}</span>
          )}
          <span className="mp-chip-text">
            <span className="mp-chip-title" title={current?.title ?? 'Live Music'}>
              {current?.title ?? 'Live Music'}
            </span>
            <span className="mp-chip-sub" title={current?.artist ?? 'Internet radio & live catalog'}>
              {live ? 'LIVE' : current ? current.artist : 'Internet radio & live catalog'}
            </span>
          </span>
          <button className="mp-play sm" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? I.pause(13) : I.play(13)}
          </button>
          <button className="mp-icon" onClick={() => setExpanded(true)} aria-label="Expand">
            {I.expand(14)}
          </button>
        </div>
      </div>,
      document.body,
    )
  }

  // ─── Expanded panel ────────────────────────────────────────────────────
  return createPortal(
    <div
      ref={rootRef}
      className="mp mp-expanded"
      style={portalStyle}
      data-no-hotkeys
      onPointerDown={stop}
    >
      <header className="mp-head" onPointerDown={startDrag}>
        <span className="mp-grip">{I.grip()}</span>
        <span className="mp-head-title">LIVE MUSIC</span>
        <span className="mp-live-badge"><span className={`mp-live-dot ${live ? 'on' : ''}`} /> LIVE</span>
        <button className="mp-icon" onClick={() => setExpanded(false)} aria-label="Minimize">
          {I.collapse(14)}
        </button>
      </header>

      {/* Now playing */}
      <div className="mp-now">
        <div className="mp-now-art">
          {current ? <Art track={current} size={56} /> : <div className="mp-art-empty" aria-hidden />}
        </div>
        <div className="mp-now-info">
          <span className="mp-now-title" title={current?.title}>{current?.title ?? 'Nothing playing yet'}</span>
          <span className="mp-now-artist" title={current?.artist}>{current?.artist ?? 'Pick a track or a radio station'}</span>
          <span className="mp-now-extra">
            {live
              ? 'Streaming live from the web'
              : current
                ? isRadio
                  ? 'Radio station'
                  : `${fmt(progress.position)} / ${fmt(progress.duration)}`
                : ''}
          </span>
        </div>
        {playing && !isRadio && current && (
          <span className="mp-now-live"><span className="mp-eq"><i /><i /><i /></span></span>
        )}
      </div>

      {/* Progress (tracks only) */}
      {current && !isRadio && (
        <div className="mp-progress">
          <div className="mp-progress-track">
            <div className="mp-progress-fill" style={{ width: `${pct * 100}%` }} />
          </div>
        </div>
      )}

      {/* Transport + volume */}
      <div className="mp-transport">
        <button className="mp-ctrl" onClick={prev} aria-label="Previous">{I.prev(18)}</button>
        <button className="mp-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? I.pause(18) : I.play(18)}
        </button>
        <button className="mp-ctrl" onClick={next} aria-label="Next">{I.next(18)}</button>
        <div className="mp-vol">
          <span className="mp-vol-ico">{I.vol(14)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>
      </div>

      {/* Search + genres */}
      <div className="mp-search">
        <span className="mp-search-ico">{I.search(14)}</span>
        <input
          className="mp-search-input"
          type="text"
          placeholder="Search live music..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(searchInput) }}
          autoComplete="off"
        />
        {searchInput.trim() !== '' && (
          <button className="mp-search-go" onClick={() => submitSearch(searchInput)}>Search</button>
        )}
      </div>
      <div className="mp-genres">
        {GENRES.map((g) => (
          <button
            key={g.id}
            className={`mp-genre ${genre === g.id && query === '' ? 'on' : ''}`}
            onClick={() => pickGenre(genre === g.id ? null : g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mp-scroll">
        <div className="mp-section-label">RADIO</div>
        {RADIO_STATIONS.map((st) => {
          const active = current?.id === st.id
          return (
            <button
              key={st.id}
              className={`mp-row ${active ? 'active' : ''}`}
              onClick={() => playTrack(st)}
            >
              <span className="mp-row-art"><Art track={st} size={28} /></span>
              <span className="mp-row-name">{st.title}</span>
              <span className="mp-row-sub">{st.artist}</span>
              <span className="mp-row-live"><span className="mp-live-dot on" /></span>
              {active && playing && <span className="mp-row-eq"><span className="mp-eq"><i /><i /><i /></span></span>}
            </button>
          )
        })}

        <div className="mp-section-label">TRACKS</div>
        {browsing && results.length === 0 ? (
          <div className="mp-empty">Searching live catalog...</div>
        ) : results.length === 0 ? (
          <div className="mp-empty">
            Search the live catalog or pick a genre above.
            {!import.meta.env.VITE_JAMENDO_CLIENT_ID && (
              <span className="mp-empty-sub">Tip: add VITE_JAMENDO_CLIENT_ID (free at developer.jamendo.com) for the full 2000+ track catalog.</span>
            )}
          </div>
        ) : (
          results.map((t) => {
            const active = current?.id === t.id
            return (
              <button
                key={t.id}
                className={`mp-row ${active ? 'active' : ''}`}
                onClick={() => playTrack(t)}
              >
                <span className="mp-row-art"><Art track={t} size={28} /></span>
                <span className="mp-row-meta">
                  <span className="mp-row-name">{t.title}</span>
                  <span className="mp-row-sub">{t.artist}{t.duration ? ` · ${fmt(t.duration)}` : ''}</span>
                </span>
                {active && playing && <span className="mp-row-eq"><span className="mp-eq"><i /><i /><i /></span></span>}
              </button>
            )
          })
        )}
      </div>
    </div>,
    document.body,
  )
}
