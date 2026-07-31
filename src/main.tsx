import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './store/auth'
import { supabaseConfigured } from './lib/insforge'
import { initSentry } from './lib/sentry'
import { SentryUserTracker } from './components/SentryUserTracker'
import './i18n'

// Global error display — any crash now shows the message on screen instead
// of a blank white page. Remove after the white-page issue is resolved.
window.addEventListener('error', (e) => {
  showGlobalError(e.error?.message || e.message || String(e.error))
})
window.addEventListener('unhandledrejection', (e) => {
  showGlobalError(e.reason?.message || String(e.reason))
})

let globalErrorShown = false
function showGlobalError(msg: string) {
  if (globalErrorShown) return
  globalErrorShown = true
  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#0f1410;color:#e8efe6;z-index:999999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;'
  div.innerHTML = `<div style="max-width:560px;text-align:center;"><div style="font-size:40px;margin-bottom:12px;">⚠️</div><h2 style="margin:0 0 10px;">Something went wrong</h2><pre style="white-space:pre-wrap;word-break:break-word;background:#1d241b;padding:12px;border-radius:8px;opacity:.9;font-size:13px;">${msg.replace(/</g, '&lt;')}</pre><button onclick="location.reload()" style="margin-top:14px;padding:10px 22px;border-radius:8px;background:#2a3a2e;color:#e8efe6;border:1px solid #4a5a4e;cursor:pointer;">Reload</button></div>`
  document.body.appendChild(div)
}

const rootEl = document.getElementById('root')!

initSentry()

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
          <SentryUserTracker />
          <App />
        </AuthProvider>
      </BrowserRouter>,
    )
  } catch (err) {
    showGlobalError(err instanceof Error ? err.message : String(err))
  }
}