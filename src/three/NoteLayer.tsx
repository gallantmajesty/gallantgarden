import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import DOMPurify from 'dompurify'
import { Html } from '@react-three/drei'
import type { StickyNote } from '../lib/types'
import { noteBackground } from '../lib/noteStyle'
import { anchorsForVariant } from './treeAnchors'
import './NoteLayer.css'

interface NoteLayerProps {
  notes: StickyNote[]
  variant: number
  editing: boolean
  onOpen: (note: StickyNote) => void
  /** re-pin a note to a different branch anchor */
  onReanchor: (id: string, anchorId: number) => void
}

/**
 * Renders each note attached to a branch anchor of the focused tree. Notes live
 * in the tree's local space, so they move/scale with it. In edit mode the user
 * can drag a note to snap it onto the nearest branch.
 */
export function NoteLayer({ notes, variant, editing, onOpen, onReanchor }: NoteLayerProps) {
  const anchors = anchorsForVariant(variant)
  return (
    <>
      {notes.map((note) => {
        const anchor = anchors[note.anchor_id % anchors.length] ?? anchors[0]
        return (
          <group key={note.id} position={anchor.pos}>
            {/* little pin stem connecting note to branch */}
            <mesh position={[0, 0, -0.15]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
              <meshStandardMaterial color="#5c3518" />
            </mesh>
            <Html
              position={[0, 0, 0]}
              center
              distanceFactor={6}
              zIndexRange={[20, 0]}
              occlude={false}
            >
              <NoteCard
                note={note}
                editing={editing}
                onOpen={onOpen}
                onReanchor={(aid) => onReanchor(note.id, aid)}
                anchorCount={anchors.length}
              />
            </Html>
          </group>
        )
      })}
    </>
  )
}

function NoteCard({
  note,
  editing,
  onOpen,
  onReanchor,
  anchorCount,
}: {
  note: StickyNote
  editing: boolean
  onOpen: (n: StickyNote) => void
  onReanchor: (anchorId: number) => void
  anchorCount: number
}) {
  const drag = useRef<{ sx: number; moved: boolean } | null>(null)

  function onPointerDown(e: ReactPointerEvent) {
    if (!editing) return
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, moved: false }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag.current) return
    if (Math.abs(e.clientX - drag.current.sx) > 28 && !drag.current.moved) {
      drag.current.moved = true
      // step the note to the next branch anchor in the direction dragged
      const dir = e.clientX > drag.current.sx ? 1 : -1
      const next = (note.anchor_id + dir + anchorCount) % anchorCount
      onReanchor(next)
    }
  }

  function onPointerUp() {
    if (!drag.current) return
    const wasClick = !drag.current.moved
    drag.current = null
    if (wasClick) onOpen(note)
  }

  return (
    <div
      className={`note3d ${editing ? 'editing' : ''}`}
      style={{
        background: noteBackground(note),
        color: note.font_color,
        fontFamily: note.font_family,
        fontSize: note.font_size,
        width: note.width,
        maxHeight: Math.round(note.width * 1.5),
        transform: `rotate(${note.rotation}deg)`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => {
        if (!editing) {
          e.stopPropagation()
          onOpen(note)
        }
      }}
    >
      <span className="note3d-pin" />
      {note.image_url && <img className="note3d-img" src={note.image_url} alt="" />}
      <div className="note3d-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content_html) }} />
    </div>
  )
}
