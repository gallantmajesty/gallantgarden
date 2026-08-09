import { create } from 'zustand'

export interface NpcProfileData {
  name: string
  rank: string
  country: string | null
  characterId?: string
  studyTopic?: string
  totalXp?: number
  sessionsCompleted?: number
  streak?: number
  bio?: string
  joinDate?: string
  status: 'studying' | 'on-break' | 'offline'
  /** banner id (lib/banners) shown on the compact card strip */
  banner?: string
  /** logo id (lib/banners) shown on the compact card */
  logo?: string
  /** True when this is a live player (their More Info card), not an NPC. */
  isUser?: boolean
}

interface NpcProfileState {
  profile: NpcProfileData | null
  show: (p: NpcProfileData) => void
  hide: () => void
}

export const useNpcProfile = create<NpcProfileState>((set) => ({
  profile: null,
  show: (p) => set({ profile: p }),
  hide: () => set({ profile: null }),
}))
