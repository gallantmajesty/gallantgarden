import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '../../store/chat'
import { useAuth } from '../../store/auth'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { fmtTime, dayLabel, isSameDay } from './chatUtil'
import { LinkPreviewCard } from './LinkPreviewCard'
import { getSticker, QUICK_REACTIONS } from './stickers'
import { EmojiPicker } from './EmojiPicker'
import { useChatSettings } from './chatSettings'
import type { Message } from '../../lib/types'

export interface ReplyTarget {
  id: string
  name: string
  text: string
}

/* WhatsApp-style read receipt: white double-tick when delivered, green when seen.
   The "Seen by …" names ride along as a hover tooltip. */
function ReadTicks({ seen, seenByNames }: { seen: boolean; seenByNames?: string }) {
  return (
    <span className={`sh-tick ${seen ? 'seen' : ''}`} title={seenByNames ? `Seen by ${seenByNames}` : 'Read receipts'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12l4 4L17 5" />
        <path d="M10.5 13.5L13 16l7-8" />
      </svg>
    </span>
  )
}

/* Small stroke icon for the hover action bar (no emojis). */
function ToolIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="sh-lightbox" onClick={onClose}>
      <img src={url} alt="" onClick={(e) => e.stopPropagation()} />
      <button className="sh-lightbox-x" type="button" onClick={onClose} aria-label="Close">×</button>
    </div>
  )
}

export function ChatThread({
  isGroup,
  onReply,
}: {
  isGroup: boolean
  onReply: (r: ReplyTarget) => void
}) {
  const { user } = useAuth()
  const messages = useChat((s) => s.messages)
  const meId = useChat((s) => s.meId)
  const reactions = useChat((s) => s.reactions)
  const typing = useChat((s) => s.typing)
  const groupMembers = useChat((s) => s.groupMembers)
  const seenBy = useChat((s) => s.seenBy)
  const activeConvId = useChat((s) => s.activeGroupId ?? s.activeConversationId)
  const toggleReaction = useChat((s) => s.toggleReaction)
  const editMine = useChat((s) => s.editMine)
  const deleteMine = useChat((s) => s.deleteMine)
  const loadOlder = useChat((s) => s.loadOlder)
  const loadingOlder = useChat((s) => s.loadingOlder)
  const hasMore = useChat((s) => s.hasMore)
  const wallpaper = useChatSettings((s) => s.wallpaper)
  const chatColor = useChatSettings((s) => s.chatColor)

  // WhatsApp-style chat colour: overrides the theme accent on my bubbles.
  // The swatches are mid-tone, so text flips to white — except the gold
  // default, which keeps the warm dark text.
  const chatText = chatColor === '#caa84a' ? '#1a120a' : '#ffffff'
  const chatStyle = chatColor
    ? { '--sh-chat-color': chatColor, '--sh-chat-text': chatText } as React.CSSProperties
    : undefined

  const [lightbox, setLightbox] = useState<string | null>(null)
  const [reactFor, setReactFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)

  const senderMap = useMemo(() => {
    const m = new Map<string, { name: string; avatar_url: string | null; rank: string | null }>()
    if (meId) m.set(meId, { name: user?.profile?.name ?? 'You', avatar_url: user?.profile?.avatar_url ?? null, rank: null })
    for (const gm of groupMembers) {
      m.set(gm.user_id, {
        name: gm.profile?.display_name ?? 'User',
        avatar_url: gm.profile?.avatar_url ?? null,
        rank: gm.profile?.rank ?? null,
      })
    }
    return m
  }, [groupMembers, meId, user])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom || messages.length <= 1) el.scrollTop = el.scrollHeight
    atBottom.current = nearBottom
  }, [messages.length])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el || !hasMore || loadingOlder) return
    if (el.scrollTop < 60) void loadOlder()
  }

  const previewText = (m: Message): string => {
    if (m.kind === 'image') return '📷 Photo'
    if (m.kind === 'sticker') return `${getSticker(m.meta?.sticker)?.label ?? 'Sticker'}`
    if (m.kind === 'link') return '🔗 Link'
    return m.body || ''
  }

  const typingNames = typing
    .map((id) => senderMap.get(id)?.name ?? 'Someone')
    .filter(Boolean)

  // index of MY latest message — "Seen by …" receipts hang under it, so they
  // stay visible even after the group has sent newer messages.
  const lastMineIdx = useMemo(() => {
    for (let j = messages.length - 1; j >= 0; j--) {
      if (messages[j].sender_id === (meId ?? user?.id)) return j
    }
    return -1
  }, [messages, meId, user?.id])

  return (
    <div className="sh-thread">
      <div className="sh-msgs" ref={scrollRef} onScroll={onScroll} data-no-hotkeys data-wall={wallpaper} style={chatStyle}>
        {hasMore && <div className="sh-loadmore">{loadingOlder ? 'Loading…' : 'Scroll up for older messages'}</div>}
        {messages.map((m, i) => {
          if (m.kind === 'system' && !m.body) return null
          const prev = messages[i - 1]
          const showDay = !prev || !isSameDay(prev.created_at, m.created_at)
          const mine = m.sender_id === (meId ?? user?.id)
          const sender = senderMap.get(m.sender_id)
          const grouped = !showDay && prev && prev.sender_id === m.sender_id && !prev.reply_to && !m.reply_to && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60_000 && !(prev.kind === 'system')

          if (m.kind === 'system') {
            return (
              <div key={m.id} className="sh-system">
                {showDay && <div className="sh-day"><span>{dayLabel(m.created_at)}</span></div>}
                <span>{m.body}</span>
              </div>
            )
          }

          const groups = reactions[m.id] ?? []
          const replyMsg = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null
          const isMyLast = mine && i === lastMineIdx

          return (
            <div key={m.id}>
              {showDay && <div className="sh-day"><span>{dayLabel(m.created_at)}</span></div>}
              <div className={`sh-msg ${mine ? 'mine' : 'theirs'} ${isGroup ? 'grp' : ''} ${grouped ? 'grp-next' : ''} ${m.kind === 'image' && m.attachment_url ? 'sh-msg--img' : ''}`}>
                {isGroup && !mine && !grouped && (
                  <span className="sh-msg-av">
                    <ProfileAvatar name={sender?.name ?? 'U'} avatarUrl={sender?.avatar_url} rankId={sender?.rank} size={30} />
                  </span>
                )}
                {isGroup && !mine && grouped && <span className="sh-msg-av sh-msg-av--ghost" />}
                <div className="sh-msg-col">
                  {isGroup && !mine && !grouped && <span className="sh-msg-name">{sender?.name ?? 'User'}</span>}
                  {replyMsg && (
                    <div className="sh-reply-chip">
                      <span className="sh-reply-line" />
                      <span>{previewText(replyMsg)}</span>
                    </div>
                  )}
                  <div className={`sh-bubble${m.kind === 'image' && m.attachment_url ? ' sh-bubble--image' : ''}`} onDoubleClick={() => onReply({ id: m.id, name: sender?.name ?? 'User', text: previewText(m) })}>
                    {editing === m.id ? (
                      <textarea
                        className="sh-edit-input"
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void editMine(m.id, editText.trim() || m.body)
                            setEditing(null)
                          } else if (e.key === 'Escape') setEditing(null)
                        }}
                      />
                    ) : (
                      renderBody(m, () => m.attachment_url && setLightbox(m.attachment_url))
                    )}
                    {m.edited_at && !editing && <span className="sh-edited">edited</span>}
                  </div>

                  <div className="sh-msg-foot">
                    <span className="sh-msg-time">{fmtTime(m.created_at)}</span>
                    {mine && isMyLast && <ReadTicks seen={isGroup && activeConvId ? (seenBy[activeConvId]?.length ?? 0) > 0 : false} seenByNames={isGroup && activeConvId && seenBy[activeConvId]?.length ? seenBy[activeConvId].map((uid) => senderMap.get(uid)?.name).filter(Boolean).join(', ') : undefined} />}
                  </div>

                  {groups.length > 0 && (
                    <div className="sh-reactions">
                      {groups.map((g) => (
                        <button
                          key={g.emoji}
                          type="button"
                          className={`sh-react ${g.mine ? 'mine' : ''}`}
                          onClick={() => void toggleReaction(m.id, g.emoji)}
                        >
                          {g.emoji}<span>{g.users.length}</span>
                        </button>
                      ))}
                      <button className="sh-react sh-react-add" type="button" onClick={() => setReactFor(m.id)} aria-label="Add reaction">+</button>
                    </div>
                  )}

                  <div className="sh-msg-tools">
                    <button type="button" title="Reply" onClick={() => onReply({ id: m.id, name: sender?.name ?? 'User', text: previewText(m) })} aria-label="Reply">
                      <ToolIcon d="M3 10a6 6 0 0 1 6-6h6a6 6 0 0 1 0 12h-3l-6 5v-5a6 6 0 0 1-3-6z" />
                    </button>
                    <button type="button" title="React" onClick={() => setReactFor(m.id)} aria-label="React">
                      <ToolIcon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                    </button>
                    {mine && <button type="button" title="Edit" onClick={() => { setEditing(m.id); setEditText(m.body) }} aria-label="Edit"><ToolIcon d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></button>}
                    {mine && <button type="button" title="Delete" onClick={() => void deleteMine(m.id)} aria-label="Delete"><ToolIcon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" /></button>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {typingNames.length > 0 && (
          <div className="sh-typing">
            {typingNames.slice(0, 3).join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
            <span className="sh-typing-dots"><i /><i /><i /></span>
          </div>
        )}
      </div>

      {lightbox && <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} />}
      {reactFor && (
        <div className="sh-react-pop">
          <div className="sh-react-quick">
            {QUICK_REACTIONS.map((e) => (
              <button key={e} type="button" onClick={() => { void toggleReaction(reactFor, e); setReactFor(null) }}>{e}</button>
            ))}
          </div>
          <EmojiPicker
            onClose={() => setReactFor(null)}
            onPick={(e) => { void toggleReaction(reactFor, e); setReactFor(null) }}
          />
        </div>
      )}
    </div>
  )
}

function renderBody(m: Message, onImage: () => void) {
  if (m.kind === 'image' && m.attachment_url) {
    const w = m.meta?.w ?? 0
    const h = m.meta?.h ?? 0
    const ratio = w && h ? Math.min(1.4, Math.max(0.5, h / w)) : 0.7
    return (
      <button type="button" className="sh-img-btn2" style={{ aspectRatio: w && h ? `${w} / ${h}` : undefined, paddingBottom: w && h ? undefined : `${ratio * 100}%` }} onClick={onImage}>
        <img src={m.attachment_url} alt={m.meta?.name ?? 'image'} loading="lazy" />
      </button>
    )
  }
  if (m.kind === 'sticker') {
    if (m.attachment_url) {
      return <img className="sh-sticker-img" src={m.attachment_url} alt="Sticker" loading="lazy" />
    }
    const st = getSticker(m.meta?.sticker)
    return <span className="sh-sticker-msg" title={st?.label}>{st?.emoji ?? '📦'}</span>
  }
  if (m.kind === 'link' && m.meta?.link) {
    return <LinkPreviewCard preview={m.meta.link} onOpen={() => window.open(m.meta?.link?.url, '_blank', 'noopener')} />
  }
  return <span>{m.body}</span>
}
