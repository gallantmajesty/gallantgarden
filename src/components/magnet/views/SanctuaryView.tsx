import { useState } from 'react'
import { useMagnet } from '../../../store/magnet'
import { SectionHead, Panel, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'

const VISION_EMOJI = ['🎯', '🏆', '🌍', '🎓', '💡', '🔥', '🌱', '✨', '🚀', '💪', '📚', '🧠', '🏡', '💼', '❤️']
const VISION_COLORS = ['#9a6cff', '#ff6f9c', '#46d6a0', '#ffb454', '#4fd1e0', '#b76cff']

export function SanctuaryView() {
  const data = useMagnet((s) => s.data)
  const setBrainDump = useMagnet((s) => s.setBrainDump)
  const addIdea = useMagnet((s) => s.addIdea)
  const deleteIdea = useMagnet((s) => s.deleteIdea)
  const togglePinIdea = useMagnet((s) => s.togglePinIdea)
  const addVision = useMagnet((s) => s.addVision)
  const deleteVision = useMagnet((s) => s.deleteVision)

  const [idea, setIdea] = useState('')
  const [visionOpen, setVisionOpen] = useState(false)
  const [vTitle, setVTitle] = useState('')
  const [vNote, setVNote] = useState('')
  const [vEmoji, setVEmoji] = useState(VISION_EMOJI[0])
  const [vColor, setVColor] = useState(VISION_COLORS[0])

  const ideas = [...data.ideas].sort((a, b) => Number(b.pinned) - Number(a.pinned))

  function submitIdea(e: React.FormEvent) {
    e.preventDefault()
    const v = idea.trim()
    if (!v) return
    addIdea(v)
    setIdea('')
  }
  function saveVision(e: React.FormEvent) {
    e.preventDefault()
    const t = vTitle.trim()
    if (!t) return
    addVision({ title: t, note: vNote.trim(), emoji: vEmoji, color: vColor })
    setVTitle('')
    setVNote('')
    setVEmoji(VISION_EMOJI[0])
    setVColor(VISION_COLORS[0])
    setVisionOpen(false)
  }

  return (
    <div className="mg-view">
      <SectionHead icon="vault" title="Sanctuary" subtitle="Your private vault — ideas, dreams and the proof of how far you've come" />

      <div className="mg-sanctuary-grid">
        {/* brain dump */}
        <Panel className="mg-braindump">
          <div className="mg-panel-head">
            <h3>
              <Icon name="brain" size={17} /> Brain dump
            </h3>
            <span className="mg-muted">Auto-saved</span>
          </div>
          <textarea
            value={data.brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            placeholder="Empty your head here — worries, reminders, half-thoughts. No structure required."
          />
        </Panel>

        {/* ideas vault */}
        <Panel className="mg-ideavault">
          <div className="mg-panel-head">
            <h3>
              <Icon name="bulb" size={17} /> Ideas vault
            </h3>
          </div>
          <form className="mg-subadd" onSubmit={submitIdea}>
            <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Capture a spark…" />
            <button type="submit">
              <Icon name="plus" size={14} />
            </button>
          </form>
          {ideas.length === 0 ? (
            <p className="mg-muted">Every big project starts as a throwaway note. Catch them here.</p>
          ) : (
            <ul className="mg-idealist">
              {ideas.map((i) => (
                <li key={i.id} className={i.pinned ? 'pinned' : ''}>
                  <button className="mg-pin" onClick={() => togglePinIdea(i.id)} aria-label="Pin">
                    <Icon name="pin" size={14} />
                  </button>
                  <span>{i.text}</span>
                  <button className="mg-iconbtn danger" onClick={() => deleteIdea(i.id)} aria-label="Delete">
                    <Icon name="close" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* vision board */}
      <Panel className="mg-vision">
        <div className="mg-panel-head">
          <h3>
            <Icon name="star" size={17} /> Vision board
          </h3>
          <button className="mg-btn ghost small" onClick={() => setVisionOpen(true)}>
            <Icon name="plus" size={14} /> Add
          </button>
        </div>
        {data.vision.length === 0 ? (
          <EmptyState icon="star" title="Picture the life you want" body="Add cards for the things you're working toward — see them every time you visit." />
        ) : (
          <div className="mg-visiongrid">
            {data.vision.map((v) => (
              <div key={v.id} className="mg-visioncard" style={{ ['--mg-tag' as string]: v.color }}>
                <button className="mg-visioncard-del" onClick={() => deleteVision(v.id)} aria-label="Delete">
                  <Icon name="close" size={13} />
                </button>
                <span className="mg-visioncard-emoji">{v.emoji}</span>
                <strong>{v.title}</strong>
                {v.note && <p>{v.note}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* achievements */}
      <Panel className="mg-achievements">
        <div className="mg-panel-head">
          <h3>
            <Icon name="trophy" size={17} /> Achievement gallery
          </h3>
          <span className="mg-muted">{data.achievements.length} earned</span>
        </div>
        {data.achievements.length === 0 ? (
          <p className="mg-muted">Complete tasks and level up to start filling your trophy shelf.</p>
        ) : (
          <ul className="mg-achlist">
            {data.achievements.slice(0, 30).map((a) => (
              <li key={a.id}>
                <span className="mg-ach-icon">
                  <Icon name={a.icon} size={18} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <small>{a.detail}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <MgModal open={visionOpen} title="New vision card" onClose={() => setVisionOpen(false)}>
        <form className="mg-form" onSubmit={saveVision}>
          <Field label="Title">
            <input autoFocus value={vTitle} onChange={(e) => setVTitle(e.target.value)} placeholder="e.g. Top of my class" />
          </Field>
          <Field label="Note">
            <textarea rows={2} value={vNote} onChange={(e) => setVNote(e.target.value)} placeholder="What this looks like for you…" />
          </Field>
          <Field label="Symbol">
            <div className="mg-emojipick">
              {VISION_EMOJI.map((em) => (
                <button
                  type="button"
                  key={em}
                  className={`mg-emojiopt ${vEmoji === em ? 'active' : ''}`}
                  onClick={() => setVEmoji(em)}
                >
                  {em}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Color">
            <div className="mg-swatches">
              {VISION_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`mg-swatch ${vColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setVColor(c)}
                />
              ))}
            </div>
          </Field>
          <div className="mg-form-actions">
            <button type="button" className="mg-btn ghost" onClick={() => setVisionOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="mg-btn primary">
              Add card
            </button>
          </div>
        </form>
      </MgModal>
    </div>
  )
}
