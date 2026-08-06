import { create } from 'zustand'
import { sanitizeHtml } from '../lib/sanitize'
import type { Editor } from '@tiptap/react'
import {
  makeBoard,
  makeNode,
  nowIso,
  uid,
  MAX_VERSIONS,
  type BlueprintEdge,
  type BlueprintNode,
  type BoardDoc,
  type BoardMeta,
  type ConnectionType,
  type NoteStyle,
  type Port,
  type Pt,
  type YarnStyle,
} from '../lib/blueprint/types'
import {
  deleteBoardCloud,
  deleteBoardLocal,
  deleteTemplateLocal,
  listBoardsLocal,
  listTemplates,
  queueCloudPush,
  readBoardLocal,
  reconcile,
  saveTemplateLocal,
  writeBoardLocal,
} from '../lib/blueprint/sync'
import { awardBlueprint } from '../lib/xpEngine'
import { rankForTotalXp } from '../lib/ranks'
import { useProfile } from './profile'

const clone = <T,>(v: T): T => structuredClone(v)

interface FocusState {
  typeId: string | null // highlight every edge of this connection type + its nodes
}

interface BlueprintState {
  userId: string | null
  ready: boolean
  boards: BoardMeta[]
  doc: BoardDoc
  // viewport lives OUTSIDE `doc` so high-frequency pan/zoom never replaces the
  // whole board object (which would re-render every node/edge subscriber).
  viewport: Viewport

  // selection / focus
  selection: string[] // node ids
  selectedEdgeId: string | null
  focus: FocusState
  hoverNodeId: string | null // node under the cursor — traces its investigation path
  pendingFrom: string | null // armed source note id for an in-progress connection
  activeTypeId: string // connection type applied to newly-drawn strings
  activeYarnColor: string | null // yarn palette colour override (null = no override)
  activeYarnStyle: YarnStyle // yarn visual style applied to newly-drawn strings
  activeEditor: Editor | null // currently active TipTap editor (for inspector formatting controls)

  // undo/redo
  past: BoardDoc[]
  future: BoardDoc[]

  // ---- lifecycle ----
  hydrate: (userId: string) => Promise<void>
  newBoard: (title?: string) => void
  loadBoard: (id: string) => void
  deleteBoard: (id: string) => void
  setTitle: (title: string) => void

  // ---- yarn palette ----
  setActiveYarnColor: (hex: string | null) => void
  setActiveYarnStyle: (s: YarnStyle) => void

  // ---- nodes ----
  addNode: (partial?: Partial<BlueprintNode>) => BlueprintNode
  updateNode: (id: string, patch: Partial<BlueprintNode>) => void
  setNodeHtml: (id: string, html: string) => void
  updateNodeStyle: (id: string, patch: Partial<NoteStyle>) => void
  moveBy: (ids: string[], dx: number, dy: number) => void
  setNodeRect: (id: string, rect: Partial<Pick<BlueprintNode, 'x' | 'y' | 'w' | 'h'>>) => void
  deleteNodes: (ids: string[]) => void
  duplicateNodes: (ids: string[]) => void
  groupNodes: (ids: string[]) => void
  ungroupNodes: (ids: string[]) => void
  setLocked: (ids: string[], locked: boolean) => void

  // ---- edges ----
  addEdge: (from: string, fromPort: Port, to: string, toPort: Port, typeId: string, fromPt?: Pt | null, toPt?: Pt | null) => void
  updateEdge: (id: string, patch: Partial<BlueprintEdge>) => void
  deleteEdge: (id: string) => void

  // ---- connection types ----
  addConnectionType: (name: string) => string
  updateConnectionType: (id: string, patch: Partial<ConnectionType>) => void
  deleteConnectionType: (id: string) => void

  // ---- selection / focus / viewport ----
  select: (id: string | null, additive?: boolean) => void
  selectMany: (ids: string[]) => void
  clearSelection: () => void
  selectEdge: (id: string | null) => void
  setActiveType: (id: string) => void
  setFocus: (typeId: string | null) => void
  setPendingFrom: (id: string | null) => void
  /** cancel any in-progress / traced connection state */
  cancelConnect: () => void
  setHoverNode: (id: string | null) => void
  setActiveEditor: (editor: Editor | null) => void
  setViewport: (v: { x: number; y: number; zoom: number }) => void
  toggleSnap: () => void

  // ---- arrange / history / persistence ----
  autoArrange: () => void
  pushHistory: () => void
  flush: () => void
  undo: () => void
  redo: () => void

  // ---- versions / templates ----
  saveVersion: (label: string) => void
  restoreVersion: (id: string) => void
  deleteVersion: (id: string) => void
  templates: () => ReturnType<typeof listTemplates>
  saveTemplate: (title: string) => void
  applyTemplate: (id: string) => void
  deleteTemplate: (id: string) => void
}

export const useBlueprint = create<BlueprintState>((set, get) => {
  // ---- persistence helpers ----
  let lightTimer: ReturnType<typeof setTimeout> | null = null

  function persistNow(doc: BoardDoc) {
    const uidv = get().userId
    if (!uidv) return
    // keep the saved doc's viewport in sync with the live (separate) viewport
    const saved: BoardDoc = doc.viewport === get().viewport ? doc : { ...doc, viewport: get().viewport }
    writeBoardLocal(uidv, saved)
    queueCloudPush(uidv, saved)
  }

  // Apply a mutation, stamp updatedAt, persist immediately. For discrete edits.
  function apply(mutator: (d: BoardDoc) => BoardDoc) {
    set((s) => {
      const next = { ...mutator(s.doc), updatedAt: nowIso() }
      persistNow(next)
      return { doc: next }
    })
  }

  // Apply a high-frequency mutation (drag / zoom) in-memory now, persist on a
  // trailing debounce so we don't stringify the whole board every frame.
  function applyLight(mutator: (d: BoardDoc) => BoardDoc) {
    set((s) => ({ doc: { ...mutator(s.doc), updatedAt: nowIso() } }))
    if (lightTimer) clearTimeout(lightTimer)
    lightTimer = setTimeout(() => persistNow(get().doc), 300)
  }

  function pushHistory() {
    set((s) => ({ past: [...s.past, clone(s.doc)].slice(-50), future: [] }))
  }

  function mapNode(d: BoardDoc, id: string, fn: (n: BlueprintNode) => BlueprintNode): BoardDoc {
    return { ...d, nodes: d.nodes.map((n) => (n.id === id ? fn(n) : n)) }
  }

  return {
  userId: null,
  ready: false,
  boards: [],
  doc: makeBoard(),
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: [],
  selectedEdgeId: null,
  focus: { typeId: null },
  hoverNodeId: null,
  pendingFrom: null,
  activeTypeId: 'link',
  activeYarnColor: null,
  activeYarnStyle: 'solid',
  activeEditor: null,
  past: [],
  future: [],

    hydrate: async (userId) => {
      if (get().userId === userId && get().ready) return
      // hydrate from local instantly
      const localBoards = listBoardsLocal(userId)
      let doc: BoardDoc
      if (localBoards.length > 0) {
        doc = readBoardLocal(userId, localBoards[0].id) ?? makeBoard()
      } else {
        doc = makeBoard('My First Board')
        writeBoardLocal(userId, doc)
      }
      set({ userId, doc, viewport: doc.viewport, boards: listBoardsLocal(userId), ready: true, past: [], future: [] })
      queueCloudPush(userId, doc)
      // then reconcile with the cloud in the background
      try {
        const merged = await reconcile(userId)
        // if the active board got a newer cloud copy, refresh it
        const refreshed = readBoardLocal(userId, get().doc.id)
        set({
          boards: merged,
        doc: refreshed && refreshed.updatedAt > get().doc.updatedAt ? refreshed : get().doc,
        viewport: (refreshed && refreshed.updatedAt > get().doc.updatedAt ? refreshed : get().doc).viewport,
      })
      } catch {
        /* offline — local is fine */
      }
    },

newBoard: (title) => {
  const uidv = get().userId
  const doc = makeBoard(title || 'Untitled Board')
  if (uidv) {
    writeBoardLocal(uidv, doc)
    queueCloudPush(uidv, doc)
  }
  set({
    doc,
    viewport: doc.viewport,
    boards: uidv ? listBoardsLocal(uidv) : get().boards,
    selection: [],
    selectedEdgeId: null,
    focus: { typeId: null },
    activeYarnColor: null,
    activeYarnStyle: 'solid',
    past: [],
    future: [],
  })

  // Blueprint creation bonus (first ever + daily master)
  try {
    const { xp, premiumXp, rankXp } = useProfile.getState()
    const rankBase = rankXp > 0 ? rankXp : xp + premiumXp
    const currentRank = rankForTotalXp(rankBase)
    const result = awardBlueprint(xp, premiumXp, currentRank.id, rankBase)
    if (result.leaves > 0) {
      useProfile.getState().applyXp({ leaves: result.leaves })
    }
  } catch { /* ignore — bonus is best-effort */ }
},

  loadBoard: (id) => {
    const uidv = get().userId
    if (!uidv) return
    const doc = readBoardLocal(uidv, id)
    if (!doc) return
    set({
      doc,
      viewport: doc.viewport,
      boards: listBoardsLocal(uidv),
      selection: [],
      selectedEdgeId: null,
      focus: { typeId: null },
      activeYarnColor: null,
      activeYarnStyle: 'solid',
      past: [],
      future: [],
    })
  },

    deleteBoard: (id) => {
      const uidv = get().userId
      if (!uidv) return
      deleteBoardLocal(uidv, id)
      void deleteBoardCloud(id)
      const boards = listBoardsLocal(uidv)
      // if we deleted the active board, switch to another (or a fresh one)
      if (get().doc.id === id) {
        const next = boards.length ? readBoardLocal(uidv, boards[0].id) : null
        const doc = next ?? makeBoard('My First Board')
        if (!next) {
          writeBoardLocal(uidv, doc)
          queueCloudPush(uidv, doc)
        }
  set({ doc, viewport: doc.viewport, boards: listBoardsLocal(uidv), selection: [], selectedEdgeId: null, focus: { typeId: null }, activeYarnColor: null, activeYarnStyle: 'solid' })
  } else {
        set({ boards })
      }
    },

    setTitle: (title) => {
      apply((d) => ({ ...d, title }))
      const uidv = get().userId
      if (uidv) set({ boards: listBoardsLocal(uidv) })
    },

    // ---------- nodes ----------
    addNode: (partial) => {
      const vp = get().viewport
      // spawn near the centre of the current view
      const cx = (-vp.x + window.innerWidth / 2) / vp.zoom
      const cy = (-vp.y + window.innerHeight / 2) / vp.zoom
      const node = makeNode(cx, cy, partial)
      pushHistory()
      apply((d) => ({ ...d, nodes: [...d.nodes, node] }))
      set({ selection: [node.id], selectedEdgeId: null })
      return node
    },

    updateNode: (id, patch) => {
      pushHistory()
      apply((d) => mapNode(d, id, (n) => ({ ...n, ...patch, updatedAt: nowIso() })))
    },

    // Text edits stream in while typing — persist on a debounce (applyLight) and
    // skip per-keystroke history so undo granularity stays coarse but smooth.
    // Sanitize HTML at the storage layer to prevent stored XSS.
    setNodeHtml: (id, html) => {
      const clean = sanitizeHtml(html)
      applyLight((d) => mapNode(d, id, (n) => ({ ...n, html: clean, updatedAt: nowIso() })))
    },

    updateNodeStyle: (id, patch) => {
      pushHistory()
      apply((d) => mapNode(d, id, (n) => ({ ...n, style: { ...n.style, ...patch }, updatedAt: nowIso() })))
    },

    moveBy: (ids, dx, dy) => {
      const set_ = new Set(ids)
      applyLight((d) => ({
        ...d,
        nodes: d.nodes.map((n) => (set_.has(n.id) && !n.locked ? { ...n, x: n.x + dx, y: n.y + dy } : n)),
      }))
    },

    setNodeRect: (id, rect) => {
      applyLight((d) => mapNode(d, id, (n) => ({ ...n, ...rect })))
    },

    deleteNodes: (ids) => {
      const set_ = new Set(ids)
      pushHistory()
      apply((d) => ({
        ...d,
        nodes: d.nodes.filter((n) => !set_.has(n.id)),
        edges: d.edges.filter((e) => !set_.has(e.from) && !set_.has(e.to)),
      }))
      set({ selection: [], selectedEdgeId: null })
    },

    duplicateNodes: (ids) => {
      const set_ = new Set(ids)
      pushHistory()
      const idMap = new Map<string, string>()
      const newIds: string[] = []
      apply((d) => {
        const dupes = d.nodes
          .filter((n) => set_.has(n.id))
          .map((n) => {
            const nid = uid('node')
            idMap.set(n.id, nid)
            newIds.push(nid)
            return { ...clone(n), id: nid, x: n.x + 28, y: n.y + 28, createdAt: nowIso(), updatedAt: nowIso() }
          })
        // copy edges that are fully inside the duplicated set
        const dupEdges = d.edges
          .filter((e) => set_.has(e.from) && set_.has(e.to))
          .map((e) => ({ ...clone(e), id: uid('edge'), from: idMap.get(e.from)!, to: idMap.get(e.to)! }))
        return { ...d, nodes: [...d.nodes, ...dupes], edges: [...d.edges, ...dupEdges] }
      })
      set({ selection: newIds })
    },

    groupNodes: (ids) => {
      if (ids.length < 2) return
      const gid = uid('grp')
      const set_ = new Set(ids)
      pushHistory()
      apply((d) => ({ ...d, nodes: d.nodes.map((n) => (set_.has(n.id) ? { ...n, groupId: gid } : n)) }))
    },

    ungroupNodes: (ids) => {
      const set_ = new Set(ids)
      pushHistory()
      apply((d) => ({ ...d, nodes: d.nodes.map((n) => (set_.has(n.id) ? { ...n, groupId: null } : n)) }))
    },

    setLocked: (ids, locked) => {
      const set_ = new Set(ids)
      pushHistory()
      apply((d) => ({ ...d, nodes: d.nodes.map((n) => (set_.has(n.id) ? { ...n, locked } : n)) }))
    },

    // ---------- edges ----------
    addEdge: (from, fromPort, to, toPort, typeId, fromPt, toPt) => {
      if (from === to) return
      pushHistory()
      apply((d) => {
        // avoid duplicate identical edges
        if (d.edges.some((e) => e.from === from && e.to === to && e.typeId === typeId)) return d
  const st = get()
  const edge: BlueprintEdge = {
    id: uid('edge'),
    from,
    to,
    fromPort,
    toPort,
    typeId,
    ...(st.activeYarnColor ? { yarnColor: st.activeYarnColor } : {}),
    ...(st.activeYarnStyle !== 'solid' ? { yarnStyle: st.activeYarnStyle } : {}),
    ...(fromPt ? { fromPt } : {}),
    ...(toPt ? { toPt } : {}),
  }
  return { ...d, edges: [...d.edges, edge] }
      })
    },

    updateEdge: (id, patch) => {
      pushHistory()
      apply((d) => ({ ...d, edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
    },

    deleteEdge: (id) => {
      pushHistory()
      apply((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }))
      set({ selectedEdgeId: null })
    },

    // ---------- connection types ----------
    addConnectionType: (name) => {
      const id = uid('ct')
      pushHistory()
      apply((d) => ({
        ...d,
        connectionTypes: [
          ...d.connectionTypes,
          { id, name: name || 'Custom Type', color: '#9a6cff', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, builtin: false },
        ],
      }))
      return id
    },

    updateConnectionType: (id, patch) => {
      pushHistory()
      apply((d) => ({
        ...d,
        connectionTypes: d.connectionTypes.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }))
    },

    deleteConnectionType: (id) => {
      const d0 = get().doc
      const fallback = d0.connectionTypes.find((t) => t.id !== id)?.id ?? 'link'
      pushHistory()
      apply((d) => ({
        ...d,
        connectionTypes: d.connectionTypes.filter((t) => t.id !== id),
        // reassign any edges that used the deleted type
        edges: d.edges.map((e) => (e.typeId === id ? { ...e, typeId: fallback } : e)),
      }))
    },

    // ---------- selection / focus / viewport ----------
    select: (id, additive) =>
      set((s) => {
        if (id === null) return { selection: [], selectedEdgeId: null }
        if (additive) {
          return {
            selection: s.selection.includes(id)
              ? s.selection.filter((x) => x !== id)
              : [...s.selection, id],
            selectedEdgeId: null,
          }
        }
        return { selection: [id], selectedEdgeId: null }
      }),

    selectMany: (ids) => set({ selection: ids, selectedEdgeId: null }),
    clearSelection: () => set({ selection: [], selectedEdgeId: null }),
    selectEdge: (id) => set({ selectedEdgeId: id, selection: [] }),
    setActiveType: (id) => set({ activeTypeId: id }),
    setFocus: (typeId) => set((s) => ({ focus: { typeId: s.focus.typeId === typeId ? null : typeId } })),
    setPendingFrom: (id) => set({ pendingFrom: id }),
    cancelConnect: () => set({ pendingFrom: null, focus: { typeId: null } }),
    setHoverNode: (id) => set((s) => (s.hoverNodeId === id ? s : { hoverNodeId: id })),
    setActiveEditor: (editor) => set({ activeEditor: editor }),

  setViewport: (v) => {
    set({ viewport: v })
    // persist the new viewport (debounced) so a pan/zoom-only session survives reload
    if (lightTimer) clearTimeout(lightTimer)
    lightTimer = setTimeout(() => {
      const doc = get().doc
      persistNow(doc.viewport === v ? doc : { ...doc, viewport: v })
    }, 300)
  },
  toggleSnap: () => apply((d) => ({ ...d, snap: !d.snap })),

  // ---- yarn palette ----
  setActiveYarnColor: (hex) => set({ activeYarnColor: hex }),
  setActiveYarnStyle: (s) => set({ activeYarnStyle: s }),

  // ---------- arrange ----------
    autoArrange: () => {
      pushHistory()
      apply((d) => {
        // group nodes by connected component, then lay each component out in a
        // tidy grid block, stacking components down the canvas.
        const adj = new Map<string, Set<string>>()
        d.nodes.forEach((n) => adj.set(n.id, new Set()))
        d.edges.forEach((e) => {
          adj.get(e.from)?.add(e.to)
          adj.get(e.to)?.add(e.from)
        })
        const seen = new Set<string>()
        const components: string[][] = []
        for (const n of d.nodes) {
          if (seen.has(n.id)) continue
          const comp: string[] = []
          const stack = [n.id]
          while (stack.length) {
            const cur = stack.pop()!
            if (seen.has(cur)) continue
            seen.add(cur)
            comp.push(cur)
            adj.get(cur)?.forEach((m) => !seen.has(m) && stack.push(m))
          }
          components.push(comp)
        }
        const COL_W = 280
        const ROW_H = 190
        const pos = new Map<string, { x: number; y: number }>()
        let cursorY = 0
        for (const comp of components) {
          const cols = Math.max(1, Math.ceil(Math.sqrt(comp.length)))
          comp.forEach((id, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            pos.set(id, { x: col * COL_W, y: cursorY + row * ROW_H })
          })
          const rows = Math.ceil(comp.length / cols)
          cursorY += rows * ROW_H + ROW_H * 0.6
        }
        return { ...d, nodes: d.nodes.map((n) => ({ ...n, ...(pos.get(n.id) ?? {}) })) }
      })
    },

    pushHistory,
    flush: () => persistNow(get().doc),

    undo: () =>
      set((s) => {
        if (!s.past.length) return s
        const prev = s.past[s.past.length - 1]
        persistNow(prev)
        return { doc: prev, viewport: prev.viewport, past: s.past.slice(0, -1), future: [clone(s.doc), ...s.future].slice(0, 50) }
      }),

    redo: () =>
      set((s) => {
        if (!s.future.length) return s
        const next = s.future[0]
        persistNow(next)
        return { doc: next, viewport: next.viewport, future: s.future.slice(1), past: [...s.past, clone(s.doc)].slice(-50) }
      }),

    // ---------- versions ----------
    saveVersion: (label) => {
      apply((d) => ({
        ...d,
        versions: [
          { id: uid('ver'), label: label || `Snapshot ${d.versions.length + 1}`, at: nowIso(), nodes: clone(d.nodes), edges: clone(d.edges) },
          ...d.versions,
        ].slice(0, MAX_VERSIONS),
      }))
    },

    restoreVersion: (id) => {
      const v = get().doc.versions.find((x) => x.id === id)
      if (!v) return
      pushHistory()
      apply((d) => ({ ...d, nodes: clone(v.nodes), edges: clone(v.edges) }))
      set({ selection: [], selectedEdgeId: null })
    },

    deleteVersion: (id) => apply((d) => ({ ...d, versions: d.versions.filter((v) => v.id !== id) })),

    // ---------- templates ----------
    templates: () => {
      const uidv = get().userId
      return uidv ? listTemplates(uidv) : []
    },

    saveTemplate: (title) => {
      const uidv = get().userId
      if (!uidv) return
      saveTemplateLocal(uidv, title || get().doc.title, clone(get().doc))
    },

    applyTemplate: (id) => {
      const uidv = get().userId
      if (!uidv) return
      const tpl = listTemplates(uidv).find((t) => t.id === id)
      if (!tpl) return
      const doc = makeBoard(tpl.doc.title + ' (copy)', {
        nodes: clone(tpl.doc.nodes),
        edges: clone(tpl.doc.edges),
        connectionTypes: clone(tpl.doc.connectionTypes),
      })
      writeBoardLocal(uidv, doc)
      queueCloudPush(uidv, doc)
      set({ doc, viewport: doc.viewport, boards: listBoardsLocal(uidv), selection: [], selectedEdgeId: null, past: [], future: [] })
    },

    deleteTemplate: (id) => {
      const uidv = get().userId
      if (uidv) deleteTemplateLocal(uidv, id)
    },
  }
})
