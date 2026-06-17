import { getCachedProfileSettings, patchProfileSettings } from './profileStore'

// Widget layout for the customizable profile dashboard. The order + hidden set
// are personalization, so they live in localStorage for instant load and are
// mirrored (best-effort) into the user's cloud settings document under the
// `profileLayout` namespace so the arrangement follows them across devices.

export interface ProfileLayout {
  /** widget ids in render order */
  order: string[]
  /** widget ids the user has hidden */
  hidden: string[]
}

/** Canonical widget ids + their default order. Identity header is fixed and not
 *  part of this list. */
export const PROFILE_WIDGETS = [
  'about',
  'favorite-subject',
  'interests',
  'schedule',
  'stats',
  'achievements',
  'social-links',
] as const

export type ProfileWidgetId = (typeof PROFILE_WIDGETS)[number]

export const DEFAULT_LAYOUT: ProfileLayout = {
  order: [...PROFILE_WIDGETS],
  hidden: [],
}

const KEY = 'sg.profilelayout.v1'

/** Reconcile a stored layout against the current catalog: drop unknown ids and
 *  append any newly-added widgets so the dashboard never loses a widget. */
export function normalizeLayout(raw: unknown): ProfileLayout {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<ProfileLayout>
  const known = new Set<string>(PROFILE_WIDGETS)
  const order = Array.isArray(o.order) ? o.order.filter((id) => known.has(id)) : []
  for (const id of PROFILE_WIDGETS) if (!order.includes(id)) order.push(id)
  const hidden = Array.isArray(o.hidden) ? o.hidden.filter((id) => known.has(id)) : []
  return { order, hidden }
}

/** Load the layout: localStorage first (instant), else the cloud settings
 *  cache, else defaults. */
export function loadLayout(userId?: string): ProfileLayout {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalizeLayout(JSON.parse(raw))
  } catch {
    /* ignore */
  }
  if (userId) {
    const cloud = getCachedProfileSettings(userId).profileLayout
    if (cloud) return normalizeLayout(cloud)
  }
  return { ...DEFAULT_LAYOUT, order: [...DEFAULT_LAYOUT.order] }
}

/** Persist the layout to localStorage immediately + the cloud (debounced-ish,
 *  fire-and-forget). */
export function saveLayout(layout: ProfileLayout, userId?: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout))
  } catch {
    /* ignore */
  }
  if (userId) void patchProfileSettings(userId, { profileLayout: layout })
}
