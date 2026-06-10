import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useForest } from '../store/forest'
import { insforge } from '../lib/insforge'
import { MAX_NOTES_PER_TREE, MAX_TREES, type StickyNote } from '../lib/types'
import { ForestScene } from '../three/ForestScene'
import { NoteEditor } from '../components/NoteEditor'
import { NoteReader } from '../components/NoteReader'
import { LoadingVeil } from '../components/LoadingVeil'
import './Forest.css'

type SearchHit = { id: string; tree_id: string; content_text: string }

const CRYSTAL_COLORS = ['#8a6cff', '#ff6f91', '#ffba49', '#4fd1c5', '#5b9bd5', '#a0e75a', '#ff5e5e']

export function Forest() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    trees,
    notesByTree,
    loadingTrees,
    loadTrees,
    loadNotes,
    createTree,
    updateTree,
    deleteTree,
    createNote,
    updateNote,
    deleteNote,
    noteCount,
  } = useForest()

  const [focusedTreeId, setFocusedTreeId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [openNote, setOpenNote] = useState<StickyNote | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])

  useEffect(() => {
    void loadTrees()
  }, [loadTrees])

  // Lazy-load notes for whichever tree is focused.
  useEffect(() => {
    if (focusedTreeId && !notesByTree[focusedTreeId]) void loadNotes(focusedTreeId)
  }, [focusedTreeId, notesByTree, loadNotes])

  const focusedTree = useMemo(
    () => trees.find((t) => t.id === focusedTreeId) ?? null,
    [trees, focusedTreeId],
  )
  const focusedNotes = focusedTreeId ? notesByTree[focusedTreeId] ?? [] : []

  async function handleAddTree() {
    if (!user) return
    const t = await createTree(user.id)
    if (t) {
      setFocusedTreeId(t.id)
      setEditing(true)
    }
  }

  async function handleAddNote() {
    if (!user || !focusedTreeId) return
    const count = noteCount(focusedTreeId)
    // spread new notes across branch anchors so they don't stack
    const note = await createNote(user.id, focusedTreeId, {
      anchor_id: count % 8,
      rotation: ((count * 13) % 9) - 4,
    })
    if (note) {
      setEditing(true)
      setOpenNote(note)
    }
  }

  function openTreeRename() {
    if (!focusedTree) return
    setRenameValue(focusedTree.title)
    setRenaming(true)
  }

  async function runSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) {
      setHits([])
      return
    }
    const { data } = await insforge.database
      .from('sticky_notes')
      .select('id, tree_id, content_text')
      .ilike('content_text', `%${q.trim()}%`)
      .limit(30)
    setHits((data as SearchHit[]) ?? [])
  }

  async function gotoHit(hit: SearchHit) {
    setSearchOpen(false)
    setFocusedTreeId(hit.tree_id)
    if (!notesByTree[hit.tree_id]) await loadNotes(hit.tree_id)
    const found = useForest.getState().notesByTree[hit.tree_id]?.find((n) => n.id === hit.id)
    if (found) setOpenNote(found)
  }

  // keep the open note in sync with store edits
  const liveOpenNote = openNote
    ? focusedNotes.find((n) => n.id === openNote.id) ?? openNote
    : null

  if (loadingTrees && trees.length === 0) return <LoadingVeil label="Growing your forest…" />

  return (
    <div className="forest-root">
      <ForestScene
        trees={trees}
        notesByTree={notesByTree}
        focusedTreeId={focusedTreeId}
        editing={editing}
        onSelectTree={setFocusedTreeId}
        onOpenNote={(n) => setOpenNote(n)}
        onReanchorNote={(id, anchorId) => updateNote(id, { anchor_id: anchorId })}
      />

      {/* top-left: back + search */}
      <div className="forest-topleft">
        <button className="sf-btn secondary" onClick={() => navigate('/sticky')}>← Back</button>
        <button className="sf-btn secondary" onClick={() => setSearchOpen((v) => !v)}>
          Search
        </button>
      </div>

      {/* top-right: tree count */}
      <div className="forest-topright">
        <span className="sf-pill">{trees.length}/{MAX_TREES} trees</span>
      </div>

      {/* bottom toolbar */}
      <div className="forest-toolbar sf-panel">
        <button className="sf-btn" onClick={handleAddTree} disabled={trees.length >= MAX_TREES}>
          + Plant Tree
        </button>

        <div className="forest-divider" />

        {focusedTree ? (
          <>
            <div className="forest-treeinfo">
              <button className="forest-treename" onClick={openTreeRename} title="Rename">
                {focusedTree.title}
              </button>
              <span className="forest-treesub">
                {noteCount(focusedTree.id)}/{MAX_NOTES_PER_TREE} notes
              </span>
            </div>

            <div className="mode-toggle">
              <button className={!editing ? 'on' : ''} onClick={() => setEditing(false)}>
                Explore
              </button>
              <button className={editing ? 'on' : ''} onClick={() => setEditing(true)}>
                Edit
              </button>
            </div>

            <button
              className="sf-btn"
              onClick={handleAddNote}
              disabled={noteCount(focusedTree.id) >= MAX_NOTES_PER_TREE}
            >
              + Note
            </button>
            <button
              className="sf-btn secondary danger"
              onClick={() => {
                if (confirm(`Delete "${focusedTree.title}" and all its notes?`)) {
                  deleteTree(focusedTree.id)
                  setFocusedTreeId(null)
                }
              }}
            >
              Cut Down
            </button>
          </>
        ) : (
          <span className="forest-hint">
            {trees.length === 0
              ? 'Plant your first tree to begin.'
              : 'Click a tree to enter it.'}
          </span>
        )}
      </div>

      {editing && focusedTree && (
        <div className="forest-edit-hint">Drag a note sideways to move it to another branch · Click to edit</div>
      )}
      {!focusedTree && (
        <div className="forest-edit-hint kingdom">Drag to pan · Scroll to zoom · Right-drag to rotate · Click a tree to enter</div>
      )}

      {/* rename modal */}
      {renaming && focusedTree && (
        <div className="ne-overlay" onClick={() => setRenaming(false)}>
          <div className="sf-panel rename-box" onClick={(e) => e.stopPropagation()}>
            <span className="sf-label">Tree name</span>
            <input
              className="sf-input"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateTree(focusedTree.id, { title: renameValue.trim() || 'Tree' })
                  setRenaming(false)
                }
              }}
            />

            <span className="sf-label" style={{ marginTop: 14 }}>Crystal color</span>
            <div className="crystal-swatches">
              {CRYSTAL_COLORS.map((c) => (
                <button
                  key={c}
                  className={`crystal-swatch ${focusedTree.crystal_color === c ? 'sel' : ''}`}
                  style={{ background: c, boxShadow: `0 0 12px ${c}` }}
                  onClick={() => updateTree(focusedTree.id, { crystal_color: c })}
                />
              ))}
              <label className="crystal-swatch custom" title="Custom">
                <input
                  type="color"
                  value={focusedTree.crystal_color}
                  onChange={(e) => updateTree(focusedTree.id, { crystal_color: e.target.value })}
                />
                +
              </label>
            </div>

            <div className="rename-actions">
              <button className="sf-btn secondary" onClick={() => setRenaming(false)}>Cancel</button>
              <button
                className="sf-btn"
                onClick={() => {
                  updateTree(focusedTree.id, { title: renameValue.trim() || 'Tree' })
                  setRenaming(false)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* search panel */}
      {searchOpen && (
        <div className="forest-search sf-panel">
          <input
            className="sf-input"
            autoFocus
            placeholder="Search all notes…"
            value={query}
            onChange={(e) => runSearch(e.target.value)}
          />
          <div className="forest-search-results">
            {query.trim().length >= 2 && hits.length === 0 && (
              <div className="forest-search-empty">No matching notes.</div>
            )}
            {hits.map((h) => {
              const tree = trees.find((t) => t.id === h.tree_id)
              return (
                <button key={h.id} className="forest-search-hit" onClick={() => gotoHit(h)}>
                  <strong>{tree?.title ?? 'Tree'}</strong>
                  <span>{h.content_text.slice(0, 70) || '(empty note)'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* note editor / reader */}
      {liveOpenNote && editing && (
        <NoteEditor
          note={liveOpenNote}
          onPatch={(patch) => updateNote(liveOpenNote.id, patch)}
          onDelete={() => {
            deleteNote(liveOpenNote.id)
            setOpenNote(null)
          }}
          onClose={() => setOpenNote(null)}
        />
      )}
      {liveOpenNote && !editing && (
        <NoteReader note={liveOpenNote} onClose={() => setOpenNote(null)} />
      )}
    </div>
  )
}
