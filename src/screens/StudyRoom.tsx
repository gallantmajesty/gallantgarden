import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { RankBadge } from '../components/RankBadge'
import { STATUS_COLOR } from '../lib/presence'
import type { StudyStatus } from '../lib/types'
import { getStudyRoom, channelFor, roomKey } from '../lib/studyRooms'
import { joinStudyRoom, leaveStudyRoom, updateMe, useStudyRoom, type StudyPeer } from '../lib/studyRoomNet'
import { startHeartbeat, leavePresence } from '../lib/realmPresence'
import './StudyRoom.css'

/* ============================================================
   StudyRoom session — StudyStream-style focus grid, themed to match the
   magical lobby (frosted glass over the ambient background).

   REAL rooms, not dummies: presence is live over InsForge realtime
   (studyRoomNet) — you see who is actually in the room (name, our rank
   badge, status) and a PUBLIC session stopwatch on every tile that
   counts from the moment each person joined. Occupancy is also written
   to realm_presence so the chooser's N/100 counts are real.

   Your tile is a live local webcam (video-only — mic-free by design).
   Remote webcam video is the next layer (WebRTC); peers currently show
   their avatar + presence. No fake users — empty slots are "open seats."
   ============================================================ */

const STATUS_LABEL: Record<StudyStatus, string> = {
  available: 'Available',
  studying: 'Studying',
  focus: 'Deep Focus',
  break: 'On Break',
  offline: 'Away',
}
const STATUS_ORDER: StudyStatus[] = ['studying', 'focus', 'break', 'available']

function fmtDur(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`
}

export function StudyRoom() {
  const navigate = useNavigate()
  const { id = 'deep-focus' } = useParams()
  const room = useMemo(() => getStudyRoom(id), [id])

  const { user } = useAuth()
  const displayName = useProfile((s) => s.displayName)
  const avatarUrl = useProfile((s) => s.avatarUrl)
  const myRank = useProfile((s) => s.data.rank)
  const myCountry = useProfile((s) => s.data.country)
  const myName = displayName && displayName !== 'Explorer' ? displayName.split(' ')[0] : 'You'

  const roster = useStudyRoom((s) => s.roster)
  const peers = useMemo(() => Object.values(roster).sort((a, b) => a.sessionStart - b.sessionStart), [roster])

  const [myStatus, setMyStatus] = useState<StudyStatus>('studying')
  const [status, setStatus] = useState('')
  const [camOn, setCamOn] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [chrome, setChrome] = useState(true) // show/hide the top + left bars

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // session stopwatch anchor — fixed for this visit (the public clock counts up
  // from here, and we broadcast it so everyone sees the same number).
  const sessionStart = useRef(Date.now()).current
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  // join presence (realtime roster) + occupancy heartbeat (realm_presence)
  useEffect(() => {
    void joinStudyRoom(
      channelFor(id),
      {
        name: myName,
        rank: myRank || 'brown-leaf',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setToast('Camera blocked — allow access to show your face')
      setTimeout(() => setToast(null), 3200)
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

  function cycleStatus() {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(myStatus) + 1) % STATUS_ORDER.length]
    setMyStatus(next)
    updateMe({ status: next })
  }

  function leave() {
    navigate('/rooms')
  }

  const online = peers.length + 1
  // pad the grid with honest "open seats" so the room reads as a space, not a
  // sparse list — never with fake people.
  const filled = 1 + peers.length
  const openSeats = Math.max(0, Math.max(8, Math.ceil(filled / 4) * 4) - filled)

  return (
    <div className="ss" data-chrome={chrome ? 'on' : 'off'}>
      {/* =====================  LEFT ICON RAIL  ===================== */}
      <nav className="ss-rail water-glass">
        <button className="ss-rail__btn is-active" title="Rooms" onClick={() => navigate('/rooms')}><Ic n="home" /></button>
        <button className="ss-rail__btn" title="Friends"><Ic n="group" /></button>
        <button className="ss-rail__btn" title="Chat"><Ic n="chat" /></button>
        <button className="ss-rail__btn" title="Leaderboard"><Ic n="chart" /></button>
        <button className="ss-rail__btn" title="Profile" onClick={() => navigate('/profile')}><Ic n="user" /></button>
        <div className="ss-rail__spacer" />
        <button className="ss-rail__btn" title="Settings"><Ic n="gear" /></button>
        <div className="ss-rail__sigil">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
            <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" />
          </svg>
        </div>
      </nav>

      <div className="ss-main">
        {/* =====================  WEBCAM GRID  ===================== */}
        <div className="ss-grid-wrap">
          <div className="ss-grid">
            {/* YOUR live tile */}
            <div className="ss-tile is-you">
              {/* the <video> is ALWAYS mounted (just hidden when off) so the ref
                  exists when startCam attaches the stream — otherwise the feed
                  silently never shows. */}
              <video ref={videoRef} className="ss-tile__feed mirror" muted playsInline style={{ display: camOn ? 'block' : 'none' }} />
              {!camOn && (
                <div className="ss-tile__off">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="ss-tile__ava" /> : <div className="ss-tile__init">{myName[0]?.toUpperCase()}</div>}
                  <small>Click "Show Face" to reveal yourself</small>
                </div>
              )}

              <div className="ss-tile__tl">
                <span className="ss-bubble light"><Ic n="pin" /></span>
              </div>
              <div className="ss-tile__tr">
                <span className="ss-bubble clock"><Ic n="clock" /> {fmtDur(now - sessionStart)}</span>
                <span className="ss-rankbadge"><RankBadge rankId={myRank} size={30} /></span>
              </div>

              <div className="ss-tile__name">
                <span className="ava">{myName[0]?.toUpperCase()}</span>
                {myName}
              </div>

              <input
                className="ss-tile__statusinput"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Set a study status..."
                maxLength={80}
              />
            </div>

            {/* REAL peers — live presence from the room roster */}
            {peers.map((p) => (
              <PeerTile key={p.id} peer={p} now={now} />
            ))}

            {/* open seats — honest placeholders, no fake users */}
            {Array.from({ length: openSeats }).map((_, i) => (
              <div key={`open-${i}`} className="ss-tile is-open">
                <div className="ss-seat">
                  <div className="ss-seat__ic">
                    <Ic n="cam" />
                  </div>
                  <b>Open Seat</b>
                  <small>Awaiting a study companion</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =====================  BOTTOM BAR (slides up)  ===================== */}
        <div className="ss-bottom-bar">
          <header className="ss-bottom water-glass">
            {/* Chrome toggle - centered at top of bar */}
            <button className="ss-chrome-toggle" onClick={() => setChrome((c) => !c)} title={chrome ? 'Hide bar' : 'Show bar'}>
              <Ic n={chrome ? 'chevd' : 'chevu'} />
            </button>
            <img src="/icons/rooms/fairy.png" alt="" className="ss-bottom__logo" />
            <button className="ss-finish" onClick={leave}>
              <Ic n="check" /> Finish
            </button>

            <div className="ss-bottom__divider" />

            <div className="ss-you water-glass">
              <span className="ss-you__tag"><RuneIcon /> <span className="dot">{myName[0]?.toUpperCase()}</span>YOU</span>
              <button className={`ss-you__ic${camOn ? ' on' : ' off'}`} title={camOn ? 'Turn camera off' : 'Show your face'} onClick={() => (camOn ? stopCam() : startCam())}>
                <Ic n={camOn ? 'cam' : 'camoff'} />
              </button>
              <button className="ss-you__ic muted" title="No mic — silent room"><Ic n="micoff" /></button>
            </div>

            <button className="ss-status" onClick={cycleStatus} title="Set your study mode">
              <i style={{ background: STATUS_COLOR[myStatus] }} />
              {STATUS_LABEL[myStatus]}
            </button>

            <div className="ss-bottom__spacer" />

            <span className="ss-bottom__room" style={{ ['--rc' as string]: room.accent }}>
              <span className="ss-bottom__room-emoji">{room.emoji}</span>{room.name}
            </span>

            <div className="ss-pager">
              <button><Ic n="chevl" /></button>
              <span><b>1</b> / 1</span>
              <button><Ic n="chevr" /></button>
            </div>

            <button className="ss-find">
              <Ic n="filter" /> Find Buddies
            </button>
            <div className="ss-count"><Ic n="users" /> {online}</div>
          </header>
        </div>

        {/* Unhide button - shows when bottom bar is hidden */}
        {!chrome && (
          <button className="ss-unhide-btn" onClick={() => setChrome(true)} title="Show controls">
            <Ic n="chevu" />
          </button>
        )}
      </div>

      {toast && <div className="ss-toast">{toast}</div>}
    </div>
  )
}

/* a real remote peer's tile — presence now, live video in the WebRTC layer */
function PeerTile({ peer, now }: { peer: StudyPeer; now: number }) {
  const status = (peer.status || 'studying') as StudyStatus
  return (
    <div className="ss-tile">
      <div className="ss-tile__off">
        {peer.avatarUrl ? <img src={peer.avatarUrl} alt="" className="ss-tile__ava" /> : <div className="ss-tile__init">{peer.name[0]?.toUpperCase()}</div>}
        <small style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</small>
      </div>
      <div className="ss-tile__tr">
        <span className="ss-bubble clock"><Ic n="clock" /> {fmtDur(now - peer.sessionStart)}</span>
        <span className="ss-rankbadge"><RankBadge rankId={peer.rank} size={30} /></span>
      </div>
      <div className="ss-tile__name">
        <span className="ava">{peer.name[0]?.toUpperCase()}</span>
        {peer.name}
      </div>
      <div className="ss-tile__status" style={{ color: STATUS_COLOR[status] }}>
        {STATUS_LABEL[status]}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Magical rune icon — decorative sparkle element
   ------------------------------------------------------------------ */
function RuneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8 }}>
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  )
}

/* ------------------------------------------------------------------
   Inline monochrome icons (no icon dependency) — currentColor, 24px box.
   ------------------------------------------------------------------ */
function Ic({ n }: { n: string }) {
  const p = (d: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
  switch (n) {
    case 'home': return p('M4 11l8-7 8 7M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9')
    case 'user': return p('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0')
    case 'chat': return p('M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3V6a1 1 0 0 1 1-1z')
    case 'group': return p('M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19a6 6 0 0 1 12 0M16 11a3 3 0 1 0-1-5.8M21 19a6 6 0 0 0-5-5.9')
    case 'chart': return p('M5 20V10M12 20V4M19 20v-7')
    case 'gear': return p('M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2')
    case 'check': return p('M5 12l5 5L20 7')
    case 'clock': return p('M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z')
    case 'cam': return p('M3 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM15 10l6-3v10l-6-3')
    case 'camoff': return p('M3 7a1 1 0 0 1 1-1h8M15 10l6-3v10M3 17V8M3 17a1 1 0 0 0 1 1h10M4 4l16 16')
    case 'micoff': return p('M5 5l14 14M9 5a3 3 0 0 1 6 0v3M15 11v0M8 11a4 4 0 0 0 6.5 3.1M12 17v3')
    case 'shield': return p('M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z')
    case 'chevl': return p('M15 6l-6 6 6 6')
    case 'chevr': return p('M9 6l6 6-6 6')
    case 'chevd': return p('M6 9l6 6 6-6')
    case 'chevu': return p('M18 15l-6-6-6 6')
    case 'filter': return p('M4 5h16l-6 8v5l-4 2v-7z')
    case 'users': return p('M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19a6 6 0 0 1 12 0M16 11a3 3 0 1 0-1-5.8M21 19a6 6 0 0 0-5-5.9')
    case 'pin': return p('M9 4h6l-1 6 3 3H7l3-3z M12 13v7')
    case 'eye': return p('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z')
    case 'eyeoff': return p('M4 4l16 16M9.5 9.5a3 3 0 0 0 4.2 4.2M7 7C4 8.7 2 12 2 12s3.5 7 10 7c2 0 3.7-.6 5.1-1.4M21.5 13.5C22 12.9 22 12 22 12s-3.5-7-10-7c-.5 0-1 0-1.5.1')
    default: return p('M12 12')
  }
}
