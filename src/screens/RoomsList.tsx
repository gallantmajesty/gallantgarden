import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { occupancy, totalOccupants } from '../lib/realmPresence'
import { STUDY_ROOMS, ROOM_CAP, roomKey, newCustomCode } from '../lib/studyRooms'
import './RoomsList.css'

// The study-room chooser. First shows two options — International and Custom.
// Picking International opens a mind-map list of the public rooms (live N/100
// counts from the real realm_presence table). Picking Custom opens the create/
// join-by-code panel for a private, no-cap room.

type Mode = null | 'international' | 'custom'

export function RoomsList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [code, setCode] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      const entries = await Promise.all(
        STUDY_ROOMS.map(async (r) => [r.id, totalOccupants(await occupancy(roomKey(r.id)))] as const),
      )
      if (alive) setCounts(Object.fromEntries(entries))
    }
    void load()
    const t = window.setInterval(load, 10_000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [])

  const createCustom = () => navigate(`/room/custom-${newCustomCode(Date.now())}`)
  const joinCustom = () => {
    const c = code.trim().toUpperCase()
    if (c) navigate(`/room/custom-${c}`)
  }

  return (
    <div className="rooms">
      <header className="rooms__head">
        <button className="rooms__back sf-btn water" onClick={() => (mode ? setMode(null) : navigate('/'))}>
          ← {mode ? t('roomsList.options') : t('common.lobby')}
        </button>
        <div className="rooms__title">
          <img src="/icons/rooms/fairy.png" alt="" className="rooms__logo" />
          <div>
            <h1>{t('roomsList.studyRooms')}</h1>
            <p>t('roomsList.studyOnCamera')</p>
          </div>
        </div>
      </header>

      {/* flagship rail realm — separate from the classic Train Station */}
      {mode === null && (
        <button
          className="rooms__choice rooms__choice--trainx"
          onClick={() => navigate('/trainx')}
          style={{
            width: '100%',
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 18px',
            borderRadius: 14,
            border: '1px solid rgba(202,168,74,0.5)',
            background: 'linear-gradient(135deg, #1a2238, #0e1426)',
            color: '#ffe6c0',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: 26 }}>🚂</span>
          <span style={{ textAlign: 'left' }}>
            <b>TrainX — Booking Center &amp; Study Express</b>
            <br />
            <small style={{ color: '#9fb0d0', fontWeight: 400 }}>
              Book a carriage, ride to your destination, study on the way. (New realm)
            </small>
          </span>
          <span style={{ marginLeft: 'auto' }}>→</span>
        </button>
      )}

      {/* step 1 — pick International or Custom */}
      {mode === null && (
        <div className="rooms__choose">
          <button className="rooms__choice rooms__choice--intl" onClick={() => setMode('international')}>
            <span className="rooms__choice-emoji"><img src="/icons/rooms/globe.png" alt="" /></span>
            <span className="rooms__choice-body">
              <b>{t('roomsList.international')}</b>
              <small>t('roomsList.intlDescription')</small>
            </span>
            <span className="rooms__choice-go">→</span>
          </button>
          <button className="rooms__choice rooms__choice--custom" onClick={() => setMode('custom')}>
            <span className="rooms__choice-emoji"><img src="/icons/rooms/scroll.png" alt="" /></span>
            <span className="rooms__choice-body">
              <b>{t('roomsList.custom')}</b>
              <small>t('roomsList.customDescription')</small>
            </span>
            <span className="rooms__choice-go">→</span>
          </button>
        </div>
      )}

      {/* step 2a — International rooms as a mind-map list */}
      {mode === 'international' && (
        <div className="mindmap">
          <div className="mindmap__root"><img src="/icons/rooms/globe.png" alt="" /> t('roomsList.internationalRooms')</div>
          <div className="mindmap__branches">
            {STUDY_ROOMS.map((r) => {
              const n = counts[r.id] ?? 0
              const full = n >= ROOM_CAP
              return (
                <div key={r.id} className="room-row" style={{ ['--rc' as string]: r.accent }}>
                  <div className="room-row__emoji">{r.emoji}</div>
                  <div className="room-row__body">
                    <div className="room-row__name">{r.name}</div>
                    <div className="room-row__blurb">{r.blurb}</div>
                  </div>
                  <div className="room-row__count">
                    <i className="live" /> {n}/{ROOM_CAP} t('roomsList.studying')
                  </div>
                  <button className="sf-btn room-row__join" disabled={full} onClick={() => navigate(`/room/${r.id}`)}>
                    {full ? t('roomsList.full') : t('roomsList.join')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* step 2b — Custom create / join */}
      {mode === 'custom' && (
        <div className="rooms__custom">
          <div className="rooms__custom-emoji"><img src="/icons/rooms/scroll.png" alt="" /></div>
          <h2>{t('roomsList.customRoom')}</h2>
          <p>Create your own private room with no student cap, then share the code with friends. Or join one you’ve been invited to.</p>
          <div className="rooms__custom-actions">
            <button className="sf-btn rooms__custom-create" onClick={createCustom}>＋ Create a room</button>
            <div className="rooms__custom-or">or</div>
            <div className="rooms__custom-join">
              <input
                className="sf-input"
                placeholder={t('roomsList.enterCode')}
                value={code}
                maxLength={8}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && joinCustom()}
              />
              <button className="sf-btn secondary" onClick={joinCustom} disabled={!code.trim()}>Join</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
