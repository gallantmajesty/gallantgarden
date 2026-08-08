import { STICKER_PACKS } from './stickers'

export function StickerPicker({ onPick, onClose }: { onPick: (id: string, emoji: string) => void; onClose: () => void }) {
  return (
    <div className="sh-pop sh-pop--wide" onMouseDown={(e) => e.stopPropagation()}>
      <div className="sh-pop-head">
        <span>Stickers</span>
        <button className="sh-pop-x" type="button" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="sh-sticker-scroll">
        {STICKER_PACKS.map((pack) => (
          <div key={pack.id} className="sh-sticker-pack">
            <div className="sh-sticker-pack-name">
              <span>{pack.emoji}</span> {pack.name}
            </div>
            <div className="sh-sticker-grid">
              {pack.stickers.map((s) => (
                <button key={s.id} type="button" className="sh-sticker" title={s.label} onClick={() => onPick(s.id, s.emoji)}>
                  {s.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
