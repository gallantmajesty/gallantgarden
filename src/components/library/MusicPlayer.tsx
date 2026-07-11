import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMusic, MUSIC_PRESETS, type WidgetPos } from '../../store/music'
import { getPreset, firstAvailablePreset } from '../../lib/music/presets'
import { getMusic } from '../../lib/music/engine'
import { useHud } from '../../store/hud'
import './MusicPlayer.css'

const MARGIN = 10

const SPOTIFY_KEY = 'sg.spotify.url'
const SPOTIFY_MODE_KEY = 'sg.spotify.mode'

/** Turn a pasted Spotify link (track / album / playlist / episode / show) into the
 *  official embed URL. Returns null for anything that isn't a recognisable
 *  open.spotify.com link, so we never embed garbage. */
function toSpotifyEmbed(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.hostname.includes('open.spotify.com') && u.pathname.startsWith('/embed/')) {
      return raw
    }
    const m = u.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/)
    if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`
    return null
  } catch {
    return null
  }
}

function SpotifyGlyph() {
  return (
    <svg className="mp-spot-glyph" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1db954" />
      <path
        fill="#0b0b0b"
        d="M17.2 9.1c-2.4-0.7-5-0.5-7.1 0.4-0.4 0.2-0.6 0.5-0.5 0.9 0.1 0.4 0.5 0.6 0.9 0.5 1.8-0.8 4-1 6.1-0.4 0.4 0.1 0.8-0.1 0.9-0.5 0.1-0.3-0.1-0.7-0.2-0.9zm-0.9 2.4c-0.2 0.4-0.6 0.5-1 0.3-1.5-0.9-3.7-1.2-5.6-0.6-0.4 0.1-0.8-0.1-0.9-0.5-0.1-0.4 0.1-0.8 0.5-0.9 2.3-0.7 4.9-0.4 6.7 0.7 0.4 0.2 0.5 0.6 0.3 1zm-0.1 2.3c-1.2-0.7-3.1-1-4.7-0.5-0.4 0.1-0.9-0.1-1-0.5-0.1-0.4 0.1-0.9 0.5-1 1.9-0.6 4.1-0.3 5.6 0.6 0.4 0.2 0.5 0.7 0.3 1.1-0.2 0.4-0.6 0.5-0.7 0.3z"
      />
    </svg>
  )
}

export function MusicPlayer() {
  const { t } = useTranslation()
  const hidden = useHud((s) => s.widgetsHidden)
  const perfMode = useHud((s) => s.perfMode)

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
  const resumeFromGesture = useMusic((s) => s.resumeFromGesture)

  const preset = getPreset(presetId) ?? firstAvailablePreset()

  // --- Spotify mode -------------------------------------------------------
  // The player can show local ambient presets OR a real, connected Spotify
  // mini-player (official embed). Spotify playback happens inside Spotify's own
  // iframe — no auth/token needed, works for free & premium accounts.
  const [mode, setMode] = useState<'ambient' | 'spotify'>(() => {
    return localStorage.getItem(SPOTIFY_MODE_KEY) === 'spotify' ? 'spotify' : 'ambient'
  })
  const [spotInput, setSpotInput] = useState(() => localStorage.getItem(SPOTIFY_KEY) ?? '')
  const [spotEmbed, setSpotEmbed] = useState<string>(() => {
    const saved = localStorage.getItem(SPOTIFY_KEY) ?? ''
    return toSpotifyEmbed(saved) ?? ''
  })

  const loadSpotify = useCallback(() => {
    const embed = toSpotifyEmbed(spotInput)
    if (embed) {
      setSpotEmbed(embed)
      localStorage.setItem(SPOTIFY_KEY, spotInput.trim())
    }
  }, [spotInput])

  const switchMode = useCallback(
    (m: 'ambient' | 'spotify') => {
      setMode(m)
      try {
        localStorage.setItem(SPOTIFY_MODE_KEY, m)
      } catch {
        /* ignore */
      }
    },
    [],
  )

  const rootRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!useMusic.getState().playing) return
    const kick = () => {
      resumeFromGesture()
      detach()
    }
    const detach = () => {
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
    }
    window.addEventListener('pointerdown', kick)
    window.addEventListener('keydown', kick)
    return detach
  }, [resumeFromGesture])

  useEffect(() => {
    return () => getMusic().pause()
  }, [])

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
      if ((e.target as HTMLElement).closest('button,input')) return
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

  if (hidden || perfMode) return null

  const style = pos ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const } : undefined
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div
      ref={rootRef}
      className={`mp ${expanded ? 'mp-expanded' : 'mp-compact'}`}
      style={style}
      data-no-hotkeys
      onPointerDown={stop}
    >
      {expanded ? (
        <>
          <header className="mp-head" onPointerDown={startDrag}>
            <span className="mp-grip" aria-hidden>??</span>
            <span className="mp-head-title">{t('musicPlayer.title')}</span>
            <button className="mp-icon" onClick={() => setExpanded(false)} aria-label={t('musicPlayer.minimize')}>
              ?
            </button>
          </header>

          <div className="mp-tabs">
            <button
              className={`mp-tab ${mode === 'ambient' ? 'on' : ''}`}
              onClick={() => switchMode('ambient')}
            >
              {t('musicPlayer.libMusic', 'Lib Music')}
            </button>
            <button
              className={`mp-tab ${mode === 'spotify' ? 'on' : ''}`}
              onClick={() => switchMode('spotify')}
            >
              <SpotifyGlyph /> {t('musicPlayer.spotify', 'Spotify')}
            </button>
          </div>

          {mode === 'spotify' ? (
            <div className="mp-spotify">
              <p className="mp-spotify-hint">{t('musicPlayer.spotifyHint', 'Paste a Spotify song, album or playlist link and it plays right here — connected straight to Spotify.')}</p>
              <div className="mp-spotify-row">
                <input
                  className="mp-spotify-input"
                  type="text"
                  value={spotInput}
                  placeholder={t('musicPlayer.spotifyPlaceholder', 'https://open.spotify.com/playlist/...')}
                  onChange={(e) => setSpotInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadSpotify()
                  }}
                  aria-label={t('musicPlayer.spotifyLink', 'Spotify link')}
                />
                <button className="mp-spotify-load" onClick={loadSpotify}>
                  {t('musicPlayer.load', 'Load')}
                </button>
              </div>
              {spotEmbed ? (
                <iframe
                  className="mp-spotify-frame"
                  title="Spotify"
                  src={spotEmbed}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              ) : (
                <div className="mp-spotify-empty">{t('musicPlayer.spotifyEmpty', 'No track loaded yet — paste a Spotify link above.')}</div>
              )}
            </div>
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
                <button className="mp-icon" onClick={prev} aria-label={t('musicPlayer.previous')}>?</button>
                <button className="mp-play" onClick={toggle} aria-label={playing ? t('common.pause') : t('common.play')}>
                  {playing ? '??' : '?'}
                </button>
                <button className="mp-icon" onClick={next} aria-label={t('musicPlayer.next')}>?</button>
              </div>

              <div className="mp-vol">
                <span className="mp-vol-ico" aria-hidden>??</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label={t('musicPlayer.volume')}
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
                        {!p.available && <span className="mp-soon">{t('musicPlayer.soon')}</span>}
                        {active && p.available && <span className="mp-row-eq" aria-hidden>?</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </>
      ) : (
        <div className="mp-bar" onPointerDown={startDrag}>
          {mode === 'spotify' ? (
            <>
              <SpotifyGlyph />
              <span className="mp-bar-name">Spotify</span>
              <button
                className="mp-icon"
                onClick={() => setExpanded(true)}
                aria-label={t('musicPlayer.expand')}
              >
                ?
              </button>
            </>
          ) : (
            <>
              <span
                className="mp-bar-glyph"
                style={{ backgroundImage: `linear-gradient(135deg, ${preset.tint[0]}, ${preset.tint[1]})` }}
                aria-hidden
              >
                {preset.glyph}
              </span>
              <span className="mp-bar-name" title={preset.name}>{preset.name}</span>
              <button className="mp-play sm" onClick={toggle} aria-label={playing ? t('common.pause') : t('common.play')}>
                {playing ? '??' : '?'}
              </button>
              <button className="mp-icon" onClick={() => setExpanded(true)} aria-label={t('musicPlayer.expand')}>
                ?
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
