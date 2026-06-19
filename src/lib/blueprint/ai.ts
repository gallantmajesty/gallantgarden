// "Smart" features for Custom Blueprint — implemented as pure on-device
// heuristics (no LLM / network). Each function takes the board doc and returns
// structured suggestions the AI panel renders and can act on. The signatures
// are deliberately simple so a real model can replace the bodies later.

import { htmlToText, type BoardDoc, type BlueprintNode } from './types'

const STOP = new Set(
  'the a an and or of to in on for with is are be by as at it this that these those from into your you we they i it its his her their our my me do does did has have had not no but if then than so such can will would should could may might also more most very just about over under above below them he she which who whom whose what when where why how all any each few many some other into out up down off then once here there'.split(
    ' ',
  ),
)

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

function nodeText(n: BlueprintNode): string {
  return `${n.label ?? ''} ${htmlToText(n.html)} ${n.tags.join(' ')}`
}

function tokenSet(n: BlueprintNode): Set<string> {
  return new Set(tokens(nodeText(n)))
}

/** Jaccard-ish similarity of two notes (shared keywords + shared tags). */
function similarity(a: BlueprintNode, b: BlueprintNode): number {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  ta.forEach((t) => tb.has(t) && (shared += 1))
  const union = new Set([...ta, ...tb]).size
  const tagBonus = a.tags.filter((t) => b.tags.includes(t)).length * 0.15
  return shared / union + tagBonus
}

export interface ConnectionSuggestion {
  fromId: string
  toId: string
  score: number
  reason: string
  fromLabel: string
  toLabel: string
}

function shortLabel(n: BlueprintNode): string {
  const t = (n.label || htmlToText(n.html)).trim()
  return t.length > 28 ? t.slice(0, 28) + '…' : t || 'Untitled note'
}

/** Suggest links between currently-unconnected notes that look related. */
export function suggestConnections(doc: BoardDoc, limit = 6): ConnectionSuggestion[] {
  const connected = new Set(doc.edges.map((e) => [e.from, e.to].sort().join('|')))
  const out: ConnectionSuggestion[] = []
  for (let i = 0; i < doc.nodes.length; i++) {
    for (let j = i + 1; j < doc.nodes.length; j++) {
      const a = doc.nodes[i]
      const b = doc.nodes[j]
      if (connected.has([a.id, b.id].sort().join('|'))) continue
      const score = similarity(a, b)
      if (score <= 0.06) continue
      const sharedTags = a.tags.filter((t) => b.tags.includes(t))
      out.push({
        fromId: a.id,
        toId: b.id,
        score,
        reason: sharedTags.length ? `Shared tags: ${sharedTags.map((t) => '#' + t).join(' ')}` : 'Overlapping keywords',
        fromLabel: shortLabel(a),
        toLabel: shortLabel(b),
      })
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, limit)
}

export interface Cluster {
  name: string
  nodeIds: string[]
}

/** Group notes into clusters by their dominant shared tag, else by component. */
export function detectClusters(doc: BoardDoc): Cluster[] {
  const byTag = new Map<string, string[]>()
  const untagged: string[] = []
  for (const n of doc.nodes) {
    if (n.tags.length) {
      const tag = n.tags[0]
      byTag.set(tag, [...(byTag.get(tag) ?? []), n.id])
    } else {
      untagged.push(n.id)
    }
  }
  const clusters: Cluster[] = [...byTag.entries()]
    .filter(([, ids]) => ids.length >= 2)
    .map(([tag, ids]) => ({ name: `#${tag}`, nodeIds: ids }))
  if (untagged.length >= 2) clusters.push({ name: 'Unsorted', nodeIds: untagged })
  return clusters
}

/** A short extractive summary of the whole board (or a selection). */
export function summarize(doc: BoardDoc, nodeIds?: string[]): string {
  const pool = nodeIds?.length ? doc.nodes.filter((n) => nodeIds.includes(n.id)) : doc.nodes
  if (pool.length === 0) return 'This blueprint is empty — add a few notes to summarise.'
  const freq = new Map<string, number>()
  pool.forEach((n) => tokens(nodeText(n)).forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1)))
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w)
  const titles = pool.slice(0, 4).map(shortLabel)
  return `${pool.length} notes, ${doc.edges.length} connections. Key themes: ${top.join(', ') || '—'}. ` +
    `Includes: ${titles.join('; ')}${pool.length > 4 ? '…' : ''}.`
}

export interface WeakArea {
  nodeId: string
  label: string
  reason: string
}

/** Notes that look like weak spots: tagged weak, on a Weakness string, or isolated. */
export function weakAreas(doc: BoardDoc): WeakArea[] {
  const degree = new Map<string, number>()
  doc.nodes.forEach((n) => degree.set(n.id, 0))
  doc.edges.forEach((e) => {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  })
  const onWeakness = new Set<string>()
  doc.edges.filter((e) => e.typeId === 'weakness').forEach((e) => {
    onWeakness.add(e.from)
    onWeakness.add(e.to)
  })
  const out: WeakArea[] = []
  for (const n of doc.nodes) {
    const tagged = n.tags.some((t) => /weak|hard|struggle|review|todo/i.test(t))
    if (onWeakness.has(n.id)) out.push({ nodeId: n.id, label: shortLabel(n), reason: 'On a Weakness link' })
    else if (tagged) out.push({ nodeId: n.id, label: shortLabel(n), reason: 'Tagged as weak / to-review' })
    else if ((degree.get(n.id) ?? 0) === 0) out.push({ nodeId: n.id, label: shortLabel(n), reason: 'Isolated — not connected to anything' })
  }
  return out.slice(0, 12)
}

/** A suggested revision order: weak spots first, then by connection density. */
export function revisionPath(doc: BoardDoc): { nodeId: string; label: string }[] {
  const weak = new Set(weakAreas(doc).map((w) => w.nodeId))
  const degree = new Map<string, number>()
  doc.edges.forEach((e) => {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  })
  return [...doc.nodes]
    .sort((a, b) => {
      const wa = weak.has(a.id) ? 1 : 0
      const wb = weak.has(b.id) ? 1 : 0
      if (wa !== wb) return wb - wa
      return (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
    })
    .slice(0, 12)
    .map((n) => ({ nodeId: n.id, label: shortLabel(n) }))
}
