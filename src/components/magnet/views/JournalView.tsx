import { useState } from 'react'
import { useMagnet } from '../../../store/magnet'
import { SectionHead, Panel, EmptyState } from '../ui'
import { MOODS, MOOD_WORDS } from '../../../lib/magnet/moods'
import { Icon } from '../Icon'

export function JournalView() {
  const data = useMagnet((s) => s.data)
  const addJournal = useMagnet((s) => s.addJournal)
  const deleteJournal = useMagnet((s) => s.deleteJournal)

  const [mood, setMood] = useState(3)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() && !body.trim()) return
    addJournal({ mood, title: title.trim() || 'Untitled', body: body.trim() })
    setTitle('')
    setBody('')
    setMood(3)
  }

  return (
    <div className="mg-view">
      <SectionHead icon="journal" title="Journal" subtitle="A private page for today — nobody reads this but you" />

      <Panel className="mg-journal-compose">
        <form className="mg-form" onSubmit={submit}>
          <div className="mg-moodpick">
            <span className="mg-field-label">How did today feel?</span>
            <div className="mg-moods">
              {MOODS.map((m, i) => (
                <button
                  type="button"
                  key={i}
                  className={`mg-mood ${mood === i + 1 ? 'active' : ''}`}
                  onClick={() => setMood(i + 1)}
                  title={MOOD_WORDS[i]}
                >
                  <span className="mg-mood-emoji">{m}</span>
                  <span className="mg-mood-word">{MOOD_WORDS[i]}</span>
                </button>
              ))}
            </div>
          </div>
          <input
            className="mg-journal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A title for today…"
          />
          <textarea
            className="mg-journal-body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened, what you felt, what you learned…"
          />
          <div className="mg-form-actions">
            <button type="submit" className="mg-btn primary">
              <Icon name="journal" size={16} /> Save entry
            </button>
          </div>
        </form>
      </Panel>

      {data.journal.length === 0 ? (
        <EmptyState
          icon="journal"
          title="Your story, one day at a time"
          body="Write a line above. Over months these pages become a record of how far you've come."
        />
      ) : (
        <div className="mg-journal-list">
          {data.journal.map((j) => (
            <Panel key={j.id} className="mg-journal-entry">
              <div className="mg-journal-entry-head">
                <span className="mg-journal-mood">{MOODS[j.mood - 1]}</span>
                <div>
                  <strong>{j.title}</strong>
                  <small>{j.date}</small>
                </div>
                <button className="mg-iconbtn danger" onClick={() => deleteJournal(j.id)} aria-label="Delete">
                  <Icon name="trash" size={15} />
                </button>
              </div>
              {j.body && <p className="mg-journal-text">{j.body}</p>}
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
