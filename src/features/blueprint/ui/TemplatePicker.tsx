import { useBlueprint } from '../store'

export interface BlueprintTemplate {
  id: string
  name: string
  desc: string
  icon: string
  xml: string
}

interface N {
  id: string
  x: number
  y: number
  w: number
  h: number
  value: string
  style: string
}

interface E {
  id: string
  source: string
  target: string
  value?: string
  style?: string
}

const ACCENT = '#5b7cfa'
const HEAD = `rounded=1;whiteSpace=wrap;html=1;fillColor=${ACCENT};strokeColor=${ACCENT};fontColor=#ffffff;fontStyle=1;fontSize=14;`
const CARD = 'rounded=1;whiteSpace=wrap;html=1;fillColor=#1f2a3f;strokeColor=#39424f;fontColor=#e2e8f8;fontSize=12;'
const SLOT = 'rounded=0;whiteSpace=wrap;html=1;fillColor=#161f2e;strokeColor=#39424f;fontColor=#aeb9cc;fontSize=11;'
const DIAMOND = 'rhombus;whiteSpace=wrap;html=1;fillColor=#4d5b8c;strokeColor=#4d5b8c;fontColor=#e2e8f8;fontSize=12;'
const ELLIPSE = `ellipse;whiteSpace=wrap;html=1;fillColor=${ACCENT};strokeColor=${ACCENT};fontColor=#ffffff;fontStyle=1;fontSize=13;`
const EDGE = `edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;jettySize=auto;endArrow=block;endFill=1;strokeColor=${ACCENT};strokeWidth=1.5;`

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function build(name: string, nodes: N[], edges: E[] = []): string {
  const cells = [
    '<mxCell id="0"/>',
    '<mxCell id="1" parent="0"/>',
    ...nodes.map(
      (n) =>
        `<mxCell id="${n.id}" value="${esc(n.value)}" style="${n.style}" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`,
    ),
    ...edges.map(
      (e) =>
        `<mxCell id="${e.id}" value="${esc(e.value ?? '')}" style="${e.style ?? EDGE}" edge="1" parent="1" source="${e.source}" target="${e.target}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    ),
  ].join('')
  return `<mxfile host="focuslily"><diagram name="${esc(name)}" id="bl-${name.toLowerCase().replace(/\s+/g, '-')}"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="1400" pageHeight="900" math="0" shadow="0"><root>${cells}</root></mxGraphModel></diagram></mxfile>`
}

function blankXml(): string {
  return '<mxfile><diagram name="Page-1" id="page1"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="1400" pageHeight="900" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'
}

function mindMapXml(): string {
  const nodes: N[] = [
    { id: 'c', x: 100, y: 360, w: 180, h: 72, value: 'Study Topic', style: HEAD },
    { id: 'm1', x: 380, y: 150, w: 150, h: 60, value: 'Foundation', style: CARD },
    { id: 'm2', x: 380, y: 300, w: 150, h: 60, value: 'Research', style: CARD },
    { id: 'm3', x: 380, y: 460, w: 150, h: 60, value: 'Practice', style: CARD },
    { id: 'm4', x: 380, y: 620, w: 150, h: 60, value: 'Review', style: CARD },
    { id: 's1', x: 640, y: 120, w: 160, h: 44, value: 'Core ideas', style: SLOT },
    { id: 's2', x: 640, y: 196, w: 160, h: 44, value: 'Set a baseline', style: SLOT },
    { id: 's3', x: 640, y: 280, w: 160, h: 44, value: 'Find sources', style: SLOT },
    { id: 's4', x: 640, y: 356, w: 160, h: 44, value: 'Take notes', style: SLOT },
    { id: 's5', x: 640, y: 440, w: 160, h: 44, value: 'Active recall', style: SLOT },
    { id: 's6', x: 640, y: 516, w: 160, h: 44, value: 'Apply it', style: SLOT },
    { id: 's7', x: 640, y: 600, w: 160, h: 44, value: 'Quiz yourself', style: SLOT },
    { id: 's8', x: 640, y: 676, w: 160, h: 44, value: 'Summarise', style: SLOT },
  ]
  const edges: E[] = [
    { id: 'e0', source: 'c', target: 'm1' },
    { id: 'e1', source: 'c', target: 'm2' },
    { id: 'e2', source: 'c', target: 'm3' },
    { id: 'e3', source: 'c', target: 'm4' },
  ]
  const subs: [string, string, string][] = [
    ['m1', 's1', 'e4'],
    ['m1', 's2', 'e5'],
    ['m2', 's3', 'e6'],
    ['m2', 's4', 'e7'],
    ['m3', 's5', 'e8'],
    ['m3', 's6', 'e9'],
    ['m4', 's7', 'e10'],
    ['m4', 's8', 'e11'],
  ]
  for (const [s, t, id] of subs) edges.push({ id, source: s, target: t, style: EDGE })
  return build('Mind Map', nodes, edges)
}

function flowchartXml(): string {
  const nodes: N[] = [
    { id: 's', x: 300, y: 120, w: 140, h: 52, value: 'Start', style: ELLIPSE },
    { id: 'a', x: 300, y: 220, w: 320, h: 72, value: 'Understand the task', style: CARD },
    { id: 'q', x: 300, y: 360, w: 170, h: 100, value: 'Is this clear?', style: DIAMOND },
    { id: 'yes', x: 300, y: 520, w: 330, h: 66, value: 'Dive into deep work', style: CARD },
    { id: 'no', x: 620, y: 400, w: 220, h: 66, value: 'Gather the gaps', style: CARD },
    { id: 'r', x: 320, y: 650, w: 140, h: 52, value: 'Done', style: ELLIPSE },
  ]
  const edges: E[] = [
    { id: 'e1', source: 's', target: 'a', value: 'begin' },
    { id: 'e2', source: 'a', target: 'q' },
    { id: 'e3', source: 'q', target: 'yes', value: 'yes' },
    { id: 'e4', source: 'q', target: 'no', value: 'no' },
    { id: 'e5', source: 'no', target: 'yes', value: 'close gaps' },
    { id: 'e6', source: 'yes', target: 'r', value: 'finish' },
  ]
  return build('Flowchart', nodes, edges)
}

function roadmapXml(): string {
  const nodes: N[] = [
    { id: 't', x: 600, y: 26, w: 220, h: 60, value: 'Study Roadmap', style: HEAD },
    { id: 'p1', x: 180, y: 150, w: 320, h: 420, value: 'Phase 1\nFoundation\n\n• Course overview\n• Core concepts\n• Daily habit', style: CARD },
    { id: 'p2', x: 580, y: 150, w: 320, h: 420, value: 'Phase 2\nDeep Dive\n\n• Practice problems\n• A small project', style: CARD },
    { id: 'p3', x: 980, y: 150, w: 320, h: 420, value: 'Phase 3\nExam Prep\n\n• Mock tests\n• Review weak spots', style: CARD },
  ]
  const edges: E[] = [
    { id: 't1', source: 't', target: 'p1' },
    { id: 't2', source: 't', target: 'p2' },
    { id: 't3', source: 't', target: 'p3' },
    { id: 'e1', source: 'p1', target: 'p2', value: 'next' },
    { id: 'e2', source: 'p2', target: 'p3', value: 'next' },
  ]
  return build('Study Roadmap', nodes, edges)
}

function plannerXml(): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const top = ['Focus block', 'Review', 'Lab', 'Mock', 'Drill', 'Cheat day', 'Plan week']
  const top2 = ['Deep work', 'Notes', 'Calc', 'Essay', 'Recall', 'Rest', 'Reset']
  const nodes: N[] = []
  days.forEach((d, i) => {
    const x = 40 + i * 180
    nodes.push({ id: `h${i}`, x, y: 60, w: 160, h: 44, value: d, style: HEAD })
    nodes.push({ id: `r${i}0`, x, y: 160, w: 160, h: 120, value: top[i], style: SLOT })
    nodes.push({ id: `r${i}1`, x, y: 330, w: 160, h: 120, value: top2[i], style: SLOT })
  })
  return build('Weekly Planner', nodes, [])
}

function conceptXml(): string {
  const terms = [
    ['s1', 'Recall', 80, 120],
    ['s2', 'Design', 420, 120],
    ['s3', 'Space', 80, 480],
    ['s4', 'Apply', 420, 480],
  ] as [string, string, number, number][]
  const nodes: N[] = [{ id: 'c', x: 250, y: 280, w: 170, h: 80, value: 'Concept', style: HEAD }]
  const edges: E[] = []
  terms.forEach(([id, val, x, y], i) => {
    nodes.push({ id, x, y, w: 190, h: 72, value: val, style: CARD })
    edges.push({ id: `e${i}`, source: 'c', target: id })
  })
  return build('Concept Web', nodes, edges)
}

export const BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [
  { id: 'blank', name: 'Blank', desc: 'An empty canvas to start from scratch.', icon: '🗒️', xml: blankXml() },
  { id: 'mindmap', name: 'Mind Map', desc: 'Branch ideas around one central topic.', icon: '🧠', xml: mindMapXml() },
  { id: 'flowchart', name: 'Flowchart', desc: 'A classic start–decision–done flow.', icon: '🔀', xml: flowchartXml() },
  { id: 'roadmap', name: 'Study Roadmap', desc: 'Phases, milestones and study tips.', icon: '🗺️', xml: roadmapXml() },
  { id: 'planner', name: 'Weekly Planner', desc: 'A seven-day grid for blocks & tasks.', icon: '📅', xml: plannerXml() },
  { id: 'concept', name: 'Concept Web', desc: 'Link related ideas around a core idea.', icon: '🕸️', xml: conceptXml() },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function TemplatePicker({ open, onClose }: Props) {
  const createBoard = useBlueprint((s) => s.createBoard)
  if (!open) return null
  const pick = (t: BlueprintTemplate) => {
    createBoard(t.name, t.xml)
    onClose()
  }
  return (
    <div className="fl-modal-backdrop" onClick={onClose}>
      <div
        className="fl-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Start from a template"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fl-modal-header">
          <h2 className="fl-modal-title">Start from a template</h2>
          <button className="fl-modal-close" onClick={onClose} aria-label="Close templates">
            ✕
          </button>
        </div>
        <div className="fl-template-grid">
          {BLUEPRINT_TEMPLATES.map((t) => (
            <button key={t.id} className="fl-template-card" onClick={() => pick(t)}>
              <div className="fl-template-icon" aria-hidden>
                {t.icon}
              </div>
              <div className="fl-template-name">{t.name}</div>
              <div className="fl-template-desc">{t.desc}</div>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#636b82' }}>Starts from a new board — your current board is saved as-is.</p>
      </div>
    </div>
  )
}