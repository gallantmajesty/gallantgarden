import { create } from 'zustand'

/**
 * The seated "study desk" contents — daily goals/tasks, scratch notes and the
 * panel's open/collapsed/minimised view. This lives in its own persisted store
 * (NOT in the seated panel's local React state) so that everything survives:
 *   • standing up and sitting back down (the panel unmounts in between), and
 *   • a full page refresh.
 * Nothing here is ever cleared on stand-up.
 */
export interface Goal {
  t: string
  done: boolean
}

export type DeskView = 'open' | 'collapsed' | 'min'

interface DeskState {
  goals: Goal[]
  note: string
  draft: string
  view: DeskView
  addGoal: (text: string) => void
  toggleGoal: (index: number) => void
  removeGoal: (index: number) => void
  setNote: (note: string) => void
  setDraft: (draft: string) => void
  setView: (view: DeskView) => void
}

const KEY = 'sg.desk.v1'

interface Persisted {
  goals: Goal[]
  note: string
  view: DeskView
}

function load(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {}
  } catch {
    return {}
  }
}

export const useDesk = create<DeskState>((set, get) => {
  const saved = load()
  const persist = () => {
    const { goals, note, view } = get()
    try {
      localStorage.setItem(KEY, JSON.stringify({ goals, note, view } satisfies Persisted))
    } catch {
      /* storage full / blocked — ignore */
    }
  }

  return {
    goals: saved.goals ?? [],
    note: saved.note ?? '',
    draft: '', // in-progress text isn't persisted; the committed goals are
    view: saved.view ?? 'open',

    addGoal: (text) => {
      const t = text.trim()
      if (!t) return
      set((s) => ({ goals: [...s.goals, { t, done: false }], draft: '' }))
      persist()
    },
    toggleGoal: (index) => {
      set((s) => ({ goals: s.goals.map((g, i) => (i === index ? { ...g, done: !g.done } : g)) }))
      persist()
    },
    removeGoal: (index) => {
      set((s) => ({ goals: s.goals.filter((_, i) => i !== index) }))
      persist()
    },
    setNote: (note) => {
      set({ note })
      persist()
    },
    setDraft: (draft) => set({ draft }),
    setView: (view) => {
      set({ view })
      persist()
    },
  }
})
