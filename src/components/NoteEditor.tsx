import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { insforge } from '../lib/insforge'
import type { BgStyle, StickyNote } from '../lib/types'
import { DESIGN_PRESETS, htmlToText, noteBackground } from '../lib/noteStyle'
import './NoteEditor.css'

interface NoteEditorProps {
  note: StickyNote
  onPatch: (patch: Partial<StickyNote>) => void
  onDelete: () => void
  onClose: () => void
}

const FONTS = ['Inter', 'Baloo 2', 'Georgia', 'Courier New', 'Comic Sans MS', 'Trebuchet MS']
const GRADIENTS = [
  'linear-gradient(135deg, #ffe27a, #ffb347)',
  'linear-gradient(135deg, #a8e6cf, #56c596)',
  'linear-gradient(135deg, #ffaaa5, #ff7b6b)',
  'linear-gradient(135deg, #a5d8ff, #5b9bd5)',
  'linear-gradient(135deg, #c3b1ff, #8a6cff)',
]
const SOLIDS = ['#ffe27a', '#a8e6cf', '#ffaaa5', '#a5d8ff', '#ffd6f5', '#fff5ba', '#d4ffb2']

export function NoteEditor({ note, onPatch, onDelete, onClose }: NoteEditorProps) {
  const [uploading, setUploading] = useState(false)
  const saveTimer = useRef<number | null>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content_html || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        onPatch({ content_html: html, content_text: htmlToText(html) })
      }, 450)
    },
  })

  // Reload editor content when switching to a different note.
  useEffect(() => {
    if (editor && note.content_html !== editor.getHTML()) {
      editor.commands.setContent(note.content_html || '<p></p>')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id])

  const previewBg = useMemo(() => noteBackground(note), [note.color, note.bg_style, note.bg_value])

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const { data, error } = await insforge.storage.from('note-images').uploadAuto(file)
    setUploading(false)
    if (!error && data?.url) onPatch({ image_url: data.url })
  }

  function setBg(style: BgStyle, value: string) {
    onPatch({ bg_style: style, bg_value: value })
  }

  return (
    <div className="ne-overlay" onClick={onClose}>
      <div className="ne-panel sf-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ne-head">
          <h2>Edit Note</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="ne-grid">
          {/* live preview */}
          <div className="ne-preview-wrap">
            <div
              className="ne-preview"
              style={{
                background: previewBg,
                color: note.font_color,
                fontFamily: note.font_family,
                fontSize: note.font_size,
                width: note.width,
              }}
            >
              <span className="note3d-pin" />
              {note.image_url && <img className="note3d-img" src={note.image_url} alt="" />}
              <div className="ne-editor-host">
                {/* formatting toolbar */}
                <div className="ne-format-bar" onMouseDown={(e) => e.preventDefault()}>
                  <button
                    className={editor?.isActive('bold') ? 'on' : ''}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    title="Bold"
                  >
                    <b>B</b>
                  </button>
                  <button
                    className={editor?.isActive('italic') ? 'on' : ''}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    title="Italic"
                  >
                    <i>i</i>
                  </button>
                  <button
                    className={editor?.isActive('bulletList') ? 'on' : ''}
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    title="Bullet list"
                  >
                    ☰
                  </button>
                  <button
                    className={editor?.isActive('heading', { level: 2 }) ? 'on' : ''}
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    title="Heading"
                  >
                    H
                  </button>
                </div>
                <EditorContent editor={editor} className="ne-editor" />
              </div>
            </div>
            {note.image_url && (
              <button className="ne-img-remove" onClick={() => onPatch({ image_url: null })}>
                Remove image
              </button>
            )}
          </div>

          {/* style controls */}
          <div className="ne-controls">
            <Field label="Paper color">
              <div className="ne-swatches">
                {SOLIDS.map((c) => (
                  <button
                    key={c}
                    className={`ne-swatch ${note.bg_style === 'solid' && note.color === c ? 'sel' : ''}`}
                    style={{ background: c }}
                    onClick={() => onPatch({ color: c, bg_style: 'solid', bg_value: '' })}
                  />
                ))}
                <label className="ne-swatch custom" title="Any color">
                  <input
                    type="color"
                    value={note.color}
                    onChange={(e) => onPatch({ color: e.target.value, bg_style: 'solid', bg_value: '' })}
                  />
                  +
                </label>
              </div>
            </Field>

            <Field label="Gradient">
              <div className="ne-swatches">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    className={`ne-swatch ${note.bg_style === 'gradient' && note.bg_value === g ? 'sel' : ''}`}
                    style={{ background: g }}
                    onClick={() => setBg('gradient', g)}
                  />
                ))}
              </div>
            </Field>

            <Field label="Design">
              <div className="ne-swatches">
                {Object.entries(DESIGN_PRESETS).map(([key, css]) => (
                  <button
                    key={key}
                    className={`ne-swatch ${note.bg_style === 'design' && note.bg_value === key ? 'sel' : ''}`}
                    style={{ background: css }}
                    title={key}
                    onClick={() => setBg('design', key)}
                  />
                ))}
              </div>
            </Field>

            <Field label="Note size">
              <div className="ne-size-row">
                <div className="ne-stepper">
                  <button onClick={() => onPatch({ width: Math.max(110, note.width - 20) })}>−</button>
                  <span>{note.width}px</span>
                  <button onClick={() => onPatch({ width: Math.min(360, note.width + 20) })}>+</button>
                </div>
                <input
                  className="ne-size-slider"
                  type="range"
                  min={110}
                  max={360}
                  step={10}
                  value={note.width}
                  onChange={(e) => onPatch({ width: Number(e.target.value) })}
                />
              </div>
            </Field>

            <div className="ne-row">
              <Field label="Font">
                <select
                  className="sf-input"
                  value={note.font_family}
                  onChange={(e) => onPatch({ font_family: e.target.value })}
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Size">
                <div className="ne-stepper">
                  <button onClick={() => onPatch({ font_size: Math.max(10, note.font_size - 2) })}>−</button>
                  <span>{note.font_size}</span>
                  <button onClick={() => onPatch({ font_size: Math.min(48, note.font_size + 2) })}>+</button>
                </div>
              </Field>
              <Field label="Text">
                <input
                  className="ne-color-input"
                  type="color"
                  value={note.font_color}
                  onChange={(e) => onPatch({ font_color: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Diagram image">
              <ImageDrop uploading={uploading} onFile={handleFile} />
            </Field>

            <Field label="Flashcard">
              <label className="ne-flash-toggle">
                <input
                  type="checkbox"
                  checked={note.is_flashcard}
                  onChange={(e) => onPatch({ is_flashcard: e.target.checked })}
                />
                Use as flashcard (front = note)
              </label>
              {note.is_flashcard && (
                <textarea
                  className="sf-input"
                  rows={2}
                  placeholder="Back of the card (answer)…"
                  value={note.flashcard_back}
                  onChange={(e) => onPatch({ flashcard_back: e.target.value })}
                />
              )}
            </Field>
          </div>
        </div>

        <div className="ne-foot">
          <button className="sf-btn secondary" onClick={onDelete}>Delete</button>
          <button className="sf-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ne-field">
      <span className="sf-label">{label}</span>
      {children}
    </div>
  )
}

function ImageDrop({ uploading, onFile }: { uploading: boolean; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  return (
    <label
      className={`ne-drop ${over ? 'over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
    >
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
      {uploading ? 'Uploading…' : over ? 'Drop image' : 'Drop or click to add a diagram'}
    </label>
  )
}
