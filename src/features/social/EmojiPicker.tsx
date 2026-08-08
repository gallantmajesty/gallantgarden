export const EMOJI_SET: string[] = [
  '😀', '😁', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤔',
  '🤨', '😐', '😴', '😎', '🥳', '😢', '😭', '😤', '😡', '🤯', '😱', '😨', '🤗', '🤩', '🥺', '😏',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '✌️', '🤞', '👌', '🫶', '👋', '🤙', '💯', '✨', '🔥',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💖', '💗', '💔', '⭐', '🌟', '💫', '⚡', '🌈', '☀️',
  '🌙', '⛅', '🌸', '🌺', '🌻', '🍀', '🌿', '🍂', '🌳', '🌲', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🦄', '🐢', '🐝', '🦋', '🍎', '🍓', '🍕', '🍔', '🍟', '🍩', '🍪', '🎂', '☕', '🍵', '🍿',
  '📚', '📖', '📝', '✏️', '🖊️', '💡', '🧠', '🎓', '⏰', '⏳', '🎯', '🏆', '🥇', '🎉', '🎊', '🎁',
  '💻', '📱', '🎮', '🎵', '🎧', '📷', '🔔', '💬', '🗨️', '✅', '❌', '⚠️', '💡', '🌍', '🚀', '💎',
]

export function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <div className="sh-pop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="sh-pop-head">
        <span>Emoji</span>
        <button className="sh-pop-x" type="button" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="sh-emoji-grid">
        {EMOJI_SET.map((e) => (
          <button key={e} type="button" className="sh-emoji" onClick={() => onPick(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
