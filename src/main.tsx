import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './store/auth'
import { supabaseConfigured } from './lib/supabase'
import { initSentry } from './lib/sentry'
import { initErrorReporting } from './lib/errorLogger'
import { SentryUserTracker } from './components/SentryUserTracker'
import { KeepAwakeProvider } from './components/KeepAwakeProvider'
import './i18n'

// Self-heal stale bundles: after a deploy, an opened tab still references the
// old hashed chunk names. Those 404 → "Failed to fetch dynamically imported
// module" → a crash overlay on every navigation. Instead of showing an error,
// reload once (the fresh index.html serves the new hashes). SessionStorage
// guards against a reload loop if the network is actually down.
let chunkReloaded = sessionStorage.getItem('sf.chunkReloaded')
window.addEventListener('error', (e) => {
  if (chunkReloaded) return
  const msg = String(e.message || '')
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
    chunkReloaded = '1'
    sessionStorage.setItem('sf.chunkReloaded', '1')
    console.warn('[main] stale chunk detected — reloading for new bundle')
    location.reload()
  }
})

// Global error display — any crash now shows the message on screen instead
// of a blank white page. Remove after the white-page issue is resolved.
window.addEventListener('error', (e) => {
  const stack = e.error?.stack ? `\n\n${e.error.stack}` : ''
  showGlobalError((e.error?.message || e.message || String(e.error)) + stack)
})
window.addEventListener('unhandledrejection', (e) => {
  showGlobalError((e.reason?.message || String(e.reason)) + (e.reason?.stack ? `\n\n${e.reason.stack}` : ''))
})

let globalErrorShown = false
function showGlobalError(msg: string) {
  if (globalErrorShown) return
  globalErrorShown = true
  // Reuse the pre-bundle #crash-error overlay from index.html (if present) so a
  // crash never produces two stacked overlays.
  const existing = document.getElementById('crash-error')
  const div = existing || document.createElement('div')
  if (!existing) {
    div.id = 'crash-error'
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#0f1410;color:#e8efe6;z-index:999999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;overflow:auto;'
    document.body.appendChild(div)
  }
  // Build the overlay with DOM APIs — error text may contain attacker-influenced
  // content, so it must never be written via innerHTML.
  const inner = document.createElement('div')
  inner.style.cssText = 'max-width:560px;text-align:center;'
  const icon = document.createElement('div')
  icon.textContent = '⚠️'
  icon.style.cssText = 'font-size:40px;margin-bottom:12px;'
  const title = document.createElement('h2')
  title.textContent = 'Something went wrong'
  title.style.cssText = 'margin:0 0 10px;'
  const pre = document.createElement('pre')
  pre.textContent = msg
  pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;background:#1d241b;padding:12px;border-radius:8px;opacity:.9;font-size:13px;'
  const button = document.createElement('button')
  button.textContent = 'Reload'
  button.style.cssText = 'margin-top:14px;padding:10px 22px;border-radius:8px;background:#2a3a2e;color:#e8efe6;border:1px solid #4a5a4e;cursor:pointer;'
  button.onclick = () => location.reload()
  inner.append(icon, title, pre, button)
  div.replaceChildren(inner)
}

const rootEl = document.getElementById('root')!

initSentry()
initErrorReporting()

if (!supabaseConfigured) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1410;color:#e8efe6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:24px;box-sizing:border-box;">
      <div style="max-width:520px;text-align:center;">
        <div style="font-size:42px;margin-bottom:12px;">🌱</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;">Focus Lily isn't configured</h1>
        <p style="margin:0;opacity:.75;line-height:1.55;">
          This build is missing its Supabase credentials
          (<code style="background:#1d241b;padding:2px 6px;border-radius:6px;">VITE_SUPABASE_URL</code> and
          <code style="background:#1d241b;padding:2px 6px;border-radius:6px;">VITE_SUPABASE_ANON_KEY</code>).
          Set them in .env.local and restart the dev server.
        </p>
      </div>
    </div>`
} else {
  try {
    createRoot(rootEl).render(
      <BrowserRouter>
        <AuthProvider>
          <KeepAwakeProvider />
          <SentryUserTracker />
          <App />
        </AuthProvider>
      </BrowserRouter>,
    )
  } catch (err) {
    showGlobalError(err instanceof Error ? err.message : String(err))
  }
}