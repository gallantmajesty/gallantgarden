import { useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { htmlToText } from '../../lib/blueprint/types'
import { autoPorts } from '../../lib/blueprint/geom'
import { escapeHtml } from '../../lib/sanitize'
import {
  jarvisGenerateNotes,
  jarvisSummarize,
  jarvisFlashcards,
  jarvisSuggestLinks,
  loadAIConfig,
  type Flashcard,
} from '../../lib/ai/jarvis'

// Jarvis — the AI study assistant panel. Talks to an LLM via a user-supplied
// API key (see lib/ai/jarvis.ts). Generates notes, summarizes, makes flashcards
// and auto-links the board.
export function JarvisPanel({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [cards, setCards] = useState<Flashcard[] | null>(null)

  const configured = Boolean(loadAIConfig())

  function run(label: string, fn: () => Promise<void>) {
    setErr(null)
    setBusy(label)
    fn()
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(null))
  }

  // 1) Generate notes from a prompt — lay them out in a grid, link in sequence.
  function generate() {
    if (!prompt.trim()) return
    run('generate', async () => {
      const notes = await jarvisGenerateNotes(prompt.trim(), 6)
      const st = useBlueprint.getState()
      const baseX = (-st.viewport.x + window.innerWidth / 2) / st.viewport.zoom - 240
      const baseY = (-st.viewport.y + window.innerHeight / 2) / st.viewport.zoom - 180
      const created = notes.map((n, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const node = st.addNode({
          html: `<p>${escapeHtml(n.html)}</p>`,
          label: n.label,
          tags: n.tags,
          x: Math.round(baseX + col * 260),
          y: Math.round(baseY + row * 200),
        })
        return node
      })
      // link each note to the previous one (a study chain)
      for (let i = 1; i < created.length; i++) {
        const a = created[i - 1]
        const b = created[i]
        const { fromPort, toPort } = autoPorts(a, b)
        st.addEdge(a.id, fromPort, b.id, toPort, st.activeTypeId || 'link')
      }
      st.selectMany(created.map((n) => n.id))
    })
  }

  // 2) Summarize / expand the currently selected note.
  function actOnSelection(mode: 'simplify' | 'expand' | 'keyfacts') {
    const st = useBlueprint.getState()
    const id = st.selection[0]
    if (!id) { setErr('Select a note first.'); return }
    const node = st.doc.nodes.find((n) => n.id === id)
    if (!node) return
    run(mode, async () => {
      const out = await jarvisSummarize(htmlToText(node.html) || node.label || '', mode)
      st.setNodeHtml(id, `<p>${escapeHtml(out)}</p>`)
    })
  }

  // 3) Flashcards from the selected note (or whole board).
  function makeCards() {
    const st = useBlueprint.getState()
    const id = st.selection[0]
    const node = id ? st.doc.nodes.find((n) => n.id === id) : null
    const text = node ? htmlToText(node.html) : st.doc.nodes.map((n) => `${n.label}\n${htmlToText(n.html)}`).join('\n\n')
    if (!text.trim()) { setErr('Add some notes first.'); return }
    run('cards', async () => {
      const c = await jarvisFlashcards(text, 5)
      setCards(c)
    })
  }

  // 4) Auto-link the whole board based on AI-suggested relationships.
  function autoLink() {
    const st = useBlueprint.getState()
    const notes = st.doc.nodes.map((n) => ({ label: n.label || 'Untitled', text: htmlToText(n.html).slice(0, 200) }))
    if (notes.length < 2) { setErr('Need at least 2 notes to link.'); return }
    run('link', async () => {
      const links = await jarvisSuggestLinks(notes)
      const byLabel = new Map(st.doc.nodes.map((n) => [n.label || 'Untitled', n]))
      let made = 0
      for (const l of links) {
        const a = byLabel.get(l.fromLabel)
        const b = byLabel.get(l.toLabel)
        if (a && b && a.id !== b.id) {
          const { fromPort, toPort } = autoPorts(a, b)
          st.addEdge(a.id, fromPort, b.id, toPort, st.activeTypeId || 'link')
          made++
        }
      }
      setErr(made ? `Linked ${made} note pair(s).` : 'No strong links suggested.')
    })
  }

  return (
    <div className="bp-panel bp-jarvis bp-surface">
      <div className="bp-panel-head">
        <strong>✦ Jarvis · AI Assistant</strong>
        <button className="bp-x" onClick={onClose}>✕</button>
      </div>

      {!configured && (
        <div className="bp-jarvis-note">
          Add your AI API key in <b>Settings → AI Assistant</b> to enable Jarvis.
        </div>
      )}

      <div className="bp-ai-scroll">
        <div className="bp-jarvis-prompt">
          <textarea
            className="bp-text bp-jarvis-input"
            placeholder="Ask Jarvis to make study notes… e.g. “Photosynthesis for a high-school exam”"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
          <button className="sf-btn tiny" disabled={busy !== null || !configured} onClick={generate}>
            {busy === 'generate' ? 'Thinking…' : 'Generate notes'}
          </button>
        </div>

        <Block title="This note">
          <div className="bp-jarvis-row">
            <button className="sf-btn secondary tiny" disabled={busy !== null || !configured} onClick={() => actOnSelection('simplify')}>
              {busy === 'simplify' ? '…' : 'Simplify'}
            </button>
            <button className="sf-btn secondary tiny" disabled={busy !== null || !configured} onClick={() => actOnSelection('expand')}>
              {busy === 'expand' ? '…' : 'Expand'}
            </button>
            <button className="sf-btn secondary tiny" disabled={busy !== null || !configured} onClick={() => actOnSelection('keyfacts')}>
              {busy === 'keyfacts' ? '…' : 'Key facts'}
            </button>
          </div>
          <button className="sf-btn secondary tiny bp-jarvis-wide" disabled={busy !== null || !configured} onClick={makeCards}>
            {busy === 'cards' ? 'Building…' : 'Make flashcards / quiz'}
          </button>
        </Block>

        <Block title="Whole board">
          <button className="sf-btn secondary tiny bp-jarvis-wide" disabled={busy !== null || !configured} onClick={autoLink}>
            {busy === 'link' ? 'Analysing…' : 'Auto-link related notes'}
          </button>
        </Block>

        {err && <div className="bp-jarvis-err">{err}</div>}

        {cards && (
          <Block title={`Flashcards (${cards.length})`}>
            <div className="bp-quiz">
              {cards.map((c, i) => (
                <details key={i} className="bp-quiz-card">
                  <summary>{c.q}</summary>
                  <p>{c.a}</p>
                </details>
              ))}
            </div>
            <button className="sf-btn secondary tiny bp-jarvis-wide" onClick={() => setCards(null)}>Close quiz</button>
          </Block>
        )}
      </div>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bp-ai-block">
      <h4>{title}</h4>
      {children}
    </div>
  )
}
