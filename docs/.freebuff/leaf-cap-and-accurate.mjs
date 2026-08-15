// 1) ResourceBar: no fixed 10k cap — fill is relative to the largest balance.
// 2) ScorePanel: exact h/m durations everywhere instead of rounded "2h".
import { readFileSync, writeFileSync } from 'node:fs'

function patch(path, pairs) {
  let s = readFileSync(path, 'utf8')
  const eol = s.includes('\r\n') ? '\r\n' : '\n'
  let text = s.replace(/\r\n/g, '\n')
  for (const [from, to] of pairs) {
    if (!text.includes(from)) {
      console.error(`MISS in ${path}: ${JSON.stringify(from.slice(0, 80))}`)
      process.exit(1)
    }
    text = text.split(from).join(to)
  }
  writeFileSync(path, text.split('\n').join(eol))
  console.log(`patched ${path}`)
}

// ---- ResourceBar.tsx ----
patch('src/components/ResourceBar.tsx', [
  ["// Hover any bar to see the percentage filled (max 10000 per leaf type).", "// Hover any bar to see the balance. Fill is relative to the largest balance,\n// so there's no fixed cap — leaves keep filling forever."],
  ["const MAX_LEAVES = 10_000\n\nexport function ResourceBar() {\n  const xp = useProfile((s) => s.xp)\n  const premiumXp = useProfile((s) => s.premiumXp)\n\n  const leafPct = Math.min(100, Math.round((xp / MAX_LEAVES) * 100))\n  const goldenPct = Math.min(100, Math.round((premiumXp / MAX_LEAVES) * 100))",
   "export function ResourceBar() {\n  const xp = useProfile((s) => s.xp)\n  const premiumXp = useProfile((s) => s.premiumXp)\n\n  // No fixed cap: the bar fills relative to the largest balance, so it always\n  // keeps growing no matter how many leaves are earned.\n  const ref = Math.max(10_000, xp, premiumXp)\n  const leafPct = Math.min(100, Math.round((xp / ref) * 100))\n  const goldenPct = Math.min(100, Math.round((premiumXp / ref) * 100))"],
  ["title={`${leafPct}% filled — ${xp.toLocaleString()} / ${MAX_LEAVES.toLocaleString()} leaves`}", "title={`${xp.toLocaleString()} leaves`}"],
  ["title={`${goldenPct}% filled — ${premiumXp.toLocaleString()} / ${MAX_LEAVES.toLocaleString()} golden leaves`}", "title={`${premiumXp.toLocaleString()} golden leaves`}"],
])

// ---- ScorePanel.tsx ----
patch('src/components/ScorePanel.tsx', [
  // Exact duration helper — never collapses minutes into hours alone.
  ["function defaultBreakMin(breakCount: number, custom: Record<number, number>): number {", "// Exact, human-readable duration — never collapses minutes to hours alone.\n// Focus sessions are stored at minute precision, so this is the true value.\nfunction fmtDuration(min: number): string {\n  const m = Math.round(min)\n  if (m < 60) return `${m}m`\n  const h = Math.floor(m / 60)\n  const rem = m % 60\n  return rem > 0 ? `${h}h ${rem}m` : `${h}h`\n}\n\nfunction defaultBreakMin(breakCount: number, custom: Record<number, number>): number {"],
  // Overview summary
  ["<Stat value={`${Math.round(totalActiveMin / 60)}h`} label=\"Active Time (30d)\" />", "<Stat value={fmtDuration(totalActiveMin)} label=\"Active Time (30d)\" />"],
  ["<Stat value={`${Math.round(engagement.totalFocusMin / 60)}h`} label=\"Focus Today\" />", "<Stat value={fmtDuration(engagement.totalFocusMin)} label=\"Focus Today\" />"],
  // Module highlight cards
  ["<span className=\"sp-module-metric\">{pomo.sessions} sessions · {Math.round(pomo.totalFocus / 60)}h</span>", "<span className=\"sp-module-metric\">{pomo.sessions} sessions · {fmtDuration(pomo.totalFocus)}</span>"],
  ["<span className=\"sp-module-metric\">{Math.round(totalActiveMin / 60)}h / 30d</span>", "<span className=\"sp-module-metric\">{fmtDuration(totalActiveMin)} / 30d</span>"],
  // Web & Online summary
  ["<Stat value={`${Math.round(totalActiveMin / 60)}h`} label=\"Online Time (30d)\" />", "<Stat value={fmtDuration(totalActiveMin)} label=\"Online Time (30d)\" />"],
  // Breaks summary + session rows
  ["<Stat value={`${pomo.breakMin}m`} label=\"Break Time\" />", "<Stat value={fmtDuration(pomo.breakMin)} label=\"Break Time\" />"],
  ["<span className=\"sp-session-focus\">{h.totalFocusMinutes}m</span>", "<span className=\"sp-session-focus\">{fmtDuration(h.totalFocusMinutes)}</span>"],
])
