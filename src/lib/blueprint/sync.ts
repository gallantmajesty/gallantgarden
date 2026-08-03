// Hybrid persistence for Custom Blueprint.
//
// localStorage is the instant source of truth: every edit writes locally
// synchronously, so the editor never waits on the network. A debounced
// background task then mirrors the changed board to the InsForge `blueprints`
// table (the whole board as one JSONB doc). On load we hydrate from local
// immediately, then reconcile with the cloud per-board by `updatedAt`
// (last-write-wins) — pulling boards seen only in the cloud and pushing boards
// seen only locally. All network failures are swallowed and retried on the
// next change, so the feature works fully offline.

import { supabase } from '../supabase'
import type { BoardDoc, BoardMeta } from './types'

const PREFIX = 'sf.blueprint.v1'
const indexKey = (uid: string) => `${PREFIX}:${uid}`
const boardKey = (uid: string, boardId: string) => `${PREFIX}:${uid}:${boardId}`

interface LocalIndex {
  order: string[] // board ids, most-recent-first
  templates: { id: string; title: string; doc: BoardDoc }[]
}

// ---- local index ------------------------------------------------------------

function readIndex(uid: string): LocalIndex {
  try {
    const raw = localStorage.getItem(indexKey(uid))
    if (!raw) return { order: [], templates: [] }
    const parsed = JSON.parse(raw) as Partial<LocalIndex>
    return { order: parsed.order ?? [], templates: parsed.templates ?? [] }
  } catch {
    return { order: [], templates: [] }
  }
}

function writeIndex(uid: string, idx: LocalIndex): void {
  try {
    localStorage.setItem(indexKey(uid), JSON.stringify(idx))
  } catch {
    /* quota / blocked — ignore */
  }
}

// ---- local boards -----------------------------------------------------------

export function readBoardLocal(uid: string, boardId: string): BoardDoc | null {
  try {
    const raw = localStorage.getItem(boardKey(uid, boardId))
    return raw ? (JSON.parse(raw) as BoardDoc) : null
  } catch {
    return null
  }
}

export function listBoardsLocal(uid: string): BoardMeta[] {
  const idx = readIndex(uid)
  const metas: BoardMeta[] = []
  for (const id of idx.order) {
    const doc = readBoardLocal(uid, id)
    if (doc) metas.push({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt })
  }
  return metas
}

export function writeBoardLocal(uid: string, doc: BoardDoc): void {
  try {
    localStorage.setItem(boardKey(uid, doc.id), JSON.stringify(doc))
  } catch {
    /* ignore */
  }
  const idx = readIndex(uid)
  idx.order = [doc.id, ...idx.order.filter((x) => x !== doc.id)]
  writeIndex(uid, idx)
}

export function deleteBoardLocal(uid: string, boardId: string): void {
  try {
    localStorage.removeItem(boardKey(uid, boardId))
  } catch {
    /* ignore */
  }
  const idx = readIndex(uid)
  idx.order = idx.order.filter((x) => x !== boardId)
  writeIndex(uid, idx)
}

// ---- templates (local only) -------------------------------------------------

export function listTemplates(uid: string) {
  return readIndex(uid).templates
}

export function saveTemplateLocal(uid: string, title: string, doc: BoardDoc): void {
  const idx = readIndex(uid)
  idx.templates = [{ id: doc.id + '_tpl', title, doc }, ...idx.templates].slice(0, 40)
  writeIndex(uid, idx)
}

export function deleteTemplateLocal(uid: string, templateId: string): void {
  const idx = readIndex(uid)
  idx.templates = idx.templates.filter((t) => t.id !== templateId)
  writeIndex(uid, idx)
}

// ---- cloud (InsForge) -------------------------------------------------------

interface CloudRow {
  id: string
  owner_id: string
  title: string
  doc: BoardDoc
  updated_at: string
}

/** Upsert one board to the cloud (update-by-id, insert if it didn't exist). */
async function pushBoard(uid: string, doc: BoardDoc): Promise<void> {
  const payload = { title: doc.title, doc, updated_at: doc.updatedAt }
  const { data, error } = await supabase
    .from('blueprints')
    .update(payload)
    .eq('id', doc.id)
    .select('id')
  if (error) return // swallow — retried on next change
  if (!data || data.length === 0) {
    await supabase
      .from('blueprints')
      .insert([{ id: doc.id, owner_id: uid, ...payload }])
      .select('id')
  }
}

// Debounced push queue: coalesce rapid edits per board into one network write.
const pending = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 1500

export function queueCloudPush(uid: string, doc: BoardDoc): void {
  const existing = pending.get(doc.id)
  if (existing) clearTimeout(existing)
  pending.set(
    doc.id,
    setTimeout(() => {
      pending.delete(doc.id)
      void pushBoard(uid, doc)
    }, DEBOUNCE_MS),
  )
}

export async function deleteBoardCloud(boardId: string): Promise<void> {
  await supabase.from('blueprints').delete().eq('id', boardId)
}

// ---- media uploads ----------------------------------------------------------
// Reuse the existing public `note-images` bucket so pasted/uploaded images
// resolve to a stable public URL we can embed and export.
export async function uploadMedia(file: File): Promise<string | null> {
  const { data, error } = await supabase.storage.from('note-images').upload(file)
  if (error || !data) return null
  return data.url
}

/**
 * Reconcile local + cloud and return the merged board list. Local is hydrated
 * first by the caller; this fills in cloud-only boards and pushes local-only /
 * locally-newer boards. Returns the merged metas (most-recent-first).
 */
export async function reconcile(uid: string): Promise<BoardMeta[]> {
  const localMetas = listBoardsLocal(uid)
  const localById = new Map(localMetas.map((m) => [m.id, m]))

  const { data, error } = await supabase
    .from('blueprints')
    .select('id, title, doc, updated_at')
  if (error || !data) return localMetas // offline / error — local only

  const rows = data as CloudRow[]
  const cloudIds = new Set<string>()

  for (const row of rows) {
    cloudIds.add(row.id)
    const local = localById.get(row.id)
    const remoteNewer = !local || row.updated_at > local.updatedAt
    if (remoteNewer && row.doc) {
      // pull the cloud copy down to local
      writeBoardLocal(uid, { ...row.doc, id: row.id })
    } else if (local) {
      // local is newer (or same) — make sure the cloud has it
      const localDoc = readBoardLocal(uid, row.id)
      if (localDoc && localDoc.updatedAt > row.updated_at) queueCloudPush(uid, localDoc)
    }
  }

  // boards that exist only locally → push them up
  for (const meta of localMetas) {
    if (!cloudIds.has(meta.id)) {
      const doc = readBoardLocal(uid, meta.id)
      if (doc) queueCloudPush(uid, doc)
    }
  }

  return listBoardsLocal(uid)
}
