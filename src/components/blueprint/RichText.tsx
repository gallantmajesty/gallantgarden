import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'
import { useBlueprint } from '../../store/blueprint'

const EMOJI_SHORTCUTS: Record<string, string> = {
  ':)': '😊', ':(': '😢', ':D': '😃', '<3': '❤️', ':*': '😘',
  ':+1': '👍', ':fire': '🔥', ':star': '⭐', ':heart': '❤️',
  ':smile': '😊', ':cry': '😢', ':laugh': '😃', ':wink': '😉',
  ':clap': '👏', ':wave': '👋', ':muscle': '💪', ':sparkles': '✨',
  ':rainbow': '🌈', ':sun': '☀️', ':moon': '🌙', ':cloud': '☁️',
  ':flower': '🌸', ':leaf': '🍃', ':mushroom': '🍄', ':cat': '🐱',
  ':dog': '🐶', ':bear': '🐻', ':bunny': '🐰', ':fox': '🦊',
  ':panda': '🐼', ':penguin': '🐧', ':bird': '🐦', ':butterfly': '🦋',
  ':book': '📚', ':pen': '🖊️', ':pencil': '✏️', ':memo': '📝',
  ':coffee': '☕', ':tea': '🍵', ':cake': '🍰', ':cookie': '🍪',
  ':rain': '🌧️', ':snow': '❄️', ':wind': '💨', ':lightning': '⚡',
}

interface RichTextProps {
  html: string
  onChange: (html: string) => void
  autoFocus?: boolean
}

export function RichText({ html, onChange, autoFocus }: RichTextProps) {
  const setEditor = useBlueprint((s) => s.setActiveEditor)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
    ],
    content: html,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      let content = editor.getHTML()
      for (const [shortcut, emoji] of Object.entries(EMOJI_SHORTCUTS)) {
        content = content.replaceAll(shortcut, emoji)
      }
      onChange(content)
    },
  })

  // store editor in store so Inspector can access it
  useEffect(() => {
    if (editor) setEditor(editor)
    return () => setEditor(null)
  }, [editor, setEditor])

  useEffect(() => {
    if (editor && html !== editor.getHTML()) editor.commands.setContent(html, { emitUpdate: false })
  }, [html])

  if (!editor) return null

  return (
    <div className="bp-rt" onPointerDown={(e) => e.stopPropagation()}>
      <EditorContent editor={editor} className="bp-rt-content" />
    </div>
  )
}
