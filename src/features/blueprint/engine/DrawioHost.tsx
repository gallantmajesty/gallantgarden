// Embedded draw.io host for the rebuilt Blueprint.
//
// Runs draw.io in EMBED + chromeless-ish mode so its own logo, menus, footer
// (GitHub) and "unsaved changes" bar never render. A FocusLily top bar (built
// separately) drives it via the postMessage protocol, so the editor looks like
// FocusLily while keeping 100% of draw.io's tools.

import { useEffect, useRef } from 'react'
import { DrawioProtocol, createDrawioUrl } from './drawioProtocol'

const BLANK = `<mxfile host="focuslily"><diagram name="Board" id="b1"><mxGraphModel dx="1000" dy="600" grid="1" gridSize="24" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`

let activeProto: DrawioProtocol | null = null
export function useDrawioProtocol() {
  return activeProto
}

export interface DrawioHostProps {
  xml: string
  baseUrl?: string
  onSave?: (xml: string) => void
  onReady?: () => void
}

export function DrawioHost({ xml, baseUrl = `${import.meta.env.BASE_URL}diagram/`, onSave, onReady }: DrawioHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const protoRef = useRef<DrawioProtocol | null>(null)
  const readyFired = useRef(false)
  const xmlRef = useRef(xml)
  xmlRef.current = xml
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const proto = new DrawioProtocol()
    protoRef.current = proto
    activeProto = proto
    proto.attach(iframe)

    const loadCurrent = () =>
      proto.load(xmlRef.current, { autosave: 1, diffSync: 1, exportProtocol: 1, configure: 1, proto: 'json' }).catch(() => {})

    const fire = () => {
      if (readyFired.current) return
      readyFired.current = true
      loadCurrent()
      onReady?.()
    }
    const offReady = proto.on('ready', fire)
    const offInit = proto.on('init', fire)
    const offSave = proto.on('save', (e) => {
      const xml = (e as { xml?: string }).xml
      if (xml) onSaveRef.current?.(xml)
    })

    return () => {
      offReady()
      offInit()
      offSave()
      proto.detach()
      protoRef.current = null
      activeProto = null
      readyFired.current = false
    }
  }, [onReady])

  const url = createDrawioUrl(baseUrl, {
    embed: '1',
    proto: 'json',
    chromeless: '1',
    chrome: '0',
    plugins: '1',
    configure: '1',
    pv: '0',
    saveAndExit: '0',
    noSaveBtn: '1',
    noExitBtn: '1',
    ui: 'dark',
    css: `${baseUrl}focuslily-theme.css`,
  })

  return (
    <div className="fl-drawio-host">
      <iframe ref={iframeRef} className="fl-drawio-frame" src={url} title="FocusLily Blueprint" frameBorder={0} allowFullScreen />
    </div>
  )
}

export { BLANK }
