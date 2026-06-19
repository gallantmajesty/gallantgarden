import { useMemo } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { autoPorts } from '../../lib/blueprint/geom'
import { detectClusters, revisionPath, suggestConnections, summarize, weakAreas } from '../../lib/blueprint/ai'
import { centerOnNode } from './SearchPanel'

// The "AI" panel — all suggestions come from local heuristics (see lib/ai.ts).
export function AIPanel({ onClose }: { onClose: () => void }) {
  const doc = useBlueprint((s) => s.doc)
  const addEdge = useBlueprint((s) => s.addEdge)
  const selectMany = useBlueprint((s) => s.selectMany)

  const suggestions = useMemo(() => suggestConnections(doc), [doc])
  const clusters = useMemo(() => detectClusters(doc), [doc])
  const summary = useMemo(() => summarize(doc), [doc])
  const weak = useMemo(() => weakAreas(doc), [doc])
  const revision = useMemo(() => revisionPath(doc), [doc])

  function go(nodeId: string) {
    const n = doc.nodes.find((x) => x.id === nodeId)
    if (n) centerOnNode(n)
  }

  function link(fromId: string, toId: string) {
    const from = doc.nodes.find((n) => n.id === fromId)
    const to = doc.nodes.find((n) => n.id === toId)
    if (!from || !to) return
    const { fromPort, toPort } = autoPorts(from, to)
    const typeId = useBlueprint.getState().activeTypeId || doc.connectionTypes[0]?.id || 'link'
    addEdge(fromId, fromPort, toId, toPort, typeId)
  }

  return (
    <div className="bp-panel bp-ai bp-surface">
      <div className="bp-panel-head">
        <strong>✦ Board Intelligence</strong>
        <button className="bp-x" onClick={onClose}>✕</button>
      </div>

      <div className="bp-ai-scroll">
        <Block title="Summary">
          <p className="bp-ai-summary">{summary}</p>
        </Block>

        <Block title={`Suggested connections (${suggestions.length})`}>
          {suggestions.length === 0 && <p className="bp-empty">No new links found — add more notes or tags.</p>}
          {suggestions.map((s) => (
            <div key={s.fromId + s.toId} className="bp-ai-row">
              <span className="bp-ai-pair"><b>{s.fromLabel}</b> ↔ <b>{s.toLabel}</b><em>{s.reason}</em></span>
              <button className="sf-btn secondary tiny" onClick={() => link(s.fromId, s.toId)}>Link</button>
            </div>
          ))}
        </Block>

        <Block title={`Clusters (${clusters.length})`}>
          {clusters.length === 0 && <p className="bp-empty">Add tags to notes to surface clusters.</p>}
          {clusters.map((c) => (
            <div key={c.name} className="bp-ai-row">
              <span className="bp-ai-pair"><b>{c.name}</b><em>{c.nodeIds.length} notes</em></span>
              <button className="sf-btn secondary tiny" onClick={() => selectMany(c.nodeIds)}>Select</button>
            </div>
          ))}
        </Block>

        <Block title={`Weak areas (${weak.length})`}>
          {weak.length === 0 && <p className="bp-empty">Nothing flagged — nicely connected!</p>}
          {weak.map((w) => (
            <button key={w.nodeId} className="bp-ai-listbtn" onClick={() => go(w.nodeId)}>
              <b>{w.label}</b><em>{w.reason}</em>
            </button>
          ))}
        </Block>

        <Block title="Revision path">
          <ol className="bp-ai-path">
            {revision.map((r) => (
              <li key={r.nodeId}><button onClick={() => go(r.nodeId)}>{r.label}</button></li>
            ))}
          </ol>
        </Block>
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
