import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/components/magnet/views/CalendarView.css'
let src = readFileSync(path, 'utf8')
let applied = 0

const edits = [
  {
    from: `.mg-cal-dock {
  position: relative;
  flex: none;
  height: 92px;
  margin-top: 20px;
}`,
    to: `.mg-cal-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 0 0 12px;
}
.mg-cal-stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--mg-border);
  background: var(--mg-tag);
  color: var(--mg-text-soft);
  font-size: 0.76rem;
}
.mg-cal-stat b {
  color: var(--mg-text);
  font-weight: 700;
}
.mg-cal-stat.ok {
  border-color: color-mix(in srgb, var(--mg-accent) 45%, var(--mg-border));
  color: var(--mg-accent);
}
.mg-cal-stat.ok b {
  color: var(--mg-accent);
}
.mg-cal-dragtip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 6px;
  font-size: 0.72rem;
  color: var(--mg-text-soft);
  opacity: 0.75;
}

.mg-cal-dock {
  position: relative;
  flex: none;
  height: 92px;
  margin-top: 20px;
}`,
  },
  {
    from: `.mg-cal-cell.selected {
  box-shadow: 0 0 0 2px var(--mg-accent2);
}`,
    to: `.mg-cal-cell.selected {
  box-shadow: 0 0 0 2px var(--mg-accent2);
}
.mg-cal-cell.drag-over {
  border-color: var(--mg-accent);
  box-shadow: 0 0 0 2px var(--mg-accent), inset 0 0 0 1px var(--mg-accent);
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--mg-accent) 8%, var(--mg-panel));
}`,
  },
  {
    from: `.mg-cal-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 100%;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.72rem;
  line-height: 1.3;
  color: var(--mg-text);
  background: var(--mg-tag);
  /* chips are interactive buttons now — open the task editor */
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: filter 0.15s, transform 0.1s;
}
.mg-cal-chip:hover { filter: brightness(1.18); }
.mg-cal-chip:active { transform: scale(0.97); }
.mg-cal-chip.task {
  background: color-mix(in srgb, var(--mg-c) 18%, transparent);
  border-left: 3px solid var(--mg-c);
}
.mg-cal-chip.task.done {
  opacity: 0.6;
}
.mg-cal-chip.task.done .mg-cal-chip-txt {
  text-decoration: line-through;
}`,
    to: `.mg-cal-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.72rem;
  line-height: 1.3;
  color: var(--mg-text);
  background: var(--mg-tag);
  /* chips are interactive — click opens the editor, drag moves the task */
  border: none;
  cursor: grab;
  text-align: left;
  font-family: inherit;
  transition: filter 0.15s, transform 0.1s, box-shadow 0.15s;
}
.mg-cal-chip:hover { filter: brightness(1.18); }
.mg-cal-chip:active { transform: scale(0.97); cursor: grabbing; }
.mg-cal-chip.task {
  background: color-mix(in srgb, var(--mg-c) 18%, transparent);
  border-left: 3px solid var(--mg-c);
}
.mg-cal-chip.task.done {
  opacity: 0.65;
}
.mg-cal-chip.task.done .mg-cal-chip-txt {
  text-decoration: line-through;
}
.mg-cal-chip-done {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--mg-c);
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.15s, background 0.15s, transform 0.1s;
}
.mg-cal-chip:hover .mg-cal-chip-done { opacity: 1; }
.mg-cal-chip-done:hover {
  background: color-mix(in srgb, var(--mg-c) 22%, transparent);
  transform: scale(1.12);
}
.mg-cal-chip.task.done .mg-cal-chip-done { opacity: 1; }
.mg-cal-ring {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  border: 1.5px solid var(--mg-c);
  box-sizing: border-box;
}`,
  },
  {
    from: `.mg-cal-chip-txt {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}`,
    to: `.mg-cal-chip-txt {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mg-cal-chip-txt.done {
  text-decoration: line-through;
}`,
  },
  {
    from: `.mg-cal-task {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
  border: none;
  background: none;
  border-radius: 8px;
  color: var(--mg-text);
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.mg-cal-task:hover {
  background: color-mix(in srgb, var(--mg-c) 14%, transparent);
}`,
    to: `.mg-cal-task {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 4px 6px;
  border: none;
  background: none;
  border-radius: 8px;
  color: var(--mg-text);
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.mg-cal-task:hover {
  background: color-mix(in srgb, var(--mg-c) 14%, transparent);
}
.mg-cal-task.done { opacity: 0.7; }
.mg-cal-task-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--mg-text-soft);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}
.mg-cal-list li:hover .mg-cal-task-edit {
  opacity: 1;
}
.mg-cal-task-edit:hover {
  background: var(--mg-tag);
  color: var(--mg-text);
}`,
  },
  {
    from: `.mg-cal-done {
  text-decoration: line-through;
  color: var(--mg-text-soft);
}`,
    to: `.mg-cal-done {
  text-decoration: line-through;
  color: var(--mg-text-soft);
}
.mg-cal-day-headrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.mg-cal-day-headrow .mg-cal-day-head {
  margin: 0;
}`,
  },
]

for (const e of edits) {
  if (!src.includes(e.from)) {
    console.error('NOT FOUND:\n---\n' + e.from.slice(0, 120) + '\n---')
    continue
  }
  src = src.replace(e.from, e.to)
  applied++
}
writeFileSync(path, src, 'utf8')
console.log(`Applied ${applied}/${edits.length} edits`)
