import { create } from 'zustand'

export interface Board {
  id: string
  title: string
  xml: string
  createdAt: string
  updatedAt: string
}

interface BlueprintState {
  userId: string | null
  ready: boolean
  boards: Board[]
  activeId: string
  sidebarOpen: boolean
  savedIndicator: 'saved' | 'unsaved' | 'saving'

  hydrate: (uid: string) => void
  createBoard: (title?: string, xml?: string) => string
  deleteBoard: (id: string) => void
  renameBoard: (id: string, title: string) => void
  duplicateBoard: (id: string) => void
  switchBoard: (id: string) => void
  setActiveXml: (xml: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  markSaved: () => void
  markUnsaved: () => void
  markSaving: () => void
  activeBoard: () => Board | undefined
}

const STORAGE_KEY = (uid: string) => `fl.blueprint.v4.${uid}`

const BLANK_XML = `<mxfile host="focuslily"><diagram name="Page-1" id="page1"><mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`

function newId() {
  return `board_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function newBoard(title = 'Untitled Board', xml = BLANK_XML): Board {
  const now = new Date().toISOString()
  return { id: newId(), title, xml, createdAt: now, updatedAt: now }
}

function persist(uid: string, boards: Board[], activeId: string) {
  try {
    localStorage.setItem(STORAGE_KEY(uid), JSON.stringify({ boards, activeId }))
  } catch {}
}

export const useBlueprint = create<BlueprintState>((set, get) => ({
  userId: null,
  ready: false,
  boards: [],
  activeId: '',
  sidebarOpen: true,
  savedIndicator: 'saved',

  hydrate: (uid) => {
    if (get().userId === uid && get().ready) return
    let boards: Board[] = []
    let activeId = ''
    try {
      const raw = localStorage.getItem(STORAGE_KEY(uid))
      if (raw) {
        const parsed = JSON.parse(raw)
        boards = parsed.boards ?? []
        activeId = parsed.activeId ?? ''
      }
    } catch {}
    if (boards.length === 0) {
      const first = newBoard('My First Board')
      boards = [first]
      activeId = first.id
    }
    if (!boards.find((b) => b.id === activeId)) {
      activeId = boards[0].id
    }
    set({ userId: uid, ready: true, boards, activeId, savedIndicator: 'saved' })
  },

  createBoard: (title = 'Untitled Board', xml = BLANK_XML) => {
    const board = newBoard(title, xml)
    set((s) => {
      const boards = [...s.boards, board]
      if (s.userId) persist(s.userId, boards, board.id)
      return { boards, activeId: board.id, savedIndicator: 'saved' }
    })
    return board.id
  },

  deleteBoard: (id) => {
    set((s) => {
      if (s.boards.length <= 1) return s
      const boards = s.boards.filter((b) => b.id !== id)
      const activeId = s.activeId === id ? boards[boards.length - 1].id : s.activeId
      if (s.userId) persist(s.userId, boards, activeId)
      return { boards, activeId, savedIndicator: 'saved' }
    })
  },

  renameBoard: (id, title) => {
    set((s) => {
      const boards = s.boards.map((b) =>
        b.id === id ? { ...b, title, updatedAt: new Date().toISOString() } : b,
      )
      if (s.userId) persist(s.userId, boards, s.activeId)
      return { boards }
    })
  },

  duplicateBoard: (id) => {
    set((s) => {
      const src = s.boards.find((b) => b.id === id)
      if (!src) return s
      const copy = newBoard(`${src.title} (copy)`, src.xml)
      const idx = s.boards.findIndex((b) => b.id === id)
      const boards = [...s.boards.slice(0, idx + 1), copy, ...s.boards.slice(idx + 1)]
      if (s.userId) persist(s.userId, boards, copy.id)
      return { boards, activeId: copy.id, savedIndicator: 'saved' }
    })
  },

  switchBoard: (id) => {
    set((s) => {
      if (s.userId) persist(s.userId, s.boards, id)
      return { activeId: id, savedIndicator: 'saved' }
    })
  },

  setActiveXml: (xml) => {
    set((s) => {
      const boards = s.boards.map((b) =>
        b.id === s.activeId ? { ...b, xml, updatedAt: new Date().toISOString() } : b,
      )
      if (s.userId) persist(s.userId, boards, s.activeId)
      return { boards, savedIndicator: 'saved' }
    })
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  markSaved: () => set({ savedIndicator: 'saved' }),
  markUnsaved: () => set({ savedIndicator: 'unsaved' }),
  markSaving: () => set({ savedIndicator: 'saving' }),
  activeBoard: () => {
    const s = get()
    return s.boards.find((b) => b.id === s.activeId)
  },
}))

export { BLANK_XML }
