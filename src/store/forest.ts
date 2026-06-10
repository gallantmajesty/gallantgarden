import { create } from 'zustand'
import { insforge } from '../lib/insforge'
import {
  MAX_NOTES_PER_TREE,
  MAX_TREES,
  speciesFor,
  type StickyNote,
  type Tree,
} from '../lib/types'

interface ForestState {
  trees: Tree[]
  notesByTree: Record<string, StickyNote[]>
  loadingTrees: boolean
  loadingNotes: Record<string, boolean>
  error: string | null

  loadTrees: () => Promise<void>
  loadNotes: (treeId: string) => Promise<void>

  createTree: (ownerId: string, partial?: Partial<Tree>) => Promise<Tree | null>
  updateTree: (id: string, patch: Partial<Tree>) => Promise<void>
  deleteTree: (id: string) => Promise<void>

  createNote: (
    ownerId: string,
    treeId: string,
    partial?: Partial<StickyNote>,
  ) => Promise<StickyNote | null>
  updateNote: (id: string, patch: Partial<StickyNote>) => Promise<void>
  deleteNote: (id: string) => Promise<void>

  noteCount: (treeId: string) => number
}

/** Lay out a freshly created tree on a loose grid so the forest spreads out. */
function nextTreePosition(count: number): { x: number; z: number } {
  const perRow = 5
  const spacing = 7
  const row = Math.floor(count / perRow)
  const col = count % perRow
  const jitter = ((count * 37) % 10) / 10 - 0.5 // deterministic, no Math.random
  return {
    x: (col - (perRow - 1) / 2) * spacing + jitter * 2,
    z: -row * spacing - jitter * 2,
  }
}

export const useForest = create<ForestState>((set, get) => ({
  trees: [],
  notesByTree: {},
  loadingTrees: false,
  loadingNotes: {},
  error: null,

  noteCount: (treeId) => get().notesByTree[treeId]?.length ?? 0,

  loadTrees: async () => {
    set({ loadingTrees: true, error: null })
    const { data, error } = await insforge.database
      .from('trees')
      .select()
      .order('created_at', { ascending: true })
    if (error) {
      set({ loadingTrees: false, error: error.message })
      return
    }
    set({ trees: (data as Tree[]) ?? [], loadingTrees: false })
  },

  loadNotes: async (treeId) => {
    set((s) => ({ loadingNotes: { ...s.loadingNotes, [treeId]: true } }))
    const { data, error } = await insforge.database
      .from('sticky_notes')
      .select()
      .eq('tree_id', treeId)
      .order('created_at', { ascending: true })
    set((s) => ({
      loadingNotes: { ...s.loadingNotes, [treeId]: false },
      error: error ? error.message : s.error,
      notesByTree: error
        ? s.notesByTree
        : { ...s.notesByTree, [treeId]: (data as StickyNote[]) ?? [] },
    }))
  },

  createTree: async (ownerId, partial) => {
    const trees = get().trees
    if (trees.length >= MAX_TREES) {
      set({ error: `You can plant at most ${MAX_TREES} trees.` })
      return null
    }
    const pos = nextTreePosition(trees.length)
    const variant = partial?.variant ?? trees.length % 4
    const row = {
      owner_id: ownerId,
      title: partial?.title ?? 'New Tree',
      world: partial?.world ?? 'international',
      pos_x: partial?.pos_x ?? pos.x,
      pos_y: 0,
      pos_z: partial?.pos_z ?? pos.z,
      variant,
      crystal_color: partial?.crystal_color ?? speciesFor(variant).crystal,
    }
    const { data, error } = await insforge.database.from('trees').insert([row]).select()
    if (error || !data?.[0]) {
      set({ error: error?.message ?? 'Could not plant tree.' })
      return null
    }
    const tree = data[0] as Tree
    set((s) => ({ trees: [...s.trees, tree], notesByTree: { ...s.notesByTree, [tree.id]: [] } }))
    return tree
  },

  updateTree: async (id, patch) => {
    // optimistic
    set((s) => ({
      trees: s.trees.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
    const { error } = await insforge.database.from('trees').update(patch).eq('id', id)
    if (error) set({ error: error.message })
  },

  deleteTree: async (id) => {
    set((s) => {
      const rest = { ...s.notesByTree }
      delete rest[id]
      return { trees: s.trees.filter((t) => t.id !== id), notesByTree: rest }
    })
    const { error } = await insforge.database.from('trees').delete().eq('id', id)
    if (error) set({ error: error.message })
  },

  createNote: async (ownerId, treeId, partial) => {
    if (get().noteCount(treeId) >= MAX_NOTES_PER_TREE) {
      set({ error: `A tree holds at most ${MAX_NOTES_PER_TREE} notes.` })
      return null
    }
    const row = {
      owner_id: ownerId,
      tree_id: treeId,
      content_html: partial?.content_html ?? '<p>New note</p>',
      content_text: partial?.content_text ?? 'New note',
      color: partial?.color ?? '#ffe27a',
      bg_style: partial?.bg_style ?? 'solid',
      bg_value: partial?.bg_value ?? '',
      font_family: partial?.font_family ?? 'Inter',
      font_size: partial?.font_size ?? 16,
      font_color: partial?.font_color ?? '#1a1a1a',
      width: partial?.width ?? 150,
      anchor_id: partial?.anchor_id ?? 0,
      image_url: partial?.image_url ?? null,
      pos_x: partial?.pos_x ?? 0,
      pos_y: partial?.pos_y ?? 2.4,
      pos_z: partial?.pos_z ?? 0,
      rotation: partial?.rotation ?? 0,
      is_flashcard: partial?.is_flashcard ?? false,
      flashcard_back: partial?.flashcard_back ?? '',
    }
    const { data, error } = await insforge.database
      .from('sticky_notes')
      .insert([row])
      .select()
    if (error || !data?.[0]) {
      set({ error: error?.message ?? 'Could not create note.' })
      return null
    }
    const note = data[0] as StickyNote
    set((s) => ({
      notesByTree: {
        ...s.notesByTree,
        [treeId]: [...(s.notesByTree[treeId] ?? []), note],
      },
    }))
    return note
  },

  updateNote: async (id, patch) => {
    // optimistic update across whichever tree holds it
    set((s) => {
      const next: Record<string, StickyNote[]> = {}
      for (const [treeId, notes] of Object.entries(s.notesByTree)) {
        next[treeId] = notes.map((n) => (n.id === id ? { ...n, ...patch } : n))
      }
      return { notesByTree: next }
    })
    const { error } = await insforge.database.from('sticky_notes').update(patch).eq('id', id)
    if (error) set({ error: error.message })
  },

  deleteNote: async (id) => {
    set((s) => {
      const next: Record<string, StickyNote[]> = {}
      for (const [treeId, notes] of Object.entries(s.notesByTree)) {
        next[treeId] = notes.filter((n) => n.id !== id)
      }
      return { notesByTree: next }
    })
    const { error } = await insforge.database.from('sticky_notes').delete().eq('id', id)
    if (error) set({ error: error.message })
  },
}))
