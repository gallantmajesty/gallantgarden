import { useChatSettings, type ChatTheme, type BubbleStyle, type ChatWallpaper } from './chatSettings'

const THEMES: { id: ChatTheme; label: string; swatch: string }[] = [
  { id: 'gold', label: 'Golden', swatch: 'linear-gradient(135deg,#caa84a,#b8932f)' },
  { id: 'midnight', label: 'Midnight', swatch: 'linear-gradient(135deg,#3a4a7a,#1e2747)' },
  { id: 'aurora', label: 'Aurora', swatch: 'linear-gradient(135deg,#5ec6e6,#b98cff)' },
]
const BUBBLES: { id: BubbleStyle; label: string }[] = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'compact', label: 'Compact' },
  { id: 'bubbly', label: 'Bubbly' },
]
const WALLS: { id: ChatWallpaper; label: string }[] = [
  { id: 'none', label: 'Plain' },
  { id: 'forest', label: 'Forest' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'stars', label: 'Stars' },
]

export function ChatSettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useChatSettings()
  return (
    <div className="sh-settings">
      <header className="sh-members-head">
        <strong>Chat settings</strong>
        <button className="sh-icon" type="button" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sh-settings-body">
        <p className="sh-section">Theme</p>
        <div className="sh-seg">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className={`sh-seg-btn ${s.theme === t.id ? 'on' : ''}`} onClick={() => s.set({ theme: t.id })}>
              <span className="sh-swatch" style={{ background: t.swatch }} />
              {t.label}
            </button>
          ))}
        </div>

        <p className="sh-section">Bubble style</p>
        <div className="sh-seg">
          {BUBBLES.map((b) => (
            <button key={b.id} type="button" className={`sh-seg-btn ${s.bubbleStyle === b.id ? 'on' : ''}`} onClick={() => s.set({ bubbleStyle: b.id })}>
              {b.label}
            </button>
          ))}
        </div>

        <p className="sh-section">Font size · {s.fontSize}px</p>
        <input type="range" min={13} max={19} value={s.fontSize} onChange={(e) => s.set({ fontSize: Number(e.target.value) })} className="sh-range" />

        <p className="sh-section">Wallpaper</p>
        <div className="sh-seg sh-seg-wrap">
          {WALLS.map((w) => (
            <button key={w.id} type="button" className={`sh-seg-btn ${s.wallpaper === w.id ? 'on' : ''}`} onClick={() => s.set({ wallpaper: w.id })}>
              {w.label}
            </button>
          ))}
        </div>

        <p className="sh-section">Behaviour</p>
        <Toggle label="Enter to send" on={s.enterToSend} onToggle={() => s.set({ enterToSend: !s.enterToSend })} />
        <Toggle label="Send sound" on={s.sound} onToggle={() => s.set({ sound: !s.sound })} />
        <Toggle label="Notifications" on={s.notifications} onToggle={() => s.set({ notifications: !s.notifications })} />
        <Toggle label="Read receipts" on={s.showReadReceipts} onToggle={() => s.set({ showReadReceipts: !s.showReadReceipts })} />
        <Toggle label="Typing indicator" on={s.showTyping} onToggle={() => s.set({ showTyping: !s.showTyping })} />
        <Toggle label="Autoplay GIF" on={s.autoplayGif} onToggle={() => s.set({ autoplayGif: !s.autoplayGif })} />
        <Toggle label="Compact list" on={s.compactList} onToggle={() => s.set({ compactList: !s.compactList })} />
      </div>
    </div>
  )
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="sh-toggle" onClick={onToggle}>
      <span>{label}</span>
      <span className={`sh-switch ${on ? 'on' : ''}`}><span className="sh-knob" /></span>
    </button>
  )
}
