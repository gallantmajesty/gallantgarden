import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMusic, type WidgetPos } from '../../store/music'
import { getMusic } from '../../lib/music/engine'
import { tintFor, imageFor, type LiveTrack } from '../../lib/music/catalog'
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
  low: (s: number) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M2.5 6h2.5L9 3v10l-4-3H2.5A1.5 1.5 0 0 1 1 8.5v-1A1.5 1.5 0 0 1 2.5 6z" /><path d="M10.5 6.4a2.6 2.6 0 0 1 0 3.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
  muted: (s: number) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M2.5 6h2.5L9 3v10l-4-3H2.5A1.5 1.5 0 0 1 1 8.5v-1A1.5 1.5 0 0 1 2.5 6z" /><path d="M11 5.8l3.6 4.4M14.6 5.8L11 10.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
  shuffle: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>,
  repeat: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>,
  repeatOne: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" /></svg>,
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
  const playTrack = useMusic((s) => s.playTrack)
  const toggle = useMusic((s) => s.toggle)
  const next = useMusic((s) => s.next)
  const prev = useMusic((s) => s.prev)
  const setVolume = useMusic((s) => s.setVolume)
  const setExpanded = useMusic((s) => s.setExpanded)
  const setPos = useMusic((s) => s.setPos)
  const shuffle = useMusic((s) => s.shuffle)
  const repeat = useMusic((s) => s.repeat)
  const seekTo = useMusic((s) => s.seekTo)
  const toggleShuffle = useMusic((s) => s.toggleShuffle)
  const cycleRepeat = useMusic((s) => s.cycleRepeat)

  const [searchInput, setSearchInput] = useState(query)
  const rootRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const seekRef = useRef<HTMLDivElement>(null)
  const volRef = useRef<HTMLDivElement>(null)
  /** Seek ratio 0..1 while the user is dragging the timeline (null = idle). */
  const [dragRatio, setDragRatio] = useState<number | null>(null)
  const [volOpen, setVolOpen] = useState(false)
  const [lastVol, setLastVol] = useState(0.7)
  const progress = useProgress(playing)

  // Close the volume popover on outside click / Escape.
  useEffect(() => {
    if (!volOpen) return
    const onDown = (e: PointerEvent) => {
      if (volRef.current && !volRef.current.contains(e.target as Node)) setVolOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVolOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [volOpen])

  const muted = volume <= 0
  const toggleMute = () => {
    if (muted) setVolume(lastVol > 0 ? lastVol : 0.7)
    else {
      setLastVol(volume)
      setVolume(0)
    }
  }

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
    void search(q)
  }, [search])

  // ─── Seekable timeline ────────────────────────────────────────────────
  const seekRatio = (e: React.PointerEvent) => {
    const el = seekRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
  }
  const onSeekDown = (e: React.PointerEvent) => {
    if (progress.duration <= 0) return
    e.stopPropagation()
    setDragRatio(seekRatio(e))
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onSeekMove = (e: React.PointerEvent) => {
    if (dragRatio === null) return
    setDragRatio(seekRatio(e))
  }
  const onSeekUp = (e: React.PointerEvent) => {
    if (dragRatio === null) return
    seekTo(seekRatio(e) * progress.duration)
    setDragRatio(null)
  }

  const style = pos ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const } : { left: 16, bottom: 16 }
  const portalStyle = { ...style, position: 'fixed' as const, zIndex: 9999 }
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  const pct = progress.duration > 0 ? Math.min(1, progress.position / progress.duration) : 0
  // While dragging, show the drag position instead of the live position.
  const displayPct = dragRatio !== null ? dragRatio : pct
  const displayPos = dragRatio !== null ? dragRatio * progress.duration : progress.position

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
            <span className="mp-chip-title" title={current?.title ?? 'Music'}>
              {current?.title ?? 'Music'}
            </span>
            <span className="mp-chip-sub" title={current?.artist ?? 'Curated & local study music'}>
              {current ? current.artist : 'Curated & local study music'}
            </span>
          </span>
          {current && (
            <span className="mp-chip-time" title={progress.duration > 0 ? `${fmt(progress.position)} / ${fmt(progress.duration)}` : fmt(progress.position)}>
              {fmt(progress.position)}{progress.duration > 0 ? ` / ${fmt(progress.duration)}` : ''}
            </span>
          )}
          <button className="mp-play sm" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? I.pause(13) : I.play(13)}
          </button>
          <button className="mp-icon" onClick={() => setExpanded(true)} aria-label="Expand">
            {I.expand(14)}
          </button>
        </div>
        {current && (
          <div className="mp-chip-progress"><div style={{ width: `${displayPct * 100}%` }} /></div>
        )}
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
        <span className="mp-head-title">MUSIC</span>
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
          <span className="mp-now-artist" title={current?.artist}>{current?.artist ?? 'Pick a track from the list'}</span>
          <span className="mp-now-extra">{current ? `${fmt(progress.position)} / ${fmt(progress.duration)}` : ''}</span>
        </div>
        {playing && current && (
          <span className="mp-now-live"><span className="mp-eq"><i /><i /><i /></span></span>
        )}
      </div>

      {/* Seekable timeline */}
      {current && progress.duration > 0 && (
        <div className="mp-progress">
          <div
            ref={seekRef}
            className={`mp-seek ${dragRatio !== null ? 'dragging' : ''}`}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(progress.duration)}
            aria-valuenow={Math.round(displayPos)}
            onPointerDown={onSeekDown}
            onPointerMove={onSeekMove}
            onPointerUp={onSeekUp}
            onPointerCancel={() => setDragRatio(null)}
          >
            <div className="mp-seek-fill" style={{ width: `${displayPct * 100}%` }} />
            <div className="mp-seek-thumb" style={{ left: `${displayPct * 100}%` }} />
          </div>
          <div className="mp-seek-times">
            <span>{fmt(displayPos)}</span>
            <span>{fmt(progress.duration)}</span>
          </div>
        </div>
      )}

      {/* Transport + volume */}
      <div className="mp-transport">
        <button
          className={`mp-ctrl ${shuffle ? 'on' : ''}`}
          onClick={toggleShuffle}
          aria-label={shuffle ? 'Shuffle on' : 'Shuffle'}
          aria-pressed={shuffle}
          title={shuffle ? 'Shuffle: on' : 'Shuffle: off'}
        >
          {I.shuffle(17)}
        </button>
        <button className="mp-ctrl" onClick={prev} aria-label="Previous">{I.prev(18)}</button>
        <button className="mp-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? I.pause(18) : I.play(18)}
        </button>
        <button className="mp-ctrl" onClick={next} aria-label="Next">{I.next(18)}</button>
        <button
          className={`mp-ctrl ${repeat !== 'off' ? 'on' : ''}`}
          onClick={cycleRepeat}
          aria-label={`Repeat: ${repeat}`}
          aria-pressed={repeat !== 'off'}
          title={`Repeat: ${repeat}`}
        >
          {repeat === 'one' ? I.repeatOne(17) : I.repeat(17)}
        </button>
        <div className="mp-vol-wrap" ref={volRef}>
          <button
            className={`mp-ctrl ${volOpen ? 'on' : ''}`}
            onClick={() => setVolOpen((v) => !v)}
            aria-label={muted ? 'Volume: muted' : 'Volume'}
            aria-expanded={volOpen}
            title={muted ? 'Volume: muted' : `Volume: ${Math.round(volume * 100)}%`}
          >
            {muted ? I.muted(16) : volume < 0.5 ? I.low(16) : I.vol(16)}
          </button>
          {volOpen && (
            <div className="mp-vol-pop" role="dialog" aria-label="Volume">
              <button type="button" className="mp-vol-mute" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted ? I.muted(15) : I.vol(15)}
                <span>{muted ? 'Unmute' : 'Mute'}</span>
              </button>
              <div className="mp-vol-slider">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                />
                <span className="mp-vol-pct">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mp-search">
        <span className="mp-search-ico">{I.search(14)}</span>
        <input
          className="mp-search-input"
          type="text"
          placeholder="Search the library..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(searchInput) }}
          autoComplete="off"
        />
        {searchInput.trim() !== '' && (
          <button className="mp-search-go" onClick={() => submitSearch(searchInput)}>Search</button>
        )}
      </div>

      {/* Results */}
      <div className="mp-scroll">
        <div className="mp-section-label">TRACKS</div>
        {browsing && results.length === 0 ? (
          <div className="mp-empty">Searching the catalog...</div>
        ) : results.length === 0 ? (
          <div className="mp-empty">
            No tracks found — try a different search.
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
