import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useMusic, MUSIC_PRESETS, type WidgetPos } from '../../store/music'
import { getPreset, firstAvailablePreset } from '../../lib/music/presets'
import { getMusic } from '../../lib/music/engine'
import { useHud } from '../../store/hud'
import './MusicPlayer.css'

const MARGIN = 10

/**
 * The Library Realm focus-music mini-player. Lives bottom-right, draggable, with
 * a compact chip and an expanded panel. It only renders the controls — actual
 * playback is owned by the app-wide engine (src/lib/music/engine.ts), so hiding
 * this widget (Tab) or leaving the route never stops the music.
 *
 * Mounted once in Explore.tsx for the library realm only (never in study rooms).
 */
export function MusicPlayer() {
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

  const rootRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Resume playback on the first user gesture if it was playing when last saved
  // (browsers block autoplay). Same pattern as src/audio/useAudio.ts.
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

  // Realm-scoped audio: this widget mounts only inside the Library Realm, so its
  // unmount means the user left the realm (to the lobby, Task Magnet, a profile,
  // etc.) — pause playback there. We pause the ENGINE only; the store's `playing`
  // intent is preserved, so returning to the realm resumes on the first gesture
  // (see the resume effect above). Hiding the HUD with Tab does NOT unmount this
  // component, so music keeps playing while you're still in the realm.
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

  // Pull a saved position back into view if it ends up off-screen (e.g. resize,
  // or collapsing the panel near an edge). setPos is a store action, not React
  // local state, so this is a safe effect.
  useLayoutEffect(() => {
    if (!pos) return
    const c = clamp(pos.x, pos.y)
    if (c.x !== pos.x || c.y !== pos.y) setPos(c)
  }, [pos, expanded, clamp, setPos])

  // Imperative drag: move the element directly during the gesture (no React
  // state churn per pointer move), then commit the final position to the store.
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

  // Drop any in-flight drag listeners if the widget unmounts mid-gesture.
  useEffect(() => () => abortRef.current?.abort(), [])

  // The HUD-hide gate (Tab) and Performance Mode hide the chrome — but because
  // playback lives in the singleton engine, the music keeps going regardless.
  if (hidden || perfMode) return null

  const style = pos ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const } : undefined
  // Stop world drag-to-look / hotkeys from firing while interacting with the widget.
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
            <span className="mp-grip" aria-hidden>⋮⋮</span>
            <span className="mp-head-title">Focus Music</span>
            <button className="mp-icon" onClick={() => setExpanded(false)} aria-label="Minimize player">
              ▾
            </button>
          </header>

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
            <button className="mp-icon" onClick={prev} aria-label="Previous preset">◀</button>
            <button className="mp-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button className="mp-icon" onClick={next} aria-label="Next preset">▶</button>
          </div>

          <div className="mp-vol">
            <span className="mp-vol-ico" aria-hidden>🔈</span>
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
                    {!p.available && <span className="mp-soon">soon</span>}
                    {active && p.available && <span className="mp-row-eq" aria-hidden>♪</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
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
            {playing ? '❚❚' : '▶'}
          </button>
          <button className="mp-icon" onClick={() => setExpanded(true)} aria-label="Expand player">
            ▴
          </button>
        </div>
      )}
    </div>
  )
}
