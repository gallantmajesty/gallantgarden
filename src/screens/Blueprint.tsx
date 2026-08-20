import { useEffect, useState } from 'react'
import { useAuth } from '../store/auth'
import { useBlueprint } from '../features/blueprint/store'
import { DrawioHost, useDrawioProtocol } from '../features/blueprint/engine/DrawioHost'
import { BlueprintTopBar } from '../features/blueprint/ui/BlueprintTopBar'
import { BlueprintSidebar } from '../features/blueprint/ui/BlueprintSidebar'
import { TemplatePicker } from '../features/blueprint/ui/TemplatePicker'
import '../features/blueprint/ui/Blueprint.css'

export function Blueprint() {
  const { user } = useAuth()
  const hydrate = useBlueprint((s) => s.hydrate)
  const ready = useBlueprint((s) => s.ready)
  const boards = useBlueprint((s) => s.boards)
  const activeId = useBlueprint((s) => s.activeId)
  const setActiveXml = useBlueprint((s) => s.setActiveXml)
  const markUnsaved = useBlueprint((s) => s.markUnsaved)
  const createBoard = useBlueprint((s) => s.createBoard)
  const [templatesOpen, setTemplatesOpen] = useState(false)

  useEffect(() => {
    if (user?.id) void hydrate(user.id)
  }, [user?.id, hydrate])

  // Global keyboard shortcuts (fire only when the page, not the iframe, has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTemplatesOpen(false)
        return
      }
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'n') {
        e.preventDefault()
        createBoard()
      } else if (k === 's') {
        e.preventDefault()
        void useDrawioProtocol()?.save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createBoard])

  const board = boards.find((b) => b.id === activeId)
  const xml = board?.xml ?? ''
  const title = board?.title ?? 'Blueprint'

  async function onExport(fmt: 'png' | 'svg' | 'xml') {
    const proto = useDrawioProtocol()
    if (!proto) return
    try {
      const ev = await proto.export(fmt, { xml })
      if (!ev) return
      const blob =
        fmt === 'xml' ? new Blob([ev.xml], { type: 'application/xml' }) : dataUrlToBlob(ev.data)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'blueprint'}.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[blueprint] export failed', e)
    }
  }

  if (!ready) {
    return (
      <div className="fl-bp-root">
        <div className="fl-bp-loading">
          <div className="fl-bp-spinner" />
          <span>Loading your board…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fl-bp-root dark">
      <BlueprintTopBar onExport={onExport} onTemplates={() => setTemplatesOpen(true)} />
      <div className="fl-bp-body">
        <BlueprintSidebar />
        <div className="fl-canvas-area">
          {board ? (
            <DrawioHost
              xml={xml}
              boardId={activeId}
              onSave={(x) => setActiveXml(x)}
              onDirty={() => markUnsaved()}
            />
          ) : null}
        </div>
      </div>
      <TemplatePicker open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </div>
  )
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'application/octet-stream'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
