// Updates & News — owner-managed announcement content shared by the /owner
// editors and the player-facing news modal. Persists to DB via ownerContent
// (keys "updates" and "news") with localStorage fallback.

import { getOwnerContent, setOwnerContent } from './ownerContent'

export interface UpdateEntry {
  id: string
  version: string   // e.g. "v1.4.2"
  title: string
  date: string      // ISO date
  notes: string[]   // bullet list
  active: boolean
}

export interface NewsEntry {
  id: string
  title: string
  body: string
  tag: string       // e.g. "EVENT", "FIX", "WELCOME"
  date: string      // ISO date
  active: boolean
}

export const DEFAULT_UPDATES: UpdateEntry[] = [
  {
    id: 'u1',
    version: 'v1.0',
    title: 'FocusLily launches',
    date: new Date().toISOString().slice(0, 10),
    notes: ['Welcome to FocusLily!', 'Train, focus, and grow your forest.'],
    active: true,
  },
]

export const DEFAULT_NEWS: NewsEntry[] = [
  {
    id: 'n1',
    title: 'Welcome to FocusLily!',
    body: 'Start your first focus session on the train, collect leaves, and unlock your dream avatar.',
    tag: 'WELCOME',
    date: new Date().toISOString().slice(0, 10),
    active: true,
  },
]

const LS_UPDATES = 'sf.owner.content.updates'
const LS_NEWS = 'sf.owner.content.news'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as T
    }
  } catch { /* ignore */ }
  return fallback
}

export function loadUpdates(): UpdateEntry[] {
  return load<UpdateEntry[]>(LS_UPDATES, DEFAULT_UPDATES)
}

export function loadNews(): NewsEntry[] {
  return load<NewsEntry[]>(LS_NEWS, DEFAULT_NEWS)
}

export function saveUpdates(entries: UpdateEntry[]): void {
  localStorage.setItem(LS_UPDATES, JSON.stringify(entries))
  setOwnerContent('updates', { entries }).catch(() => {})
}

export function saveNews(entries: NewsEntry[]): void {
  localStorage.setItem(LS_NEWS, JSON.stringify(entries))
  setOwnerContent('news', { entries }).catch(() => {})
}

export async function syncUpdatesFromDb(): Promise<void> {
  const db = await getOwnerContent('updates')
  const entries = db && Array.isArray((db as { entries?: unknown }).entries) ? (db as { entries: UpdateEntry[] }).entries : null
  if (entries) localStorage.setItem(LS_UPDATES, JSON.stringify(entries))
}

export async function syncNewsFromDb(): Promise<void> {
  const db = await getOwnerContent('news')
  const entries = db && Array.isArray((db as { entries?: unknown }).entries) ? (db as { entries: NewsEntry[] }).entries : null
  if (entries) localStorage.setItem(LS_NEWS, JSON.stringify(entries))
}

// ---- unread tracking (per device) ----
const READ_KEY = 'sf.announcements.lastRead'

export function getLastRead(): string {
  return localStorage.getItem(READ_KEY) ?? ''
}

export function hasUnreadAnnouncements(): boolean {
  const all = [...loadUpdates(), ...loadNews()].filter((a) => a.active)
  if (all.length === 0) return false
  const lastRead = getLastRead()
  const latest = all.map((a) => a.date).sort().pop() ?? ''
  return !lastRead || latest > lastRead
}

export function markAnnouncementsRead(): void {
  localStorage.setItem(READ_KEY, new Date().toISOString().slice(0, 10))
}
