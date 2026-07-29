import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMusic, MUSIC_PRESETS, type WidgetPos } from '../../store/music'
import { getPreset, firstAvailablePreset } from '../../lib/music/presets'
import { getMusic } from '../../lib/music/engine'
import {
  isSpotifyConfigured,
  isSpotifyLoggedIn,
  loginWithSpotify,
  handleSpotifyCallback,
  logoutSpotify,
} from '../../lib/music/spotifyAuth'
import {
  getPlayback,
  play as spPlay,
  pause as spPause,
  next as spNext,
  previous as spPrev,
  setVolume as spVolume,
  seek as spSeek,
  type SpotifyPlayback,
} from '../../lib/music/spotifyApi'
import './MusicPlayer.css'

const MARGIN = 10

function SpotifyGlyph() {
  return (
    <svg className="mp-spot-glyph" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1db954" />
      <path fill="#0b0b0b" d="M17.2 9.1c-2.4-0.7-5-0.5-7.1 0.4-0.4 0.2-0.6 0.5-0.5 0.9 0.1 0.4 0.5 0.6 0.9 0.5 1.8-0.8 4-1 6.1-0.4 0.4 0.1 0.8-0.1 0.9-0.5 0.1-0.3-0.1-0.7-0.2-0.9zm-0.9 2.4c-0.2 0.4-0.6 0.5-1 0.3-1.5-0.9-3.7-1.2-5.6-0.6-0.4 0.1-0.8-0.1-0.9-0.5-0.1-0.4 0.1-0.8 0.5-0.9 2.3-0.7 4.9-0.4 6.7 0.7 0.4 0.2 0.5 0.6 0.3 1zm-0.1 2.3c-1.2-0.7-3.1-1-4.7-0.5-0.4 0.1-0.9-0.1-1-0.5-0.1-0.4 0.1-0.9 0.5-1 1.9-0.6 4.1-0.3 5.6 0.6 0.4 0.2 0.5 0.7 0.3 1.1-0.2 0.4-0.6 0.5-0.7 0.3z" />
    </svg>
  )
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ─── Spotify mini player (runs its own polling loop) ────────────────────────
function SpotifyPlayer({ onSwitchLocal }: { onSwitchLocal: () => void }) {
  const [pb, setPb] = useState<SpotifyPlayback | null>(null)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  // Handle OAuth callback on mount
  useEffect(() => {
    handleSpotifyCallback().then((ok) => {
      if (ok) setLoading(true) // re-fetch
    })
  }, [])

  // Poll playback state
  useEffect(() => {
    let active = true
    const poll = async () => {
      const data = await getPlayback()
      if (active) {
        setPb(data)
        setLoading(false)
      }
    }
    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { active = false; clearInterval(pollRef.current) }
  }, [])

  const toggle = useCallback(async () => {
    if (pb?.is_playing) { await spPause() } else { await spPlay() }
    setPb((p) => p ? { ...p, is_playing: !p.is_playing } : p)
  }, [pb])

  const handleNext = useCallback(async () => { await spNext(); setTimeout(() => getPlayback().then(setPb), 500) }, [])
  const handlePrev = useCallback(async () => { await spPrev(); setTimeout(() => getPlayback().then(setPb), 500) }, [])
  const handleSeek = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ms = Number(e.target.value)
    await spSeek(ms)
    setPb((p) => p ? { ...p, progress_ms: ms } : p)
  }, [])

  if (!isSpotifyConfigured()) {
    return (
      <div className="mp-spot-setup">
        <SpotifyGlyph />
        <p>Spotify is not configured.</p>
        <p className="mp-spot-sub">Add <code>VITE_SPOTIFY_CLIENT_ID</code> to your .env.local</p>
        <button className="mp-spot-btn" onClick={onSwitchLocal}>Use Local Music</button>
      </div>
    )
  }

  if (!isSpotifyLoggedIn()) {
    return (
      <div className="mp-spot-connect">
        <div className="mp-spot-hero">
          <SpotifyGlyph />
          <span>Connect your Spotify account to control playback from the library.</span>
        </div>
        <button className="mp-spot-btn green" onClick={() => loginWithSpotify()}>
          Login with Spotify
        </button>
        <button className="mp-spot-btn sub" onClick={onSwitchLocal}>Use Local Music Instead</button>
      </div>
    )
  }

  const track = pb?.item
  const img = track?.album.images.find((i) => i.width <= 300) ?? track?.album.images[0]
  const progress = pb?.progress_ms ?? 0
  const duration = track?.duration_ms ?? 1
  const artists = track?.artists.map((a) => a.name).join(', ') ?? ''

  // No active device
  if (!loading && !pb?.device) {
    return (
      <div className="mp-spot-connect">
        <div className="mp-spot-hero">
          <SpotifyGlyph />
          <span>Open Spotify on your phone or computer first, then come back here to control it.</span>
        </div>
        <button className="mp-spot-btn" onClick={() => getPlayback().then(setPb)}>Refresh</button>
        <button className="mp-spot-btn sub" onClick={() => { logoutSpotify(); onSwitchLocal() }}>Disconnect</button>
      </div>
    )
  }

  return (
    <div className="mp-spot-active">
      {/* Album art + track info */}
      <div className="mp-spot-now">
        {img ? (
          <img className="mp-spot-art" src={img.url} alt={track?.name ?? ''} />
        ) : (
          <div className="mp-spot-art mp-spot-art-placeholder"><SpotifyGlyph /></div>
        )}
        <div className="mp-spot-info">
          <span className="mp-spot-track">{track?.name ?? 'Nothing playing'}</span>
          <span className="mp-spot-artist">{artists}</span>
          <span className="mp-spot-device">{pb?.device?.name ?? ''}</span>
        </div>
      </div>

      {/* Progress bar */}
      {track && (
        <div className="mp-spot-progress">
          <span className="mp-spot-time">{fmt(progress)}</span>
          <input
            className="mp-spot-bar"
            type="range"
            min={0}
            max={duration}
            value={progress}
            onChange={handleSeek}
          />
          <span className="mp-spot-time">{fmt(duration)}</span>
        </div>
      )}

      {/* Transport */}
      <div className="mp-spot-controls">
        <button className="mp-spot-ctrl" onClick={handlePrev} aria-label="Previous">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M4 3.5v11a.5.5 0 00.77.42L12 9.5a.5.5 0 000-.84L4.77 3.08A.5.5 0 004 3.5z"/><rect x="13" y="3.5" width="2.5" height="11" rx="1"/></svg>
        </button>
        <button className="mp-spot-play" onClick={toggle} aria-label={pb?.is_playing ? 'Pause' : 'Play'}>
          {pb?.is_playing ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor"><rect x="4" y="3" width="5" height="16" rx="1.5"/><rect x="13" y="3" width="5" height="16" rx="1.5"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor"><path d="M5 2.5v17a1 1 0 001.54.84L17 12a1 1 0 000-1.68L6.54 1.66A1 1 0 005 2.5z"/></svg>
          )}
        </button>
        <button className="mp-spot-ctrl" onClick={handleNext} aria-label="Next">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M14 3.5v11a.5.5 0 01-.77.42L6 9.5a.5.5 0 010-.84l7.23-5.58A.5.5 0 0114 3.5z"/><rect x="2.5" y="3.5" width="2.5" height="11" rx="1"/></svg>
        </button>
      </div>

      {/* Footer actions */}
      <div className="mp-spot-footer">
        <button className="mp-spot-link" onClick={() => { logoutSpotify(); onSwitchLocal() }}>
          Switch to Local
        </button>
        <span className="mp-spot-vol-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M2 5h2.5L8 2v10L4.5 9H2a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M9.5 4.5a3.5 3.5 0 010 5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </span>
        <input
          className="mp-spot-vol"
          type="range"
          min={0}
          max={100}
          value={pb?.device?.volume_percent ?? 70}
          onChange={(e) => spVolume(Number(e.target.value))}
          aria-label="Volume"
        />
      </div>
    </div>
  )
}

// ─── Main MusicPlayer ───────────────────────────────────────────────────────
export function MusicPlayer() {
  const presetId = useMusic((s) => s.presetId)
  const playing = useMusic((s) => s.playing)
  const expanded = useMusic((s) => s.expanded)
  const volume = useMusic((s) => s.volume)
  const pos = useMusic((s) => s.pos)
  const select = useMusic((s) => s.select)
  const toggle = useMusic((s) => s.toggle)
  const next = useMusic((s) => s.next)
  const prev = useMusic((s) => s.prev)
  const setVolume = useMusic((s) => s.setVolume)
  const setExpanded = useMusic((s) => s.setExpanded)
  const setPos = useMusic((s) => s.setPos)

  const [source, setSource] = useState<'local' | 'spotify'>(() => {
    return (localStorage.getItem('sg.music.source') as 'local' | 'spotify') ?? 'local'
  })

  const switchSource = useCallback((s: 'local' | 'spotify') => {
    setSource(s)
    localStorage.setItem('sg.music.source', s)
  }, [])

  const preset = getPreset(presetId) ?? firstAvailablePreset()

  const rootRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const clamp = useCallback((x: number, y: number): WidgetPos => {
    const el = rootRef.current
    const w = el?.offsetWidth ?? 220
    const h = el?.offsetHeight ?? 60
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
      if ((e.target as HTMLElement).closest('button,input,img')) return
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

  // Handle Spotify OAuth callback
  useEffect(() => {
    if (window.location.search.includes('code=')) {
      handleSpotifyCallback().then((ok) => {
        if (ok) switchSource('spotify')
      })
    }
  }, [switchSource])

  const style = pos ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const } : { left: 16, bottom: 16 }
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  const portal = document.body
  const portalStyle = { ...style, position: 'fixed' as const, zIndex: 9999 }

  // ─── Compact mode ──────────────────────────────────────────────────────
  if (!expanded) {
    if (source === 'spotify') {
      return createPortal(
        <div
          ref={rootRef}
          className="mp mp-compact mp-spotify-compact"
          style={portalStyle}
          data-no-hotkeys
          onPointerDown={stop}
        >
          <div className="mp-bar" onPointerDown={startDrag}>
            <span className="mp-spot-badge">
              <SpotifyGlyph />
            </span>
            <span className="mp-bar-name">Spotify</span>
            <button className="mp-icon" onClick={() => setExpanded(true)} aria-label="Expand">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg>
            </button>
          </div>
        </div>,
        portal,
      )
    }

    return createPortal(
      <div
        ref={rootRef}
        className={`mp mp-compact`}
        style={portalStyle}
        data-no-hotkeys
        onPointerDown={stop}
      >
        <div className="mp-bar" onPointerDown={startDrag}>
          <span
            className="mp-bar-glyph"
            style={{ backgroundImage: `linear-gradient(135deg, ${preset.tint[0]}, ${preset.tint[1]})` }}
            aria-hidden
          >
            {preset.glyph}
          </span>
          <span className="mp-bar-name" title={preset.name}>{preset.name}</span>
          <button className="mp-play sm" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="1" width="3" height="10" rx="1"/><rect x="7" y="1" width="3" height="10" rx="1"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2.5 1.2v9.6a.5.5 0 00.77.42l7.8-4.8a.5.5 0 000-.84L3.2.78A.5.5 0 002.5 1.2z"/></svg>
            )}
          </button>
          <button className="mp-icon" onClick={() => setExpanded(true)} aria-label="Expand">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg>
          </button>
        </div>
      </div>,
      portal,
    )
  }

  // ─── Expanded mode ─────────────────────────────────────────────────────
  return createPortal(
    <div
      ref={rootRef}
      className="mp mp-expanded"
      style={{ ...style, position: 'fixed' as const, zIndex: 9999 }}
      data-no-hotkeys
      onPointerDown={stop}
    >
      <header className="mp-head" onPointerDown={startDrag}>
        <span className="mp-grip" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.5"><circle cx="3" cy="2" r="1.2"/><circle cx="9" cy="2" r="1.2"/><circle cx="3" cy="6" r="1.2"/><circle cx="9" cy="6" r="1.2"/><circle cx="3" cy="10" r="1.2"/><circle cx="9" cy="10" r="1.2"/></svg>
        </span>
        <span className="mp-head-title">Music</span>
        <button className="mp-icon" onClick={() => setExpanded(false)} aria-label="Minimize">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l6 6M10 4l-6 6" /></svg>
        </button>
      </header>

      {/* Source tabs */}
      <div className="mp-tabs">
        <button className={`mp-tab ${source === 'local' ? 'on' : ''}`} onClick={() => switchSource('local')}>
          Lib Music
        </button>
        <button className={`mp-tab ${source === 'spotify' ? 'on' : ''}`} onClick={() => switchSource('spotify')}>
          <SpotifyGlyph /> Spotify
        </button>
      </div>

      {source === 'spotify' ? (
        <SpotifyPlayer onSwitchLocal={() => switchSource('local')} />
      ) : (
        <>
          <div
            className="mp-art"
            style={{ backgroundImage: `linear-gradient(135deg, ${preset.tint[0]}, ${preset.tint[1]})` }}
          >
            <span className="mp-art-glyph" aria-hidden>{preset.glyph}</span>
          </div>

          <div className="mp-now">
            <span className="mp-title">{preset.name}</span>
            <span className="mp-sub">{preset.subtitle}</span>
          </div>

          <div className="mp-transport">
            <button className="mp-icon" onClick={prev} aria-label="Previous">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2.5v9a.5.5 0 00.77.42L10.5 7.5a.5.5 0 000-.84L3.77 2.08A.5.5 0 003 2.5z"/><rect x="11" y="2.5" width="2" height="9" rx="1"/></svg>
            </button>
            <button className="mp-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1.2"/><rect x="9" y="2" width="4" height="12" rx="1.2"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 1.5v13a.7.7 0 001.08.58L13.2 8.5a.7.7 0 000-1.16L4.58.92A.7.7 0 003.5 1.5z"/></svg>
              )}
            </button>
            <button className="mp-icon" onClick={next} aria-label="Next">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M11 2.5v9a.5.5 0 01-.77.42L3.5 7.5a.5.5 0 010-.84l6.73-4.58A.5.5 0 0111 2.5z"/><rect x="1" y="2.5" width="2" height="9" rx="1"/></svg>
            </button>
          </div>

          <div className="mp-vol">
            <span className="mp-vol-ico" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M2 5h2.5L8 2v10L4.5 9H2a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M9.5 4.5a3.5 3.5 0 010 5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </span>
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

          <ul className="mp-list">
            {MUSIC_PRESETS.map((p) => {
              const active = p.id === preset.id
              return (
                <li key={p.id}>
                  <button
                    className={`mp-row ${active ? 'active' : ''}`}
                    onClick={() => select(p.id)}
                    disabled={!p.available}
                    aria-current={active}
                  >
                    <span className="mp-row-glyph" aria-hidden>{p.glyph}</span>
                    <span className="mp-row-name">{p.name}</span>
                    {!p.available && <span className="mp-soon">Soon</span>}
                    {active && p.available && <span className="mp-row-eq" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="5" width="2.5" height="5" rx="1"/><rect x="5.5" y="2" width="2.5" height="10" rx="1"/><rect x="10" y="4" width="2.5" height="7" rx="1"/></svg>
                    </span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>,
    document.body,
  )
}
