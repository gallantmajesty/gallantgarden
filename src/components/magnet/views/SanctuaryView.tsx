import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import { SectionHead, Panel, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'
import { PngIcon, type PngIconName } from '../../PngIcon'

// Vision-board symbols use the Focus Lily PNG icon set instead of emojis.
const VISION_ICONS: PngIconName[] = [
  'goals', 'achievements', 'streaks', 'habits', 'study-rooms',
  'realm', 'lotus', 'focus-timer', 'notes', 'tasks', 'calendar', 'analytics',
]
const VISION_COLORS = ['#9a6cff', '#ff6f9c', '#46d6a0', '#ffb454', '#4fd1e0', '#b76cff']

// Render a stored vision symbol. New cards store a PNG icon name; older cards may
// still hold a raw emoji string — fall back to showing that as text so nothing
// is lost.
function VisionSymbol({ value, size = 30 }: { value: string; size?: number }) {
  if ((VISION_ICONS as string[]).includes(value)) {
    return <PngIcon name={value as PngIconName} size={size} />
  }
  return <span className="mg-visioncard-emoji">{value}</span>
}

export function SanctuaryView() {
  const { t } = useTranslation()
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
  const [vEmoji, setVEmoji] = useState<string>(VISION_ICONS[0])
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
    setVEmoji(VISION_ICONS[0])
    setVColor(VISION_COLORS[0])
    setVisionOpen(false)
  }

  return (
    <div className="mg-view">
      <SectionHead icon="vault" title={t('sanctuary.title')} subtitle={t('sanctuary.subtitle')} />

      <div className="mg-sanctuary-grid">
        {/* brain dump */}
        <Panel className="mg-braindump">
          <div className="mg-panel-head">
            <h3>
              <Icon name="brain" size={17} />{t('sanctuary.brainDump')}
            </h3>
            <span className="mg-muted">t('sanctuary.autoSaved')</span>
          </div>
          <textarea
            value={data.brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            placeholder={t('sanctuary.brainDumpPlaceholder')}
          />
        </Panel>

        {/* ideas vault */}
        <Panel className="mg-ideavault">
          <div className="mg-panel-head">
            <h3>
              <Icon name="bulb" size={17} />{t('sanctuary.ideasVault')}
            </h3>
          </div>
          <form className="mg-subadd" onSubmit={submitIdea}>
            <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t('sanctuary.captureSpark')} />
            <button type="submit">
              <Icon name="plus" size={14} />
            </button>
          </form>
          {ideas.length === 0 ? (
            <p className="mg-muted">t('sanctuary.ideasEmpty')</p>
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
            <Icon name="star" size={17} />{t('sanctuary.visionBoard')}
          </h3>
          <button className="mg-btn small" onClick={() => setVisionOpen(true)}>
            <Icon name="plus" size={14} />{t('common.add')}
          </button>
        </div>
        {data.vision.length === 0 ? (
          <EmptyState icon="star" title={t('sanctuary.visionEmptyTitle')} body={t('sanctuary.visionEmptyBody')} />
        ) : (
          <div className="mg-visiongrid">
            {data.vision.map((v) => (
              <div key={v.id} className="mg-visioncard" style={{ ['--mg-tag' as string]: v.color }}>
                <button className="mg-visioncard-del" onClick={() => deleteVision(v.id)} aria-label="Delete">
                  <Icon name="close" size={13} />
                </button>
                <span className="mg-visioncard-emoji"><VisionSymbol value={v.emoji} size={32} /></span>
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
            <Icon name="trophy" size={17} />{t('sanctuary.achievementGallery')}
          </h3>
          <span className="mg-muted">{data.achievements.length} earned</span>
        </div>
        {data.achievements.length === 0 ? (
          <p className="mg-muted">t('sanctuary.achievementsEmpty')</p>
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

      <MgModal open={visionOpen} title={t('sanctuary.newVisionCard')} onClose={() => setVisionOpen(false)}>
        <form className="mg-form" onSubmit={saveVision}>
          <Field label={t('sanctuary.titleLabel')}>
            <input autoFocus value={vTitle} onChange={(e) => setVTitle(e.target.value)} placeholder={t('sanctuary.titlePlaceholder')} />
          </Field>
          <Field label={t('sanctuary.noteLabel')}>
            <textarea rows={2} value={vNote} onChange={(e) => setVNote(e.target.value)} placeholder={t('sanctuary.notePlaceholder')} />
          </Field>
          <Field label={t('sanctuary.symbolLabel')}>
            <div className="mg-emojipick">
              {VISION_ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`mg-emojiopt ${vEmoji === ic ? 'active' : ''}`}
                  onClick={() => setVEmoji(ic)}
                >
                  <PngIcon name={ic} size={26} />
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('goals.colorLabel')}>
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
            <button type="button" className="mg-btn glass" onClick={() => setVisionOpen(false)}>
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
