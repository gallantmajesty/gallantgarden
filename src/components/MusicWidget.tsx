import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useMusic, MUSIC_TRACKS, type MusicTrack } from '../lib/music'
import { useChatSettings } from '../features/social/chatSettings'
import './MusicWidget.css'

function MusicGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}
function PlayGlyph() {
  return <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
}
function PauseGlyph() {
  return <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
}
function PrevGlyph() {
  return <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
}
function NextGlyph() {
  return <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
}
function VolumeGlyph() {
  return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
}
function MuteGlyph() {
  return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
}

export function MusicWidget() {
  const {
    ready,
    playing,
    currentId,
    volume,
    muted,
    open,
    setOpen,
    playTrack,
    toggle,
    next,
    prev,
    setVolume,
    setMuted,
  } = useMusic()

  const [expanded, setExpanded] = useState(false)
  const volumeRef = useRef<HTMLInputElement>(null)

  const currentTrack = MUSIC_TRACKS.find((t) => t.id === currentId) ?? MUSIC_TRACKS[0]

  // Sync volume slider when external changes (e.g. settings)
  useEffect(() => {
    if (volumeRef.current && volumeRef.current.value !== String(volume)) {
      volumeRef.current.value = String(volume)
    }
  }, [volume])

  if (!ready) return null

  const handleVolChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(0, Math.min(1, Number(e.target.value)))
    setVolume(v)
  }

  const handleMuteToggle = () => setMuted(!muted)

  const moodEmoji = {
    lofi: '🎧',
    ambient: '🌌',
    piano: '🎹',
    nature: '🌧️',
    jazz: '🎷',
  }

  return (
    <div className={`mw-root ${expanded ? 'expanded' : ''}`}>
      {/* Main bar - always visible when open */}
      <button className="mw-toggle" type="button" onClick={() => setOpen(!open)} aria-label="Toggle music">
        <MusicGlyph />
        <span className="mw-badge">{playing ? '▶' : '⏸'}</span>
      </button>

      {open && (
        <div className="mw-panel" role="region" aria-label="Music player">
          {/* Compact header */}
          <header className="mw-header">
            <div className="mw-now">
              <span className="mw-mood">{moodEmoji[currentTrack.mood] ?? '🎵'}</span>
              <div className="mw-track">
                <strong>{currentTrack.title}</strong>
                <span>{currentTrack.artist}</span>
              </div>
            </div>
            <div className="mw-vol-row">
              <button className="mw-vol-btn" type="button" onClick={handleMuteToggle} aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted ? <MuteGlyph /> : <VolumeGlyph />}
              </button>
              <input
                ref={volumeRef}
                type="range"
                className="mw-vol"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolChange}
                aria-label="Volume"
              />
            </div>
          </header>

          {/* Controls */}
          <div className="mw-controls">
            <button className="mw-btn" type="button" onClick={prev} aria-label="Previous" title="Previous">
              <PrevGlyph />
            </button>
            <button className="mw-btn mw-btn--play" type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'}>
              {playing ? <PauseGlyph /> : <PlayGlyph />}
            </button>
            <button className="mw-btn" type="button" onClick={next} aria-label="Next" title="Next">
              <NextGlyph />
            </button>
          </div>

          {/* Expanded playlist drawer */}
          <button className="mw-expand" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label="Show playlist">
            {expanded ? '▲' : '▼'} Playlist
          </button>

          {expanded && (
            <ul className="mw-list" role="listbox" aria-label="Study playlist">
              {MUSIC_TRACKS.map((t) => (
                <li
                  key={t.id}
                  className={`mw-item ${t.id === currentId ? 'active' : ''}`}
                  role="option"
                  aria-selected={t.id === currentId}
                  onClick={() => playTrack(t.id)}
                >
                  <span className="mw-item-mood">{moodEmoji[t.mood] ?? '🎵'}</span>
                  <div className="mw-item-info">
                    <span className="mw-item-title">{t.title}</span>
                    <span className="mw-item-artist">{t.artist}</span>
                  </div>
                  {t.id === currentId && <span className="mw-item-playing">{playing ? '▶' : '⏸'}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}