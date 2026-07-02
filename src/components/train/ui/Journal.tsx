// In-seat journal — Tiptap rich-text editor styled as a notebook on the tray
// table. Auto-saves every 30s to localStorage (keyed per journey) and syncs
// to InsForge when connected. Accessible after the journey via the journal tab.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useTrain } from '../../../store/train'

const AUTOSAVE_MS = 30_000
const MAX_LENGTH = 2000
const STORAGE_PREFIX = 'sf.train.journal.'

function storageKey(lineId: string | null, startedAt: number | null): string {
  return `${STORAGE_PREFIX}${lineId ?? 'unknown'}:${startedAt ?? 0}`
}

export function Journal({ onClose }: { onClose: () => void }) {
  const line = useTrain((s) => s.line)
  const startedAt = useTrain((s) => s.startedAt)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const key = storageKey(line?.id ?? null, startedAt)

  const editor = useEditor({
    extensions: [StarterKit],
    content: loadContent(key),
    editorProps: {
      attributes: {
        class: 'train-journal-editor',
        'data-placeholder': 'What are you focusing on today?',
      },
    },
  })

  // Character count
  const chars = editor?.storage.characterCount?.characters?.() ?? editor?.getText().length ?? 0
  const overLimit = chars > MAX_LENGTH

  // Auto-save
  const save = useCallback(() => {
    if (!editor) return
    const html = editor.getHTML()
    try {
      localStorage.setItem(key, html)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch { /* storage full */ }
  }, [editor, key])

  useEffect(() => {
    saveTimer.current = setInterval(save, AUTOSAVE_MS)
    return () => { if (saveTimer.current) clearInterval(saveTimer.current) }
  }, [save])

  // Save on unmount
  useEffect(() => () => save(), [save])

  if (!editor) return null

  return (
    <div className="train-journal water-glass" style={accentVars(line?.mood.glow, line?.mood.accent)}>
      <div className="train-journal-head">
        <div className="train-journal-title">
          <span className="train-journal-icon">📓</span>
          <strong>Notebook</strong>
        </div>
        <div className="train-journal-actions">
          {saved && <span className="train-journal-saved">Saved</span>}
          <span className={`train-journal-chars ${overLimit ? 'over' : ''}`}>
            {chars}/{MAX_LENGTH}
          </span>
          <button className="train-journal-close" onClick={onClose} aria-label="Close journal">✕</button>
        </div>
      </div>

      <div className="train-journal-body">
        <EditorContent editor={editor} />
      </div>

      <div className="train-journal-foot">
        <span>Auto-saves every 30s</span>
        <button className="sf-btn ghost sm" onClick={save}>Save now</button>
      </div>
    </div>
  )
}

function loadContent(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function accentVars(glow?: string, accent?: string): React.CSSProperties {
  if (!glow || !accent) return {}
  return { ['--train-glow' as string]: glow, ['--train-accent' as string]: accent }
}
