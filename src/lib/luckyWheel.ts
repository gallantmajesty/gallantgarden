// Lucky Wheel — owner-managed config shared by the editor (/owner) and the
// player-facing wheel modal. Persists to DB via ownerContent (key "wheel")
// with a localStorage fallback so it works offline / pre-migration.

import { getOwnerContent, setOwnerContent } from './ownerContent'

export type WheelRewardType = 'leaves' | 'gold' | 'rank_xp' | 'item' | 'nothing'

export interface WheelPrize {
  id: string
  label: string
  emoji: string
  type: WheelRewardType
  amount: number        // leaves / gold / rank XP (ignored for item/nothing)
  itemId?: string       // item reward: shop inventory item id, e.g. "e1:item1"
  weight: number        // relative probability
  color: string         // wheel slice color
}

export interface LuckyWheelConfig {
  enabled: boolean
  cost: number            // leaves per spin
  freeSpinsPerDay: number // free spins reset daily (localStorage tracked)
  prizes: WheelPrize[]
  title: string
}

export const DEFAULT_WHEEL: LuckyWheelConfig = {
  enabled: true,
  cost: 100,
  freeSpinsPerDay: 1,
  title: 'Lucky Wheel',
  prizes: [
    { id: 'p1', label: '50 leaves', emoji: '🍃', type: 'leaves', amount: 50, weight: 35, color: '#4c8c4c' },
    { id: 'p2', label: '100 leaves', emoji: '🍀', type: 'leaves', amount: 100, weight: 25, color: '#3f7a3f' },
    { id: 'p3', label: '10 gold', emoji: '🌟', type: 'gold', amount: 10, weight: 15, color: '#c9a44a' },
    { id: 'p4', label: '500 leaves', emoji: '💎', type: 'leaves', amount: 500, weight: 8, color: '#8a6cc9' },
    { id: 'p5', label: '100 rank XP', emoji: '📈', type: 'rank_xp', amount: 100, weight: 10, color: '#4a7ac9' },
    { id: 'p6', label: 'Try again', emoji: '😅', type: 'nothing', amount: 0, weight: 7, color: '#7a7a7a' },
  ],
}

const LS_KEY = 'sf.owner.content.wheel'

export function loadWheelConfig(): LuckyWheelConfig {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LuckyWheelConfig
      if (parsed && Array.isArray(parsed.prizes)) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_WHEEL
}

export function saveWheelConfig(config: LuckyWheelConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(config))
  setOwnerContent('wheel', config as unknown as Record<string, unknown>).catch(() => {})
}

/** Fetch owner config from DB (called on app init alongside overrides). */
export async function syncWheelFromDb(): Promise<void> {
  const db = await getOwnerContent('wheel')
  if (db && Array.isArray((db as Record<string, unknown>).prizes)) {
    localStorage.setItem(LS_KEY, JSON.stringify(db))
  }
}

// ---- daily free-spin tracking (per device) ----
const SPIN_KEY = 'sf.wheel.spins'

export interface SpinRecord { date: string; paid: number; free: number }

export function getSpinRecord(): SpinRecord {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(SPIN_KEY)
    if (raw) {
      const r = JSON.parse(raw) as SpinRecord
      if (r.date === today) return r
    }
  } catch { /* ignore */ }
  return { date: today, paid: 0, free: 0 }
}

export function recordSpin(wasFree: boolean): void {
  const r = getSpinRecord()
  if (r.date !== new Date().toISOString().slice(0, 10)) {
    localStorage.setItem(SPIN_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), paid: 0, free: 0 }))
  }
  const cur = getSpinRecord()
  const next = wasFree ? { ...cur, free: cur.free + 1 } : { ...cur, paid: cur.paid + 1 }
  localStorage.setItem(SPIN_KEY, JSON.stringify(next))
}

/** Pick a prize by weighted probability. */
export function rollPrize(config: LuckyWheelConfig): WheelPrize {
  const total = config.prizes.reduce((a, p) => a + Math.max(0, p.weight), 0)
  let roll = Math.random() * total
  for (const p of config.prizes) {
    roll -= Math.max(0, p.weight)
    if (roll <= 0) return p
  }
  return config.prizes[config.prizes.length - 1]
}
