import { create } from 'zustand'
import { GLOBAL_ROOMS, type RealmKind } from '../lib/realm'
import type { RealmVisibility } from '../lib/realms'

/** Which 3D world a realm renders. Defaults to the great Library; the Train
// Station is the second flagship world. UK Cafe is the third flagship world. */
export type RealmWorld = 'library' | 'train-station' | 'uk-cafe'

/** Which world a global room renders, looked up from its definition. Train-station
 *  rooms (concourse + platforms) render the Train Station; everything else the
 *  Library. Fixes the bug where every global room was forced to 'library', which
 *  sent the Train rooms into the Library scene. */
function worldForRoom(roomId: string): RealmWorld {
  return GLOBAL_ROOMS.find((r) => r.id === roomId)?.world ?? 'library'
}

/** The realm the player is currently inside (drives the label in the 3D scene,
 *  which world to render, and — later — which presence channel to join). `null` =
 *  not in a realm yet. */
export interface ActiveRealm {
  kind: RealmKind
  name: string
  roomId?: string // set for Global rooms
  world: RealmWorld
}

/** A custom world, persisted server-side (src/lib/realms.ts → `realms` table) so
 *  its invite code resolves on any device. We keep a LOCAL cache of the
 *  realms a user created or joined so the "Your realms" list renders instantly;
 *  the database is the source of truth. */
export interface CustomRealm {
  id: string
  name: string
  code?: string
  visibility?: RealmVisibility
  ownerId?: string
  createdAt: string
  password?: string
  expiresAt?: string
}

interface RealmState {
  active: ActiveRealm | null
  custom: CustomRealm[]
  enterGlobal: (roomId: string, name: string) => void
  /** Drop into a flagship world (the Library hub default is 'library'). */
  enterFlagship: (world: RealmWorld, name: string) => void
  /** Upsert a realm into the local cache (after create or join). */
  rememberCustom: (realm: CustomRealm) => void
  /** Forget a realm locally (e.g. owner closed it). */
  forgetCustom: (id: string) => void
  enterCustom: (realm: CustomRealm) => void
  leave: () => void
}

const KEY = 'sf.realm.custom.v1'
const KEY_ACTIVE = 'sf.realm.active.v1'

function loadCustom(): CustomRealm[] {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? (JSON.parse(raw) as CustomRealm[]) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveCustom(list: CustomRealm[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

/** The active realm survives a page refresh (sessionStorage — same tab only).
 *  The NPC seat picker and the library scene derive everything from this, so a
 *  reload must NOT drop the player's room: refresh = keep your room, new tab =
 *  fresh start. */
function loadActive(): ActiveRealm | null {
  try {
    const raw = sessionStorage.getItem(KEY_ACTIVE)
    if (!raw) return null
    const a = JSON.parse(raw) as ActiveRealm | null
    if (!a || typeof a.kind !== 'string' || typeof a.name !== 'string' || typeof a.world !== 'string') return null
    return a
  } catch {
    return null
  }
}

function saveActive(active: ActiveRealm | null) {
  try {
    if (active) sessionStorage.setItem(KEY_ACTIVE, JSON.stringify(active))
    else sessionStorage.removeItem(KEY_ACTIVE)
  } catch {
    /* ignore */
  }
}

export const useRealm = create<RealmState>((set, get) => ({
  active: loadActive(),
  custom: loadCustom(),

  enterGlobal: (roomId, name) => {
    const active = { kind: 'global' as const, name, roomId, world: worldForRoom(roomId) }
    saveActive(active)
    set({ active })
  },

  enterFlagship: (world, name) => {
    const active = { kind: 'global' as const, name, world }
    saveActive(active)
    set({ active })
  },

  rememberCustom: (realm) => {
    const custom = [realm, ...get().custom.filter((r) => r.id !== realm.id)]
    saveCustom(custom)
    set({ custom })
  },

  forgetCustom: (id) => {
    const custom = get().custom.filter((r) => r.id !== id)
    saveCustom(custom)
    set({ custom })
  },

  enterCustom: (realm) => {
    const active = { kind: 'custom' as const, name: realm.name, roomId: realm.id, world: 'library' as const }
    saveActive(active)
    set({ active })
  },

  leave: () => {
    saveActive(null)
    set({ active: null })
  },
}))
