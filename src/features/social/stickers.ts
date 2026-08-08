// Emoji-based sticker packs. Each sticker is just an emoji rendered large on a
// translucent card — no asset pipeline needed, instant and crisp. Packs are
// curated to fit the study/cozy theme of Focus Lily.

export interface Sticker {
  id: string
  emoji: string
  label: string
}

export interface StickerPack {
  id: string
  name: string
  emoji: string
  stickers: Sticker[]
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'study',
    name: 'Study',
    emoji: '📚',
    stickers: [
      { id: 'book', emoji: '📚', label: 'Books' },
      { id: 'pen', emoji: '🖊️', label: 'Pen' },
      { id: 'bulb', emoji: '💡', label: 'Idea' },
      { id: 'coffee', emoji: '☕', label: 'Coffee' },
      { id: 'brain', emoji: '🧠', label: 'Brain' },
      { id: 'graduation', emoji: '🎓', label: 'Grad' },
      { id: 'notebook', emoji: '📓', label: 'Notes' },
      { id: 'timer', emoji: '⏳', label: 'Focus' },
      { id: 'check', emoji: '✅', label: 'Done' },
      { id: '123', emoji: '🔢', label: 'Math' },
    ],
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    stickers: [
      { id: 'tree', emoji: '🌳', label: 'Tree' },
      { id: 'leaf', emoji: '🍃', label: 'Leaf' },
      { id: 'flower', emoji: '🌸', label: 'Blossom' },
      { id: 'mushroom', emoji: '🍄', label: 'Shroom' },
      { id: 'owl', emoji: '🦉', label: 'Owl' },
      { id: 'fox', emoji: '🦊', label: 'Fox' },
      { id: 'firefly', emoji: '✨', label: 'Sparkle' },
      { id: 'moon', emoji: '🌙', label: 'Moon' },
      { id: 'sun', emoji: '🌞', label: 'Sun' },
      { id: 'star', emoji: '⭐', label: 'Star' },
    ],
  },
  {
    id: 'mood',
    name: 'Mood',
    emoji: '😊',
    stickers: [
      { id: 'smile', emoji: '😊', label: 'Happy' },
      { id: 'laugh', emoji: '😂', label: 'Lol' },
      { id: 'love', emoji: '😍', label: 'Love' },
      { id: 'think', emoji: '🤔', label: 'Thinking' },
      { id: 'cool', emoji: '😎', label: 'Cool' },
      { id: 'cry', emoji: '😭', label: 'Cry' },
      { id: 'sleep', emoji: '😴', label: 'Sleepy' },
      { id: 'shock', emoji: '😮', label: 'Wow' },
      { id: 'angry', emoji: '😤', label: 'Ugh' },
      { id: 'wink', emoji: '😉', label: 'Wink' },
    ],
  },
  {
    id: 'celebrate',
    name: 'Celebrate',
    emoji: '🎉',
    stickers: [
      { id: 'party', emoji: '🎉', label: 'Party' },
      { id: 'tada', emoji: '🎊', label: 'Confetti' },
      { id: 'fire', emoji: '🔥', label: 'Fire' },
      { id: 'medal', emoji: '🏅', label: 'Medal' },
      { id: 'trophy', emoji: '🏆', label: 'Win' },
      { id: 'gift', emoji: '🎁', label: 'Gift' },
      { id: 'cake', emoji: '🎂', label: 'Cake' },
      { id: 'heart', emoji: '❤️', label: 'Heart' },
      { id: 'clap', emoji: '👏', label: 'Clap' },
      { id: 'thumbs', emoji: '👍', label: 'Yes' },
    ],
  },
  {
    id: 'animals',
    name: 'Friends',
    emoji: '🐱',
    stickers: [
      { id: 'cat', emoji: '🐱', label: 'Cat' },
      { id: 'dog', emoji: '🐶', label: 'Dog' },
      { id: 'panda', emoji: '🐼', label: 'Panda' },
      { id: 'bunny', emoji: '🐰', label: 'Bunny' },
      { id: 'bear', emoji: '🐻', label: 'Bear' },
      { id: 'frog', emoji: '🐸', label: 'Frog' },
      { id: 'chick', emoji: '🐥', label: 'Chick' },
      { id: 'penguin', emoji: '🐧', label: 'Penguin' },
      { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
      { id: 'dragon', emoji: '🐉', label: 'Dragon' },
    ],
  },
]

const BY_ID = new Map<string, Sticker>()
for (const pack of STICKER_PACKS) for (const s of pack.stickers) BY_ID.set(s.id, s)

export function getSticker(id: string | null | undefined): Sticker | null {
  if (!id) return null
  return BY_ID.get(id) ?? null
}

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']
