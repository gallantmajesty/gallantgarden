// draw.io embed protocol (postMessage) handler.
// Protocol docs: https://www.drawio.com/doc/faq/embed-mode

export interface DrawioMessage {
  action?: string
  event?: string
  [key: string]: unknown
}

export interface DrawioLoadOptions {
  xml: string
  autosave?: number
  diffSync?: number
  exportProtocol?: number
  configure?: number
  proto?: string
  ui?: string
  chrome?: number
  plugins?: number
  pv?: string
  noSaveBtn?: number
  noExitBtn?: number
  saveAndExit?: number
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

export type DrawioIncomingEvent = DrawioSaveEvent | DrawioExportEvent | Record<string, unknown>

export class DrawioProtocol {
  private iframe: HTMLIFrameElement | null = null
  private targetOrigin = '*'
  private handlers = new Map<string, (e: DrawioIncomingEvent) => void>()
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>()
  private reqId = 0
  private ready = false

  attach(iframe: HTMLIFrameElement) {
    this.iframe = iframe
    window.addEventListener('message', this.onMessage)
  }
  detach() {
    window.removeEventListener('message', this.onMessage)
    this.iframe = null
    this.ready = false
  }

  private onMessage = (event: MessageEvent) => {
    if (!this.iframe || event.source !== this.iframe.contentWindow) return
    let data: DrawioMessage
    try { data = JSON.parse(event.data) } catch { return }

    if (data.action && data.requestId) {
      const p = this.pending.get(String(data.requestId))
      if (p) {
        this.pending.delete(String(data.requestId))
        if (data.error) p.reject(new Error(String(data.error)))
        else p.resolve(data)
      }
      return
    }
    if (data.event) {
      this.handlers.get(data.event)?.(data as DrawioIncomingEvent)
      this.handlers.get('*')?.(data as DrawioIncomingEvent)
    }
    if (data.action === 'create' || (data.event === 'ready' && (data as { version?: string }).version)) {
      this.ready = true
      this.handlers.get('ready')?.(data as DrawioIncomingEvent)
      this.handlers.get('*')?.(data as DrawioIncomingEvent)
    }
  }

  on(event: string, handler: (e: DrawioIncomingEvent) => void) {
    this.handlers.set(event, handler)
    return () => this.handlers.delete(event)
  }

  private send(msg: DrawioMessage) {
    if (!this.iframe?.contentWindow) throw new Error('iframe not attached')
    this.iframe.contentWindow.postMessage(JSON.stringify(msg), this.targetOrigin)
  }

  private sendWithResponse(msg: DrawioMessage): Promise<unknown> {
    const id = `${++this.reqId}`
    const full = { ...msg, requestId: id }
    this.send(full)
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error('timeout'))
        }
      }, 10000)
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
    }).then(() => undefined)
  }

  save(): Promise<void> {
    return this.sendWithResponse({ action: 'save' }).then(() => undefined)
  }

  export(format: 'xml' | 'png' | 'svg', opts: Record<string, unknown> = {}): Promise<DrawioExportEvent> {
    return this.sendWithResponse({ action: 'export', format, spin: 'Exporting…', ...opts }) as Promise<DrawioExportEvent>
  }

  invokeAction(actionName: string): Promise<void> {
    return this.sendWithResponse({ action: 'invokeAction', actionName }).then(() => undefined)
  }

  getXml(): Promise<string> {
    return this.sendWithResponse({ action: 'getXml' }) as Promise<string>
  }

  isReady() { return this.ready }
}

export function createDrawioUrl(baseUrl: string, opts: Record<string, unknown> = {}): string {
  const p = new URLSearchParams()
  const known = ['embed', 'proto', 'ui', 'chrome', 'plugins', 'configure', 'pv', 'css', 'noSaveBtn', 'noExitBtn', 'saveAndExit']
  for (const [k, v] of Object.entries(opts)) {
    if (known.includes(k) || !known.includes(k)) p.set(k, String(v))
  }
  return `${baseUrl}?${p.toString()}`
}
