// draw.io embed postMessage protocol
// Docs: https://www.drawio.com/doc/faq/embed-mode

export interface DrawioMessage {
  action?: string
  event?: string
  requestId?: string
  error?: string
  [key: string]: unknown
}

export interface DrawioLoadOptions {
  xml: string
  autosave?: number
  diffSync?: number
  exportProtocol?: number
  configure?: number
  proto?: string
}

export interface DrawioSaveEvent {
  event: 'save'
  xml: string
  [key: string]: unknown
}

export interface DrawioExportEvent {
  event: 'export'
  format: string
  data: string
  xml: string
  [key: string]: unknown
}

export type DrawioIncomingEvent =
  | DrawioSaveEvent
  | DrawioExportEvent
  | Record<string, unknown>

export class DrawioProtocol {
  private iframe: HTMLIFrameElement | null = null
  private targetOrigin = '*'
  private handlers = new Map<string, Set<(e: DrawioIncomingEvent) => void>>()
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>()
  private reqId = 0
  private _ready = false

  attach(iframe: HTMLIFrameElement) {
    this.iframe = iframe
    window.addEventListener('message', this.onMessage)
  }

  detach() {
    window.removeEventListener('message', this.onMessage)
    this.iframe = null
    this._ready = false
  }

  private onMessage = (event: MessageEvent) => {
    if (!this.iframe || event.source !== this.iframe.contentWindow) return
    let data: DrawioMessage
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
    } catch {
      return
    }

    // Response to a request we sent
    if (data.requestId) {
      const p = this.pending.get(String(data.requestId))
      if (p) {
        this.pending.delete(String(data.requestId))
        if (data.error) p.reject(new Error(String(data.error)))
        else p.resolve(data)
        return
      }
    }

    // Incoming event from draw.io
    const evtName = data.event as string | undefined
    if (evtName) {
      this.emit(evtName, data as DrawioIncomingEvent)
      this.emit('*', data as DrawioIncomingEvent)
    }

    // draw.io signals ready via action:'create' OR event:'ready'
    if (data.action === 'create' || evtName === 'ready') {
      this._ready = true
      this.emit('ready', data as DrawioIncomingEvent)
    }
    // Also fires 'init' in some versions
    if (evtName === 'init') {
      this._ready = true
      this.emit('init', data as DrawioIncomingEvent)
      this.emit('ready', data as DrawioIncomingEvent)
    }
  }

  on(event: string, handler: (e: DrawioIncomingEvent) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return () => this.handlers.get(event)?.delete(handler)
  }

  private emit(event: string, data: DrawioIncomingEvent) {
    this.handlers.get(event)?.forEach((h) => h(data))
  }

  private send(msg: DrawioMessage) {
    if (!this.iframe?.contentWindow) return
    this.iframe.contentWindow.postMessage(JSON.stringify(msg), this.targetOrigin)
  }

  private sendWithResponse(msg: DrawioMessage, timeoutMs = 12000): Promise<unknown> {
    const id = `${++this.reqId}`
    this.send({ ...msg, requestId: id })
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`drawio timeout: ${msg.action}`))
        }
      }, timeoutMs)
    })
  }

  load(xml: string, opts: Partial<DrawioLoadOptions> = {}): Promise<void> {
    return this.sendWithResponse({
      action: 'load',
      xml,
      autosave: 1,
      diffSync: 1,
      exportProtocol: 1,
      configure: 1,
      proto: 'json',
      ...opts,
    }).then(() => undefined).catch(() => undefined)
  }

  save(): Promise<void> {
    return this.sendWithResponse({ action: 'save' }).then(() => undefined).catch(() => undefined)
  }

  export(format: 'xml' | 'png' | 'svg', opts: Record<string, unknown> = {}): Promise<DrawioExportEvent> {
    return this.sendWithResponse({ action: 'export', format, spin: 'Exporting…', ...opts }) as Promise<DrawioExportEvent>
  }

  invokeAction(actionName: string): Promise<void> {
    return this.sendWithResponse({ action: 'invokeAction', actionName }).then(() => undefined).catch(() => undefined)
  }

  getXml(): Promise<string> {
    return this.sendWithResponse({ action: 'getXml' }).then((r) => (r as { xml?: string }).xml ?? '') 
  }

  isReady() {
    return this._ready
  }
}

export function createDrawioUrl(baseUrl: string, opts: Record<string, string> = {}): string {
  const p = new URLSearchParams(opts)
  return `${baseUrl}?${p.toString()}`
}
