import { create } from 'zustand'
import type { RealmKind } from '../lib/realm'

/** Which 3D world a realm renders. Defaults to the great Library; the Waterfall
 *  Realm is the second flagship world. */
export type RealmWorld = 'library' | 'waterfall'

/** The realm the player is currently inside (drives the label in the 3D scene,
 *  which world to render, and — later — which presence channel to join). `null` =
 *  not in a realm yet. */
export interface ActiveRealm {
  kind: RealmKind
  name: string
  roomId?: string // set for Global rooms
  world: RealmWorld
}

/** A private world the student created. Persisted locally so their custom realms
 *  survive a refresh. Architecture is ready to later gate creation behind a
 *  premium / ultimate tier — `createCustom` is the single choke-point for that. */
export interface CustomRealm {
  id: string
  name: string
  createdAt: string
}

interface RealmState {
  active: ActiveRealm | null
  custom: CustomRealm[]
  enterGlobal: (roomId: string, name: string) => void
  /** Drop into a flagship world (the Library hub default is 'library'; the
   *  Waterfall Realm is 'waterfall'). */
  enterFlagship: (world: RealmWorld, name: string) => void
  createCustom: (name: string) => CustomRealm
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

let counter = 0

export const useRealm = create<RealmState>((set, get) => ({
  active: null,
  custom: loadCustom(),

  enterGlobal: (roomId, name) => set({ active: { kind: 'global', name, roomId, world: 'library' } }),

  enterFlagship: (world, name) => set({ active: { kind: 'global', name, world } }),

  createCustom: (name) => {
    counter += 1
    const realm: CustomRealm = {
      id: `realm_${Date.now().toString(36)}_${counter.toString(36)}`,
      name: name.trim() || 'My Realm',
      createdAt: new Date().toISOString(),
    }
    const custom = [realm, ...get().custom]
    saveCustom(custom)
    set({ custom })
    return realm
  },

  enterCustom: (realm) => set({ active: { kind: 'custom', name: realm.name, roomId: realm.id, world: 'library' } }),

  leave: () => set({ active: null }),
}))
