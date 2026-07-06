import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './store/auth'
import { supabaseConfigured } from './lib/insforge'
import { MobileBlocker } from './components/MobileBlocker'
import './i18n'

const rootEl = document.getElementById('root')!

if (!supabaseConfigured) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1410;color:#e8efe6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:24px;box-sizing:border-box;">
      <div style="max-width:520px;text-align:center;">
        <div style="font-size:42px;margin-bottom:12px;">🌱</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;">Focus Lily isn’t configured</h1>
        <p style="margin:0;opacity:.75;line-height:1.55;">
          This build is missing its Supabase credentials
          (<code style="background:#1d241b;padding:2px 6px;border-radius:6px;">VITE_SUPABASE_URL</code> and
          <code style="background:#1d241b;padding:2px 6px;border-radius:6px;">VITE_SUPABASE_ANON_KEY</code>).
          Set them in .env.local and restart the dev server.
        </p>
      </div>
    </div>`
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <MobileBlocker>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </MobileBlocker>
    </StrictMode>,
  )
}
