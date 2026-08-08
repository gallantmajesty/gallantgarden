// Minimal Blueprint store for the embed-based editor.
// The board is stored as native draw.io mxGraph XML; draw.io is the source of
// truth for the diagram, this store just persists it + the title locally.

import { create } from 'zustand'

const KEY = (uid: string) => `fl.blueprint.v3.${uid}`

interface State {
  userId: string | null
  ready: boolean
  id: string
  title: string
  xml: string
  hydrate: (uid: string) => void
  setTitle: (t: string) => void
  setXml: (xml: string) => void
}

const BLANK = `<mxfile host="focuslily"><diagram name="Board" id="b1"><mxGraphModel dx="1000" dy="600" grid="1" gridSize="24" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`

export const useBlueprint = create<State>((set, get) => ({
  userId: null,
  ready: false,
  id: 'b1',
  title: 'Untitled Board',
  xml: BLANK,

  hydrate: (uid) => {
    if (get().userId === uid && get().ready) return
    let saved: { id: string; title: string; xml: string } | null = null
    try {
      const raw = localStorage.getItem(KEY(uid))
      if (raw) saved = JSON.parse(raw)
    } catch {}
    const board = saved ?? { id: 'b1', title: 'Untitled Board', xml: BLANK }
    set({ userId: uid, ready: true, id: board.id, title: board.title, xml: board.xml })
  },

  setTitle: (t) => {
    set({ title: t })
    const uid = get().userId
    if (uid) localStorage.setItem(KEY(uid), JSON.stringify({ id: get().id, title: t, xml: get().xml }))
  },

  setXml: (xml) => {
    set({ xml })
    const uid = get().userId
    if (uid) localStorage.setItem(KEY(uid), JSON.stringify({ id: get().id, title: get().title, xml }))
  },
}))
