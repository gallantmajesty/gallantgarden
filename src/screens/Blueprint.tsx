import { useEffect, useState } from 'react'
import { useAuth } from '../store/auth'
import { useBlueprint } from '../features/blueprint/store'
import { DrawioHost, useDrawioProtocol } from '../features/blueprint/engine/DrawioHost'
import { BlueprintTopBar } from '../features/blueprint/ui/BlueprintTopBar'
import type { DrawioProtocol } from '../features/blueprint/engine/drawioProtocol'
import '../features/blueprint/ui/Blueprint.css'

export function Blueprint() {
  const { user } = useAuth()
  const hydrate = useBlueprint((s) => s.hydrate)
  const ready = useBlueprint((s) => s.ready)
  const xml = useBlueprint((s) => s.xml)
  const title = useBlueprint((s) => s.title)
  const setTitle = useBlueprint((s) => s.setTitle)
  const setXml = useBlueprint((s) => s.setXml)
  const [uiDark] = useState(true)

  useEffect(() => {
    if (user?.id) void hydrate(user.id)
  }, [user?.id, hydrate])

  async function onExport(fmt: 'png' | 'svg' | 'xml') {
    const proto: DrawioProtocol | null = useDrawioProtocol()
    try {
      const ev = await proto?.export(fmt, { xml })
      if (!ev) return
      const blob = fmt === 'xml' ? new Blob([ev.xml], { type: 'application/xml' }) : dataUrlToBlob(ev.data)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'blueprint'}.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.warn('[blueprint] export failed', e)
    }
  }

  if (!ready) {
    return (
      <div className="fl-bp-root">
        <div className="fl-bp-loading">Loading your board…</div>
      </div>
    )
  }

  return (
    <div className={`fl-bp-root ${uiDark ? 'dark' : ''}`}>
      <BlueprintTopBar title={title} onTitleChange={setTitle} onExport={onExport} />
      <div className="fl-bp-body">
        <DrawioHost xml={xml} onSave={setXml} />
      </div>
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
