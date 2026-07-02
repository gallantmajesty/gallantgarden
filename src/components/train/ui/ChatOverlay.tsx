// Chat overlay — bottom-left semi-transparent message feed. Shows system
// messages (departure, arrival), player chat, and milestone announcements.
// Toggle input with Enter key; limited to 100 chars per message.

import { useEffect, useRef, useState } from 'react'
import { useTrain } from '../../../store/train'

interface ChatMessage {
  id: string
  type: 'system' | 'player' | 'milestone'
  text: string
  name?: string
  seat?: number
  ts: number
}

// Pre-seeded system messages based on journey phase
function systemMessages(_lineName: string, destination: string): ChatMessage[] {
  const now = Date.now()
  return [
    { id: 'sys-dep', type: 'system', text: `Departing for ${destination}`, ts: now },
  ]
}

export function ChatOverlay() {
  const line = useTrain((s) => s.line)
  const phase = useTrain((s) => s.phase)
  const seat = useTrain((s) => s.seat)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputOpen, setInputOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const idCounter = useRef(0)

  // Seed system messages on journey start
  useEffect(() => {
    if (phase === 'traveling' && line) {
      setMessages(systemMessages(line.name, line.destination))
    }
    if (phase === 'arrived') {
      setMessages((prev) => [
        ...prev,
        { id: `sys-arr`, type: 'system', text: `Arrived at ${line?.destination ?? 'destination'}`, ts: Date.now() },
      ])
    }
  }, [phase, line])

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Enter to open input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && !inputOpen && phase === 'traveling') {
        e.preventDefault()
        setInputOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.code === 'Escape' && inputOpen) {
        setInputOpen(false)
        setInputText('')
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [inputOpen, phase])

  const send = () => {
    const text = inputText.trim()
    if (!text) return
    const msg: ChatMessage = {
      id: `msg-${++idCounter.current}`,
      type: 'player',
      text,
      name: 'You',
      seat: seat ?? undefined,
      ts: Date.now(),
    }
    setMessages((prev) => [...prev.slice(-20), msg])
    setInputText('')
    setInputOpen(false)
  }

  if (phase !== 'traveling' && phase !== 'arriving') return null

  return (
    <div className="train-chat">
      <div className="train-chat-feed" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={`train-chat-msg train-chat-${m.type}`}>
            {m.type === 'player' && (
              <span className="train-chat-name">{m.name}{m.seat != null ? ` (#${m.seat + 1})` : ''}</span>
            )}
            <span className="train-chat-text">{m.text}</span>
          </div>
        ))}
      </div>

      {inputOpen && (
        <div className="train-chat-input">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 100))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
              e.stopPropagation()
            }}
            placeholder="Type a message..."
            maxLength={100}
          />
          <button className="sf-btn ghost sm" onClick={send}>Send</button>
        </div>
      )}
    </div>
  )
}
