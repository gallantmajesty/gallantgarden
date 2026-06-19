import { useMemo, useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { htmlToText, type BlueprintNode } from '../../lib/blueprint/types'

// Search every note (label + body text + tags), filter by tag chips, and save
// the current query+tags as a reusable "smart folder" (persisted per board).
const folderKey = (boardId: string) => `sf.blueprint.folders:${boardId}`
interface SmartFolder {
  name: string
  query: string
  tags: string[]
}

function loadFolders(boardId: string): SmartFolder[] {
  try {
    return JSON.parse(localStorage.getItem(folderKey(boardId)) ?? '[]') as SmartFolder[]
  } catch {
    return []
  }
}
function saveFolders(boardId: string, f: SmartFolder[]) {
  try {
    localStorage.setItem(folderKey(boardId), JSON.stringify(f))
  } catch {
    /* ignore */
  }
}

export function centerOnNode(node: BlueprintNode) {
  const vp = useBlueprint.getState().doc.viewport
  const cx = node.x + node.w / 2
  const cy = node.y + node.h / 2
  useBlueprint.getState().setViewport({ ...vp, x: window.innerWidth / 2 - cx * vp.zoom, y: window.innerHeight / 2 - cy * vp.zoom })
  useBlueprint.getState().select(node.id)
  useBlueprint.getState().flush()
}

export function SearchPanel({ onClose }: { onClose: () => void }) {
  const nodes = useBlueprint((s) => s.doc.nodes)
  const boardId = useBlueprint((s) => s.doc.id)
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [folders, setFolders] = useState<SmartFolder[]>(() => loadFolders(boardId))

  const allTags = useMemo(() => Array.from(new Set(nodes.flatMap((n) => n.tags))).sort(), [nodes])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return nodes
      .map((n) => ({ n, text: `${n.label ?? ''} ${htmlToText(n.html)}`.toLowerCase() }))
      .filter(({ n, text }) => {
        const matchQ = !q || text.includes(q) || n.tags.some((t) => t.toLowerCase().includes(q))
        const matchTags = activeTags.length === 0 || activeTags.every((t) => n.tags.includes(t))
        return matchQ && matchTags
      })
      .map(({ n }) => n)
  }, [nodes, query, activeTags])

  function toggleTag(t: string) {
    setActiveTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  }

  function saveFolder() {
    const name = prompt('Name this smart folder')?.trim()
    if (!name) return
    const next = [{ name, query, tags: activeTags }, ...folders].slice(0, 20)
    setFolders(next)
    saveFolders(boardId, next)
  }
  function applyFolder(f: SmartFolder) {
    setQuery(f.query)
    setActiveTags(f.tags)
  }
  function removeFolder(name: string) {
    const next = folders.filter((f) => f.name !== name)
    setFolders(next)
    saveFolders(boardId, next)
  }

  return (
    <div className="bp-panel bp-search bp-surface">
      <div className="bp-panel-head">
        <strong>Search notes</strong>
        <button className="bp-x" onClick={onClose}>✕</button>
      </div>
      <input className="sf-input" autoFocus placeholder="Search all notes…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {allTags.length > 0 && (
        <div className="bp-tagrow">
          {allTags.map((t) => (
            <button key={t} className={`bp-tagchip ${activeTags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>#{t}</button>
          ))}
        </div>
      )}

      <div className="bp-folderrow">
        <button className="sf-btn secondary tiny" onClick={saveFolder}>★ Save as smart folder</button>
        {folders.map((f) => (
          <span key={f.name} className="bp-folder">
            <button onClick={() => applyFolder(f)}>{f.name}</button>
            <button className="bp-folder-x" onClick={() => removeFolder(f.name)}>✕</button>
          </span>
        ))}
      </div>

      <div className="bp-results">
        {results.length === 0 && <div className="bp-empty">No matching notes.</div>}
        {results.map((n) => (
          <button key={n.id} className="bp-result" onClick={() => centerOnNode(n)}>
            <strong>{n.label || htmlToText(n.html).slice(0, 30) || 'Untitled'}</strong>
            <span>{htmlToText(n.html).slice(0, 64)}</span>
            {n.tags.length > 0 && <em>{n.tags.map((t) => '#' + t).join(' ')}</em>}
          </button>
        ))}
      </div>
    </div>
  )
}
