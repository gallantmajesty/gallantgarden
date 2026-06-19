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

const TB: { cmd: string; label: string; title: string }[] = [
  { cmd: 'bold', label: 'B', title: 'Bold' },
  { cmd: 'italic', label: 'I', title: 'Italic' },
  { cmd: 'strike', label: 'S', title: 'Strikethrough' },
  { cmd: 'h1', label: 'H1', title: 'Heading 1' },
  { cmd: 'h2', label: 'H2', title: 'Heading 2' },
  { cmd: 'bullet', label: '•', title: 'Bullet list' },
  { cmd: 'ordered', label: '1.', title: 'Numbered list' },
  { cmd: 'quote', label: '"', title: 'Quote' },
  { cmd: 'code', label: '</>', title: 'Code block' },
]

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

  function run(cmd: string) {
    if (!editor) return
    const c = editor.chain().focus()
    switch (cmd) {
      case 'bold': c.toggleBold().run(); break
      case 'italic': c.toggleItalic().run(); break
      case 'strike': c.toggleStrike().run(); break
      case 'h1': c.toggleHeading({ level: 1 }).run(); break
      case 'h2': c.toggleHeading({ level: 2 }).run(); break
      case 'bullet': c.toggleBulletList().run(); break
      case 'ordered': c.toggleOrderedList().run(); break
      case 'quote': c.toggleBlockquote().run(); break
      case 'code': c.toggleCodeBlock().run(); break
    }
  }

  return (
    <div className="bp-rt" onPointerDown={(e) => e.stopPropagation()}>
      <div className="bp-rt-toolbar" onMouseDown={(e) => e.preventDefault()}>
        {TB.map((t) => (
          <button
            key={t.cmd}
            title={t.title}
            className={`bp-rt-btn ${isActive(editor, t.cmd) ? 'on' : ''}`}
            onClick={() => run(t.cmd)}
          >
            {t.label}
          </button>
        ))}
        <label className="bp-rt-color" title="Text colour">
          <input
            type="color"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
          A
        </label>
      </div>
      <EditorContent editor={editor} className="bp-rt-content" />
    </div>
  )
}

function isActive(editor: ReturnType<typeof useEditor>, cmd: string): boolean {
  if (!editor) return false
  switch (cmd) {
    case 'bold': return editor.isActive('bold')
    case 'italic': return editor.isActive('italic')
    case 'strike': return editor.isActive('strike')
    case 'h1': return editor.isActive('heading', { level: 1 })
    case 'h2': return editor.isActive('heading', { level: 2 })
    case 'bullet': return editor.isActive('bulletList')
    case 'ordered': return editor.isActive('orderedList')
    case 'quote': return editor.isActive('blockquote')
    case 'code': return editor.isActive('codeBlock')
    default: return false
  }
}
