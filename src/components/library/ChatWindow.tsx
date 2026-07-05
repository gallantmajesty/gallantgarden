import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChat } from '../../store/chat'
import { useFriends } from '../../store/friends'
import { effectiveStatus } from '../../lib/presence'
import { filterProfanity } from '../../lib/wordFilter'
import { STUDY_STATUS_LABEL, type ReportReason } from '../../lib/types'
import { ProfileAvatar } from '../ProfileAvatar'
import { StatusDot } from './StatusDot'

const EMOJI = ['😀', '😅', '😂', '🥰', '😎', '🤔', '👍', '🙌', '🎉', '🔥', '💪', '📚', '✅', '☕', '🌿', '✨', '😴', '😭', '❤️', '🙏']

// Persisted chat-window size. Desktop users asked for a bigger, resizable
// window; the choice survives refreshes (per-device) so it isn't reset each open.
type ChatSize = 'sm' | 'md' | 'lg'
const SIZE_KEY = 'sf.chat.size.v1'
const SIZES: { id: ChatSize; label: string }[] = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
]
function loadChatSize(): ChatSize {
  const v = (typeof localStorage !== 'undefined' && localStorage.getItem(SIZE_KEY)) as ChatSize | null
  return v === 'sm' || v === 'md' || v === 'lg' ? v : 'md'
}

// Lightweight DM window for the library. Glassmorphism, emoji, read receipts,
// infinite scroll. Polls the open conversation every 3s (v1 delivery). When a
// focus session is active the window stays usable but never pops or sounds —
// the panel/edge tab simply hold any new messages quietly.
export function ChatWindow() {
  const { t } = useTranslation()
  const meId = useChat((s) => s.meId)
  const friendId = useChat((s) => s.activeFriendId)
  const messages = useChat((s) => s.messages)
  const hasMore = useChat((s) => s.hasMore)
  const opening = useChat((s) => s.opening)
  const peerReadAt = useChat((s) => s.peerReadAt())

  const friend = useFriends((s) => s.friends.find((f) => f.id === friendId))

  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [size, setSize] = useState<ChatSize>(loadChatSize)

  function changeSize(next: ChatSize) {
    setSize(next)
    try {
      localStorage.setItem(SIZE_KEY, next)
    } catch {
      /* storage blocked — keep the in-memory choice */
    }
  }
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)

  // Realtime handles message delivery; fallback polling is managed by the store.
  // No interval needed here.

  // autoscroll to bottom when new messages append (not when prepending history)
  useLayoutEffect(() => {
    if (messages.length > prevLen.current) {
      const grewAtBottom = prevLen.current === 0 || messages.length - prevLen.current <= 2
      if (grewAtBottom) bottomRef.current?.scrollIntoView({ block: 'end' })
    }
    prevLen.current = messages.length
  }, [messages])

  if (!friendId) return null

  const status = friend ? effectiveStatus(friend) : 'offline'
  // read receipt: my last message seen if peer's read cursor passed its time
  const myLast = [...messages].reverse().find((m) => m.sender_id === meId)
  const seen = !!(myLast && peerReadAt && peerReadAt >= myLast.created_at)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setText('')
    setEmojiOpen(false)
    await useChat.getState().send(body)
  }

  function onScroll() {
    const el = listRef.current
    if (el && el.scrollTop < 40 && hasMore) {
      const prevH = el.scrollHeight
      void useChat.getState().loadOlder().then(() => {
        // keep the viewport anchored after prepending older messages
        requestAnimationFrame(() => {
          if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight - prevH
        })
      })
    }
  }

  return (
    <section className={`lcw lcw-${size}`}>
      <header className="lcw-head">
        {friend && (
          <span className="lcw-head-av">
            <ProfileAvatar name={friend.display_name} avatarUrl={friend.avatar_url} rankId={friend.rank} size={34} />
          </span>
        )}
        <span className="lcw-head-text">
          <span className="lcw-head-name">{friend?.display_name ?? t("chat.defaultName")}</span>
          <span className="lcw-head-status">
            <StatusDot status={status} size={7} /> {STUDY_STATUS_LABEL[status]}
          </span>
        </span>
        <div className="lcw-size" role="group" aria-label={t("chat.size")}>
          {SIZES.map((s) => (
            <button
              key={s.id}
              className={`lcw-size-btn ${size === s.id ? 'on' : ''}`}
              onClick={() => changeSize(s.id)}
              title={t('chat.sizeTooltip')}
              aria-pressed={size === s.id}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button className="lcw-ico" onClick={() => setMenuOpen((v) => !v)} title={t('chat.more')} aria-label={t('chat.more')}>⋯</button>
        <button className="lcw-ico" onClick={() => useChat.getState().closeChat()} title={t('common.close')} aria-label={t('common.close')}>✕</button>
        {menuOpen && friendId && <SafetyMenu targetId={friendId} onClose={() => setMenuOpen(false)} />}
      </header>

      <div className="lcw-msgs" ref={listRef} onScroll={onScroll}>
        {opening && <p className="lcw-hint">{t('chat.opening')}</p>}
        {!opening && hasMore && <p className="lcw-hint">{t('chat.scrollUp')}</p>}
        {!opening && messages.length === 0 && (
          <p className="lcw-hint">t('chat.sayHi')</p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === meId
          const prev = messages[i - 1]
          const grouped = prev && prev.sender_id === m.sender_id && timeGap(prev.created_at, m.created_at) < 5
          return (
            <div key={m.id} className={`lcw-msg ${mine ? 'mine' : 'theirs'} ${grouped ? 'grouped' : ''}`}>
              <span className="lcw-bubble">{filterProfanity(m.body)}</span>
            </div>
          )
        })}
        {seen && <div className="lcw-seen">{t('chat.seen')}</div>}
        <div ref={bottomRef} />
      </div>

      <form className="lcw-compose" onSubmit={send}>
        <button type="button" className="lcw-emoji-btn" onClick={() => setEmojiOpen((v) => !v)} title={t('chat.emoji')}>
          🙂
        </button>
        {emojiOpen && (
          <div className="lcw-emoji-pop">
            {EMOJI.map((e) => (
              <button type="button" key={e} onClick={() => setText((t) => t + e)}>
                {e}
              </button>
            ))}
          </div>
        )}
        <input
          className="lcw-input"
          placeholder={t('chat.messagePlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          data-no-hotkeys
          autoFocus
        />
        <button type="submit" className="lcw-send" disabled={!text.trim()} title={t('chat.send')}>
          ➤
        </button>
      </form>
    </section>
  )
}

function timeGap(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 60000
}

/* ----- block / report / unfriend menu ----- */
function SafetyMenu({ targetId, onClose }: { targetId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const { block, unfriend, report } = useFriends()
  const [reporting, setReporting] = useState(false)
  const REASONS: [ReportReason, string][] = [
    ['spam', t('chat.reasonSpam')],
    ['harassment', t('chat.reasonHarassment')],
    ['inappropriate', t('chat.reasonInappropriate')],
  ]
  return (
    <>
      <div className="lcw-menu-scrim" onClick={onClose} />
      <div className="lcw-menu">
        {!reporting ? (
          <>
            <button className="lcw-menu-item" onClick={() => setReporting(true)}>{t('chat.report')}</button>
            <button
              className="lcw-menu-item danger"
              onClick={() => {
                if (window.confirm(t('chat.confirmBlock'))) {
                  void block(targetId)
                  useChat.getState().closeChat()
                  onClose()
                }
              }}
            >
              Block user
            </button>
            <button
              className="lcw-menu-item"
              onClick={() => {
                if (window.confirm(t('chat.confirmRemoveFriend'))) {
                  void unfriend(targetId)
                  useChat.getState().closeChat()
                  onClose()
                }
              }}
            >
              Remove friend
            </button>
          </>
        ) : (
          <>
            <div className="lcw-menu-label">{t('chat.reportFor')}</div>
            {REASONS.map(([r, label]) => (
              <button
                key={r}
                className="lcw-menu-item"
                onClick={() => {
                  void report(targetId, r)
                  onClose()
                  window.alert(t('chat.reportSubmitted'))
                }}
              >
                {label}
              </button>
            ))}
          </>
        )}
      </div>
    </>
  )
}
