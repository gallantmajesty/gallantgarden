import { create } from 'zustand'
import { GLOBAL_ROOMS, type RealmKind } from '../lib/realm'
import type { RealmVisibility } from '../lib/realms'

/** Which 3D world a realm renders. Defaults to the great Library; the Waterfall
 *  Realm is the second flagship world; the Train Station is the third. */
export type RealmWorld = 'library' | 'waterfall' | 'train-station'

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
 *  its invite code/link resolves on any device. We keep a LOCAL cache of the
 *  realms a user created or joined so the "Your realms" list renders instantly;
 *  the database is the source of truth. `code`/`visibility`/`ownerId` are absent
 *  only for legacy realms created before the server-backed system. */
export interface CustomRealm {
  id: string
  name: string
  code?: string
  visibility?: RealmVisibility
  ownerId?: string
  createdAt: string
}

interface RealmState {
  active: ActiveRealm | null
  custom: CustomRealm[]
  enterGlobal: (roomId: string, name: string) => void
  /** Drop into a flagship world (the Library hub default is 'library'; the
   *  Waterfall Realm is 'waterfall'). */
  enterFlagship: (world: RealmWorld, name: string) => void
  /** Upsert a realm into the local cache (after create or join). */
  rememberCustom: (realm: CustomRealm) => void
  /** Forget a realm locally (e.g. owner closed it). */
  forgetCustom: (id: string) => void
  enterCustom: (realm: CustomRealm) => void
  leave: () => void
}

const KEY = 'sf.realm.custom.v1'

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

export const useRealm = create<RealmState>((set, get) => ({
  active: null,
  custom: loadCustom(),

  enterGlobal: (roomId, name) => set({ active: { kind: 'global', name, roomId, world: worldForRoom(roomId) } }),

  enterFlagship: (world, name) => set({ active: { kind: 'global', name, world } }),

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

  enterCustom: (realm) => set({ active: { kind: 'custom', name: realm.name, roomId: realm.id, world: 'library' } }),

  leave: () => set({ active: null }),
}))
