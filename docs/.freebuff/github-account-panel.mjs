// Add a "signed in with GitHub" account panel to the Profile page's Account
// section, above the Delete-my-account row — avatar, name, email, Sign Out.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'

function patch(path, pairs) {
  let s = readFileSync(path, 'utf8')
  const eol = s.includes('\r\n') ? '\r\n' : '\n'
  let text = s.replace(/\r\n/g, '\n')
  for (const [from, to] of pairs) {
    if (!text.includes(from)) {
      console.error(`MISS in ${path}: ${JSON.stringify(from.slice(0, 80))}`)
      process.exit(1)
    }
    text = text.split(from).join(to)
  }
  writeFileSync(path, text.split('\n').join(eol))
  console.log(`patched ${path}`)
}

patch('src/screens/Profile.tsx', [
  [`        {/* ========== DANGER ZONE (own profile only) ========== */}
        {isOwn && (
          <div className="pf-danger-section">
            <div className="pf-section-title">Account</div>
            <div className="pf-danger-row">`,
   `        {/* ========== DANGER ZONE (own profile only) ========== */}
        {isOwn && (
          <div className="pf-danger-section">
            <div className="pf-section-title">Account</div>

            {/* Signed-in account — shows the connected GitHub account and lets
                the user sign out to switch to another one, like a normal app. */}
            {user && !user.isGuest && (
              <div className="pf-account-row">
                {user.profile?.avatar_url && (
                  <img className="pf-account-avatar" src={user.profile.avatar_url} alt="" />
                )}
                <div className="pf-account-info">
                  <div className="pf-account-name">{user.profile?.name || 'GitHub user'}</div>
                  <div className="pf-account-email">{user.email}</div>
                  <div className="pf-account-provider">Connected with GitHub</div>
                </div>
                <button className="pf-account-btn" onClick={signOut}>Sign Out</button>
              </div>
            )}

            <div className="pf-danger-row">`],
])

// Append the CSS for the account row.
const css = `
/* Signed-in GitHub account row */
.pf-account-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border: 1px solid rgba(120, 200, 150, 0.28);
  border-radius: 12px;
  background: rgba(70, 214, 160, 0.06);
}
.pf-account-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(70, 214, 160, 0.5);
  flex-shrink: 0;
}
.pf-account-info {
  flex: 1;
  min-width: 0;
}
.pf-account-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--pf-text, #f4e8c8);
}
.pf-account-email {
  font-size: 12.5px;
  color: var(--pf-text-soft, #b8a88a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pf-account-provider {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #46d6a0;
  margin-top: 2px;
}
.pf-account-btn {
  padding: 8px 16px;
  border: 1px solid rgba(70, 214, 160, 0.45);
  border-radius: 10px;
  background: rgba(70, 214, 160, 0.1);
  color: #46d6a0;
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.pf-account-btn:hover {
  background: rgba(70, 214, 160, 0.22);
  border-color: #46d6a0;
}
`
appendFileSync('src/screens/Profile.css', css)
console.log('appended CSS to src/screens/Profile.css')
