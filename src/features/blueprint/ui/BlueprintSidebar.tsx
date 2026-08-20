import { useState, useRef, useEffect, useCallback } from 'react'
import { useBlueprint, type Board } from '../store'

const BOARD_COLORS = [
  '#5b7cfa', '#f472b6', '#34d399', '#fb923c',
  '#a78bfa', '#38bdf8', '#fbbf24', '#f87171',
]

function boardColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return BOARD_COLORS[h % BOARD_COLORS.length]
}

function formatDate(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface CtxMenuState {
  boardId: string
  x: number
  y: number
}

export function BlueprintSidebar() {
  const boards = useBlueprint((s) => s.boards)
  const activeId = useBlueprint((s) => s.activeId)
  const sidebarOpen = useBlueprint((s) => s.sidebarOpen)
  const switchBoard = useBlueprint((s) => s.switchBoard)
  const createBoard = useBlueprint((s) => s.createBoard)
  const deleteBoard = useBlueprint((s) => s.deleteBoard)
  const renameBoard = useBlueprint((s) => s.renameBoard)
  const duplicateBoard = useBlueprint((s) => s.duplicateBoard)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [ctx, setCtx] = useState<CtxMenuState | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [renamingId])

  // Close context menu on outside click
  useEffect(() => {
    if (!ctx) return
    const close = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.fl-ctx-menu')) setCtx(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [ctx])

  const startRename = useCallback((board: Board) => {
    setCtx(null)
    setRenamingId(board.id)
    setRenameVal(board.title)
  }, [])

  const commitRename = useCallback(() => {
    if (renamingId && renameVal.trim()) renameBoard(renamingId, renameVal.trim())
    setRenamingId(null)
  }, [renamingId, renameVal, renameBoard])

  const openCtx = useCallback((e: React.MouseEvent, board: Board) => {
    e.preventDefault()
    e.stopPropagation()
    setCtx({ boardId: board.id, x: e.clientX, y: e.clientY })
  }, [])

  return (
    <aside className={`fl-sidebar${sidebarOpen ? '' : ' closed'}`}>
      <div className="fl-sidebar-header">
        <span className="fl-sidebar-title">Boards</span>
        <button
          className="fl-sidebar-new"
          onClick={() => createBoard()}
          title="New board (Ctrl+N)"
          aria-label="New board"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
          New
        </button>
      </div>

      <div className="fl-board-list" role="listbox" aria-label="Board list">
        {boards.map((board) => {
          const color = boardColor(board.id)
          const isActive = board.id === activeId
          const isRenaming = renamingId === board.id

          return (
            <div
              key={board.id}
              className={`fl-board-item${isActive ? ' active' : ''}`}
              role="option"
              aria-selected={isActive}
              onClick={() => !isRenaming && switchBoard(board.id)}
              onDoubleClick={() => startRename(board)}
              onContextMenu={(e) => openCtx(e, board)}
            >
              <div
                className="fl-board-avatar"
                style={{ background: `${color}22`, color }}
              >
                {board.title.charAt(0).toUpperCase()}
              </div>

              <div className="fl-board-info">
                {isRenaming ? (
                  <input
                    ref={renameRef}
                    className="fl-board-rename-input"
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenamingId(null)
                      e.stopPropagation()
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="fl-board-name">{board.title}</div>
                    <div className="fl-board-date">{formatDate(board.updatedAt)}</div>
                  </>
                )}
              </div>

              {!isRenaming && (
                <button
                  className="fl-board-menu-btn"
                  onClick={(e) => openCtx(e, board)}
                  aria-label="Board options"
                  title="Options"
                >
                  ···
                </button>
              )}
            </div>
          )
        })}
      </div>

      {ctx && (
        <CtxMenu
          x={ctx.x}
          y={ctx.y}
          board={boards.find((b) => b.id === ctx.boardId)!}
          onRename={(b) => startRename(b)}
          onDuplicate={(id) => { duplicateBoard(id); setCtx(null) }}
          onDelete={(id) => { deleteBoard(id); setCtx(null) }}
          onClose={() => setCtx(null)}
        />
      )}
    </aside>
  )
}

interface CtxMenuProps {
  x: number
  y: number
  board: Board
  onRename: (b: Board) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function CtxMenu({ x, y, board, onRename, onDuplicate, onDelete, onClose }: CtxMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Adjust position to stay in viewport
  const style: React.CSSProperties = { left: x, top: y }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth) el.style.left = `${x - rect.width}px`
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`
  }, [x, y])

  return (
    <div className="fl-ctx-menu" ref={ref} style={style} role="menu">
      <div className="fl-ctx-item" role="menuitem" onClick={() => { onRename(board); onClose() }}>
        <span>✏️</span> Rename
      </div>
      <div className="fl-ctx-item" role="menuitem" onClick={() => onDuplicate(board.id)}>
        <span>⎘</span> Duplicate
      </div>
      <div className="fl-ctx-sep" />
      <div className="fl-ctx-item danger" role="menuitem" onClick={() => onDelete(board.id)}>
        <span>🗑</span> Delete
      </div>
    </div>
  )
}
