import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'

// A lightweight TipTap editor mounted only for the note currently being edited.
// Inline structure (bold / italic / strike / headings / lists / code / quote /
// coloured text) comes from TipTap; font / size / alignment / line-spacing live
// on the note container (see NoteStyle), so we don't need extra extensions.

interface RichTextProps {
  html: string
  onChange: (html: string) => void
  autoFocus?: boolean
}

export function RichText({ html, onChange, autoFocus }: RichTextProps) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color],
    content: html,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // keep external html in sync if it changes from elsewhere (e.g. undo)
  useEffect(() => {
    if (editor && html !== editor.getHTML()) editor.commands.setContent(html, { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  if (!editor) return null

  return (
    <div className="bp-rt" onPointerDown={(e) => e.stopPropagation()}>
      <EditorContent editor={editor} className="bp-rt-content" />
    </div>
  )
}
