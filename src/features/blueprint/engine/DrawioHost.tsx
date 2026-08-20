// Embedded draw.io host — chromeless embed driven by our top bar via postMessage.

import { useEffect, useRef } from 'react'
import { DrawioProtocol, createDrawioUrl } from './drawioProtocol'

const BLANK = `<mxfile host="focuslily"><diagram name="Board" id="b1"><mxGraphModel dx="1000" dy="600" grid="1" gridSize="24" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`

let activeProto: DrawioProtocol | null = null
export function useDrawioProtocol(): DrawioProtocol | null {
  return activeProto
}

export interface DrawioHostProps {
  xml: string
  boardId: string
  baseUrl?: string
  onSave?: (xml: string) => void
  onReady?: () => void
  onDirty?: () => void
}

export function DrawioHost({
  xml,
  boardId,
  baseUrl = `${import.meta.env.BASE_URL}diagram/`,
  onSave,
  onReady,
  onDirty,
}: DrawioHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const protoRef = useRef<DrawioProtocol | null>(null)
  const readyFired = useRef(false)
  const xmlRef = useRef(xml)
  const onSaveRef = useRef(onSave)
  const onDirtyRef = useRef(onDirty)
  const prevBoardId = useRef(boardId)

  onSaveRef.current = onSave
  onDirtyRef.current = onDirty

  // When xml changes externally (board switch), reload into draw.io
  useEffect(() => {
    xmlRef.current = xml
    if (boardId !== prevBoardId.current && protoRef.current && readyFired.current) {
      prevBoardId.current = boardId
      protoRef.current.load(xml, { autosave: 1, diffSync: 1, exportProtocol: 1, proto: 'json' }).catch(() => {})
    }
  }, [xml, boardId])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const proto = new DrawioProtocol()
    protoRef.current = proto
    activeProto = proto
    proto.attach(iframe)
    prevBoardId.current = boardId

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
      const saved = (e as { xml?: string }).xml
      if (saved) onSaveRef.current?.(saved)
    })
    const offChange = proto.on('change', () => {
      onDirtyRef.current?.()
    })

    return () => {
      offReady()
      offInit()
      offSave()
      offChange()
      proto.detach()
      protoRef.current = null
      activeProto = null
      readyFired.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    dark: '1',
    spin: '1',
    libs: '1',
    modified: 'unsavedChanges',
    css: `${baseUrl}focuslily-theme.css`,
  })

  return (
    <div className="fl-drawio-host">
      <iframe
        ref={iframeRef}
        className="fl-drawio-frame"
        src={url}
        title="StudyForest Blueprint"
        frameBorder={0}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-top-navigation-by-user-activation"
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  )
}

export { BLANK }
