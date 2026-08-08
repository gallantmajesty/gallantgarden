import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { sanitizeHtml } from '../lib/sanitize'
import './Notes.css'

const STORAGE_KEY = (uid: string) => `sf.notes.doc:${uid}`

const STICKERS = ['🌸', '⭐', '🔥', '💡', '📚', '✏️', '🌟', '💜', '🍀', '🎯', '🌈', '❤️']

interface Stroke {
  color: string
  size: number
  pts: { x: number; y: number }[]
}

// A Word-like study note page: free-flow rich text + an aesthetic paint layer
// and sticker stamps. Content is a normal editable document (not cards), so
// students mix their notes however they like. Sticky Notes are untouched.
export function NotesEditor() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const uid = user?.id ?? 'anon'

  const pageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<{ active: boolean; stroke: Stroke | null }>({ active: false, stroke: null })

  const [html, setHtml] = useState('')
  const [painting, setPainting] = useState(false)
  const [brush, setBrush] = useState({ color: '#b98cff', size: 4 })
  const [stickers, setStickers] = useState<{ id: string; emoji: string; x: number; y: number; rot: number }[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // load saved doc
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(uid))
      if (raw) {
        const d = JSON.parse(raw)
        setHtml(sanitizeHtml(d.html ?? ''))
        setStickers(d.stickers ?? [])
      } else {
        setHtml('<h1>My Notes</h1><p>Start writing here…</p>')
      }
    } catch {
      setHtml('<h1>My Notes</h1><p>Start writing here…</p>')
    }
  }, [uid])

  // autosave (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY(uid), JSON.stringify({ html, stickers }))
    }, 500)
    return () => clearTimeout(t)
  }, [html, stickers, uid])

  function cmd(c: string, v?: string) {
    document.execCommand(c, false, v)
    if (pageRef.current) setHtml(sanitizeHtml(pageRef.current.innerHTML))
  }

  // Intercept paste so only sanitized HTML ever reaches the live DOM. Without
  // this, rich pasted content (e.g. <img onerror=...>) would execute in the
  // contentEditable before React's sanitizer re-renders — classic paste XSS.
  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')
    const safe = html ? sanitizeHtml(html) : ''
    const insert = safe && safe.trim() !== '' ? safe : text
    if (insert) document.execCommand('insertHTML', false, insert)
  }

  // ---- drawing ----
  function resizeCanvas() {
    const cv = canvasRef.current
    const page = pageRef.current
    if (!cv || !page) return
    const rect = page.getBoundingClientRect()
    cv.width = page.scrollWidth
    cv.height = page.scrollHeight
    cv.style.width = `${page.scrollWidth}px`
    cv.style.height = `${page.scrollHeight}px`
  }

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pointerPos(e: React.PointerEvent) {
    const cv = canvasRef.current!
    const r = cv.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function onDrawDown(e: React.PointerEvent) {
    if (!painting) return
    const p = pointerPos(e)
    drawing.current = { active: true, stroke: { color: brush.color, size: brush.size, pts: [p] } }
    ;(e.target as Element).setPointerCapture(e.pointerId)
    redraw()
  }
  function onDrawMove(e: React.PointerEvent) {
    if (!painting || !drawing.current.active || !drawing.current.stroke) return
    drawing.current.stroke.pts.push(pointerPos(e))
    redraw()
  }
  function onDrawUp() {
    drawing.current.active = false
    if (drawing.current.stroke) {
      // persist strokes into a ref-backed list (kept in component scope for redraw)
      savedStrokes.current.push(drawing.current.stroke)
      drawing.current.stroke = null
    }
  }

  const savedStrokes = useRef<Stroke[]>([])
  function redraw() {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, cv.width, cv.height)
    const all = [...savedStrokes.current]
    if (drawing.current.stroke) all.push(drawing.current.stroke)
    for (const s of all) {
      if (s.pts.length < 2) continue
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(s.pts[0].x, s.pts[0].y)
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y)
      ctx.stroke()
    }
  }

  function addSticker(emoji: string) {
    setStickers((s) => [
      ...s,
      { id: `st${Date.now()}`, emoji, x: 80 + Math.random() * 200, y: 120 + Math.random() * 200, rot: (Math.random() - 0.5) * 30 },
    ])
    setPickerOpen(false)
  }
  function moveSticker(id: string, x: number, y: number) {
    setStickers((s) => s.map((st) => (st.id === id ? { ...st, x, y } : st)))
  }
  function removeSticker(id: string) {
    setStickers((s) => s.filter((st) => st.id !== id))
  }

  function clearDrawing() {
    savedStrokes.current = []
    redraw()
  }

  return (
    <div className="notes-editor">
      <header className="notes-editor-bar">
        <button className="sf-btn water tiny" onClick={() => navigate('/notes')}>‹ Notes</button>

        <div className="notes-toolbar">
          <button className="nt-btn" title="Heading" onClick={() => cmd('formatBlock', 'H1')}>H</button>
          <button className="nt-btn" title="Subheading" onClick={() => cmd('formatBlock', 'H2')}>H2</button>
          <button className="nt-btn" title="Paragraph" onClick={() => cmd('formatBlock', 'P')}>¶</button>
          <span className="nt-sep" />
          <button className="nt-btn" title="Bold" style={{ fontWeight: 800 }} onClick={() => cmd('bold')}><b>B</b></button>
          <button className="nt-btn" title="Italic" onClick={() => cmd('italic')}><i>I</i></button>
          <button className="nt-btn" title="Underline" onClick={() => cmd('underline')}><u>U</u></button>
          <span className="nt-sep" />
          <button className="nt-btn" title="Bullet list" onClick={() => cmd('insertUnorderedList')}>•—</button>
          <button className="nt-btn" title="Numbered list" onClick={() => cmd('insertOrderedList')}>1.</button>
          <span className="nt-sep" />
          <button className="nt-btn" title="Align left" onClick={() => cmd('justifyLeft')}>⬅</button>
          <button className="nt-btn" title="Align center" onClick={() => cmd('justifyCenter')}>⬌</button>
          <button className="nt-btn" title="Align right" onClick={() => cmd('justifyRight')}>➡</button>
          <span className="nt-sep" />
          <input className="nt-color" type="color" title="Text colour" onChange={(e) => cmd('foreColor', e.target.value)} />
        </div>

        <div className="notes-aesthetic">
          <button className={`sf-btn tiny ${painting ? 'on' : ''}`} onClick={() => setPainting((p) => !p)}>
            {painting ? '✎ Painting' : '✎ Paint'}
          </button>
          {painting && (
            <>
              <input type="color" value={brush.color} onChange={(e) => setBrush((b) => ({ ...b, color: e.target.value }))} title="Brush colour" />
              <input type="range" min={1} max={24} value={brush.size} onChange={(e) => setBrush((b) => ({ ...b, size: Number(e.target.value) }))} title="Brush size" />
              <button className="sf-btn secondary tiny" onClick={clearDrawing}>Clear</button>
            </>
          )}
          <button className="sf-btn tiny" onClick={() => setPickerOpen((o) => !o)}>😊 Sticker</button>
          {pickerOpen && (
            <div className="notes-sticker-picker">
              {STICKERS.map((s) => (
                <button key={s} onClick={() => addSticker(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="notes-page-wrap">
        <div className="notes-page">
          <div
            ref={pageRef}
            className="notes-doc"
            contentEditable
            suppressContentEditableWarning
            onPaste={onPaste}
            onInput={(e) => setHtml(sanitizeHtml((e.target as HTMLDivElement).innerHTML))}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />
          {painting && (
            <canvas
              ref={canvasRef}
              className="notes-paint"
              onPointerDown={onDrawDown}
              onPointerMove={onDrawMove}
              onPointerUp={onDrawUp}
            />
          )}
          {stickers.map((st) => (
            <div
              key={st.id}
              className="notes-sticker"
              style={{ left: st.x, top: st.y, transform: `rotate(${st.rot}deg)` }}
              onPointerDown={(e) => {
                const startX = e.clientX
                const startY = e.clientY
                const ox = st.x
                const oy = st.y
                const move = (ev: PointerEvent) => moveSticker(st.id, ox + (ev.clientX - startX), oy + (ev.clientY - startY))
                const up = () => {
                  window.removeEventListener('pointermove', move)
                  window.removeEventListener('pointerup', up)
                }
                window.addEventListener('pointermove', move)
                window.addEventListener('pointerup', up)
              }}
              onDoubleClick={() => removeSticker(st.id)}
              title="Drag to move · double-click to remove"
            >
              {st.emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
