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
  const toggleReaction = useChat((s) => s.toggleReaction)
  const editMine = useChat((s) => s.editMine)
  const deleteMine = useChat((s) => s.deleteMine)
  const loadOlder = useChat((s) => s.loadOlder)
  const loadingOlder = useChat((s) => s.loadingOlder)
  const hasMore = useChat((s) => s.hasMore)
  const wallpaper = useChatSettings((s) => s.wallpaper)

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

  return (
    <div className="sh-thread">
      <div className="sh-msgs" ref={scrollRef} onScroll={onScroll} data-no-hotkeys data-wall={wallpaper}>
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

          return (
            <div key={m.id}>
              {showDay && <div className="sh-day"><span>{dayLabel(m.created_at)}</span></div>}
              <div className={`sh-msg ${mine ? 'mine' : 'theirs'} ${isGroup ? 'grp' : ''} ${grouped ? 'grp-next' : ''}`}>
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
                  <div className="sh-bubble" onDoubleClick={() => onReply({ id: m.id, name: sender?.name ?? 'User', text: previewText(m) })}>
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
                    {mine && <button className="sh-msg-edit" type="button" onClick={() => { setEditing(m.id); setEditText(m.body) }}>edit</button>}
                    {mine && <button className="sh-msg-edit" type="button" onClick={() => void deleteMine(m.id)}>delete</button>}
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
                    <button type="button" title="Reply" onClick={() => onReply({ id: m.id, name: sender?.name ?? 'User', text: previewText(m) })}>↩</button>
                    <button type="button" title="React" onClick={() => setReactFor(m.id)}>🙂</button>
                    {mine && <button type="button" title="Edit" onClick={() => { setEditing(m.id); setEditText(m.body) }}>✎</button>}
                    {mine && <button type="button" title="Delete" onClick={() => void deleteMine(m.id)}>🗑</button>}
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
    const st = getSticker(m.meta?.sticker)
    return <span className="sh-sticker-msg" title={st?.label}>{st?.emoji ?? '📦'}</span>
  }
  if (m.kind === 'link' && m.meta?.link) {
    return <LinkPreviewCard preview={m.meta.link} onOpen={() => window.open(m.meta?.link?.url, '_blank', 'noopener')} />
  }
  return <span>{m.body}</span>
}
