import { useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { useChat } from '../../store/chat'
import { useChatSettings, playSendSound } from './chatSettings'
import { startTypingBeat } from '../../store/chat'
import { transformOutgoing } from './moderation'
import { buildLinkPreview, extractUrls } from './linkPreview'
import { getSticker } from './stickers'
import { EmojiPicker } from './EmojiPicker'
import { StickerPicker } from './StickerPicker'
import { clamp } from './chatUtil'

export interface ReplyTarget {
  id: string
  name: string
  text: string
}

function ImageGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  )
}
function SendGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}
function EmojiGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}
function StickerGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9l7-7V5a2 2 0 0 0-2-2z" />
      <path d="M14 21v-5a2 2 0 0 1 2-2h5" />
    </svg>
  )
}

export function ChatComposer({ reply, onClearReply }: { reply: ReplyTarget | null; onClearReply: () => void }) {
  const send = useChat((s) => s.send)
  const sendImage = useChat((s) => s.sendImage)
  const meId = useChat((s) => s.meId)
  const enterToSend = useChatSettings((s) => s.enterToSend)
  const [draft, setDraft] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = clamp(ta.scrollHeight, 40, 140) + 'px'
  }, [draft])

  const hasText = draft.trim().length > 0

  const doSend = async () => {
    if (busy) return
    if (pendingFile) {
      setBusy(true)
      const ok = await sendImage(pendingFile)
      setBusy(false)
      if (ok) {
        setPendingFile(null)
        setPendingUrl(null)
        playSendSound()
      }
      return
    }
    const clean = transformOutgoing(draft)
    const text = clean.trim()
    if (!text) return
    const urls = extractUrls(text)
    let ok = false
    if (urls.length === 1 && urls[0] === text) {
      const preview = buildLinkPreview(urls[0])
      if (preview) {
        ok = await send(text, { kind: 'link', meta: { link: preview } })
      }
    }
    if (!ok) ok = await send(text, { replyTo: reply?.id ?? null })
    if (ok) {
      setDraft('')
      onClearReply()
      playSendSound()
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault()
      void doSend()
    }
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setPendingFile(f)
      setPendingUrl(URL.createObjectURL(f))
    }
    e.target.value = ''
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (item) {
      const f = item.getAsFile()
      if (f) {
        e.preventDefault()
        setPendingFile(f)
        setPendingUrl(URL.createObjectURL(f))
      }
    }
  }

  const sendSticker = async (id: string, emoji: string) => {
    setStickerOpen(false)
    await send('', { kind: 'sticker', meta: { sticker: id } })
    playSendSound()
    void emoji
  }

  useEffect(() => {
    if (hasText) startTypingBeat()
  }, [hasText])

  return (
    <div className="sh-composer-wrap">
      {reply && (
        <div className="sh-reply-bar">
          <span className="sh-reply-line" />
          <span className="sh-reply-text">
            <strong>{reply.name}</strong>
            <span>{reply.text}</span>
          </span>
          <button className="sh-reply-x" type="button" onClick={onClearReply} aria-label="Cancel reply">×</button>
        </div>
      )}

      {pendingFile && (
        <div className="sh-pending-img">
          <img src={pendingUrl ?? ''} alt="" />
          <button className="sh-pending-x" type="button" onClick={() => { setPendingFile(null); setPendingUrl(null) }} aria-label="Remove">×</button>
          <span className="sh-pending-label">Send image…</span>
        </div>
      )}

      <div className="sh-composer">
        <div className="sh-composer-tools">
          <button className={`sh-tool ${emojiOpen ? 'on' : ''}`} type="button" title="Emoji" onClick={() => { setEmojiOpen((v) => !v); setStickerOpen(false) }}>
            <EmojiGlyph />
          </button>
          <button className={`sh-tool ${stickerOpen ? 'on' : ''}`} type="button" title="Stickers" onClick={() => { setStickerOpen((v) => !v); setEmojiOpen(false) }}>
            <StickerGlyph />
          </button>
          <button className="sh-tool" type="button" title="Send image" onClick={() => fileRef.current?.click()}>
            <ImageGlyph />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
        </div>

        <textarea
          ref={taRef}
          className="sh-input"
          value={draft}
          placeholder="Message…"
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onPaste={onPaste}
          data-no-hotkeys
        />

        <button className="sh-send" type="button" onClick={() => void doSend()} disabled={busy || (!hasText && !pendingFile)} title="Send">
          <SendGlyph />
        </button>
      </div>

      {emojiOpen && (
        <div className="sh-pop-anchor">
          <EmojiPicker
            onClose={() => setEmojiOpen(false)}
            onPick={(e) => setDraft((d) => d + e)}
          />
        </div>
      )}
      {stickerOpen && (
        <div className="sh-pop-anchor sh-pop-anchor--wide">
          <StickerPicker onClose={() => setStickerOpen(false)} onPick={sendSticker} />
        </div>
      )}
    </div>
  )
}
