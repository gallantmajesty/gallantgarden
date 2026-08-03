import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { STATUS_COLOR } from '../lib/presence'
import type { StudyStatus } from '../lib/types'
import { getStudyRoom, channelFor, roomKey } from '../lib/studyRooms'
import { rankForLifetime } from '../lib/ranks'
import { joinStudyRoom, leaveStudyRoom, updateMe, useStudyRoom, type StudyPeer } from '../lib/studyRoomNet'
import { startHeartbeat, leavePresence } from '../lib/realmPresence'
import './StudyRoom.css'

export function StudyRoom() {
  const navigate = useNavigate()
  const { id = 'deep-focus' } = useParams()
  const room = useMemo(() => getStudyRoom(id), [id])

  const { user } = useAuth()
  const displayName = useProfile((s) => s.displayName)
  const avatarUrl = useProfile((s) => s.avatarUrl)
  const myRank = useProfile((s) => rankForLifetime(s.rankXp, s.xp, s.premiumXp).id)
  const myCountry = useProfile((s) => s.data.country)
  const myName = displayName && displayName !== 'Explorer' ? displayName.split(' ')[0] : 'You'

  const roster = useStudyRoom((s) => s.roster)
  const peers = useMemo(() => Object.values(roster).sort((a, b) => a.sessionStart - b.sessionStart), [roster])

  const [camOn, setCamOn] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showParticipants, setShowParticipants] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const sessionStart = useRef(Date.now()).current

  useEffect(() => {
    void joinStudyRoom(
      channelFor(id),
      {
        name: myName,
        rank: myRank || 'bronze-1',
        country: myCountry ?? null,
        avatarUrl: avatarUrl ?? null,
        status: 'studying',
        sessionStart,
        camOn: false,
      },
      user?.id,
    )
    const stopBeat = startHeartbeat(roomKey(id), 1)
    return () => {
      stopBeat()
      void leavePresence()
      void leaveStudyRoom()
    }
  }, [id])

  async function startCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCamOn(true)
      updateMe({ camOn: true })
    } catch {
      setToast('Camera blocked')
      setTimeout(() => setToast(null), 3000)
    }
  }

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamOn(false)
    updateMe({ camOn: false })
  }

  useEffect(() => () => stopCam(), [])

  function leave() {
    navigate('/lobby')
  }

  const online = peers.length + 1
  const total = Math.max(4, online)

  return (
    <div className="zm">
      {/* =====================  TOP BAR  ===================== */}
      <header className="zm-top">
        <div className="zm-top__left">
          <button className="zm-icon-btn" onClick={leave} title="Leave">
            <ZmIc n="back" />
          </button>
          <button className="zm-icon-btn" title="Camera">
            <ZmIc n="cam" />
          </button>
          <button className="zm-icon-btn" title="Audio">
            <ZmIc n="volume" />
          </button>
        </div>
        <div className="zm-top__center">
          <span className="zm-top__shield"><ZmIc n="shield" /></span>
          <span className="zm-top__room">{room.name}</span>
          <ZmIc n="chevr" />
        </div>
        <div className="zm-top__right">
          <button className="zm-leave" onClick={leave}>Leave</button>
        </div>
      </header>

      {/* =====================  GRID  ===================== */}
      <div className="zm-grid-wrap">
        <div className="zm-grid">
          {/* YOUR tile */}
          <div className={`zm-tile${camOn ? ' has-video' : ''}`}>
            <video ref={videoRef} className="zm-tile__feed mirror" muted playsInline style={{ display: camOn ? 'block' : 'none' }} />
            {!camOn && (
              <div className="zm-tile__off">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="zm-tile__ava" />
                ) : (
                  <div className="zm-tile__init">{myName[0]?.toUpperCase()}</div>
                )}
              </div>
            )}
            <div className="zm-tile__name">
              {muted && <span className="zm-tile__mic"><ZmIc n="micoff" /></span>}
              {myName} (You)
            </div>
            {camOn && <div className="zm-tile__cam-border" />}
          </div>

          {/* PEERS */}
          {peers.map((p) => (
            <PeerTile key={p.id} peer={p} />
          ))}

          {/* OPEN SEATS */}
          {Array.from({ length: Math.max(0, total - online) }).map((_, i) => (
            <div key={`open-${i}`} className="zm-tile zm-tile--open">
              <div className="zm-tile__off">
                <div className="zm-tile__init zm-tile__init--empty">
                  <ZmIc n="cam" />
                </div>
              </div>
              <div className="zm-tile__name">
                <span className="zm-tile__mic"><ZmIc n="micoff" /></span>
                Open Seat
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =====================  BOTTOM BAR  ===================== */}
      <footer className="zm-bottom">
        <button className={`zm-bar-btn${muted ? ' active' : ''}`} onClick={() => setMuted((m) => !m)}>
          <ZmIc n={muted ? 'micoff' : 'mic'} />
          <span>{muted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button className={`zm-bar-btn${camOn ? '' : ' active'}`} onClick={() => (camOn ? stopCam() : startCam())}>
          <ZmIc n={camOn ? 'cam' : 'camoff'} />
          <span>{camOn ? 'Stop Video' : 'Start Video'}</span>
        </button>
        <button className="zm-bar-btn" onClick={() => setShowParticipants((v) => !v)}>
          <ZmIc n="users" />
          <span>Participants</span>
          <span className="zm-bar-badge">{online}</span>
        </button>
        <button className="zm-bar-btn">
          <ZmIc n="chat" />
          <span>Chat</span>
        </button>
        <button className="zm-bar-btn">
          <ZmIc n="smile" />
          <span>Reactions</span>
        </button>
        <button className="zm-bar-btn">
          <ZmIc n="share" />
          <span>Share</span>
        </button>
        <button className="zm-bar-btn">
          <ZmIc n="more" />
          <span>More</span>
        </button>
      </footer>

      {/* =====================  PARTICIPANTS PANEL  ===================== */}
      {showParticipants && (
        <div className="zm-panel" onClick={() => setShowParticipants(false)}>
          <div className="zm-panel__card" onClick={(e) => e.stopPropagation()}>
            <div className="zm-panel__header">
              <h3>Participants ({online})</h3>
              <button onClick={() => setShowParticipants(false)}><ZmIc n="x" /></button>
            </div>
            <div className="zm-panel__list">
              <div className="zm-panel__item">
                <span className="zm-panel__dot" style={{ background: '#0ea55c' }} />
                <span>{myName} (You)</span>
                <span className="zm-panel__role">Host</span>
              </div>
              {peers.map((p) => (
                <div key={p.id} className="zm-panel__item">
                  <span className="zm-panel__dot" style={{ background: STATUS_COLOR[(p.status || 'studying') as StudyStatus] }} />
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="zm-toast">{toast}</div>}
    </div>
  )
}

function PeerTile({ peer }: { peer: StudyPeer }) {
  return (
    <div className="zm-tile">
      <div className="zm-tile__off">
        {peer.avatarUrl ? (
          <img src={peer.avatarUrl} alt="" className="zm-tile__ava" />
        ) : (
          <div className="zm-tile__init">{peer.name[0]?.toUpperCase()}</div>
        )}
      </div>
      <div className="zm-tile__name">
        <span className="zm-tile__mic"><ZmIc n="micoff" /></span>
        {peer.name}
      </div>
    </div>
  )
}

/* ---- Zoom-style monochrome icons ---- */
function ZmIc({ n }: { n: string }) {
  const s: React.SVGProps<SVGSVGElement> = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const p = (d: string) => <svg {...s}><path d={d} /></svg>
  const c = (ch: React.ReactNode) => <svg {...s}>{ch}</svg>
  switch (n) {
    case 'back': return p('M19 12H5M12 5l-7 7 7 7')
    case 'cam': return p('M3 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM15 10l6-3v10l-6-3')
    case 'camoff': return c(<><path d="M3 7a1 1 0 0 1 1-1h8" /><path d="M15 10l6-3v10" /><path d="M3 17V8" /><path d="M3 17a1 1 0 0 0 1 1h10" /><line x1="3" y1="3" x2="21" y2="21" /></>)
    case 'volume': return p('M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14')
    case 'shield': return c(<><path d="M12 2l8 4v5c0 5.25-3.5 8.75-8 10-4.5-1.25-8-4.75-8-10V6z" fill="currentColor" opacity="0.2" /><path d="M9 12l2 2 4-4" /></>)
    case 'chevr': return p('M9 6l6 6-6 6')
    case 'mic': return p('M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 19v4')
    case 'micoff': return c(<><path d="M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><path d="M15 19v1a7 7 0 0 1-7-7" /><path d="M12 19v4" /><line x1="3" y1="3" x2="21" y2="21" /></>)
    case 'users': return c(<><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><circle cx="17" cy="7" r="3" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></>)
    case 'chat': return p('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')
    case 'smile': return c(<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>)
    case 'share': return p('M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13')
    case 'more': return c(<><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /></>)
    case 'x': return p('M18 6L6 18M6 6l12 12')
    default: return p('M12 12')
  }
}
