# OAuth Setup — Focus Lily

Focus Lily signs users in with **InsForge OAuth** (Google, GitHub, Microsoft) over
the OAuth 2.0 **PKCE** flow. InsForge runs the server side of the flow and issues a
session in a **secure, httpOnly cookie** — no access tokens, refresh tokens, or
passwords are ever stored in the browser bundle or in `localStorage`.

Because of that, the provider **client IDs and secrets live only in InsForge**, not
in this repo. This file lists everything you need to wire them up.

> The client code is already done. Until at least one provider below is configured,
> the OAuth buttons will show an error and users can fall back to email/password.

---

## 1. Callback / redirect URLs

InsForge exposes a single OAuth callback endpoint per app. Register **this exact
URL** as the authorized redirect URI in every provider console:

```
https://e29j97zj.us-east.insforge.app/api/auth/oauth/callback
```

> The host is your InsForge `oss_host` (see `.insforge/project.json`). If you move
> projects, update the host part accordingly.

Focus Lily itself passes `window.location.origin` as `redirectTo`. Every origin the
app is served from must be listed under `[auth].allowed_redirect_urls` in
`insforge.toml` (already set for `http://localhost:5173` / `:4173` — **add your
production domain** before deploying), then pushed:

```bash
npx @insforge/cli config push        # applies insforge.toml
```

---

## 2. Create the OAuth apps

### Google
1. Google Cloud Console → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
3. **Authorized redirect URIs:** add the InsForge callback URL from §1.
4. Copy the **Client ID** and **Client secret**.

### GitHub
1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Authorization callback URL:** the InsForge callback URL from §1.
3. Copy the **Client ID**, then **Generate a new client secret**.

### Microsoft
1. Azure Portal → **Microsoft Entra ID → App registrations → New registration**.
2. **Redirect URI** (platform = *Web*): the InsForge callback URL from §1.
3. Under **Certificates & secrets**, create a **New client secret**.
4. Copy the **Application (client) ID** and the secret **Value**.

---

## 3. Give the secrets to InsForge

Set them through the InsForge dashboard (**Auth → Providers**) or the CLI:

```bash
npx @insforge/cli auth provider set google     --client-id "…" --client-secret "…"
npx @insforge/cli auth provider set github      --client-id "…" --client-secret "…"
npx @insforge/cli auth provider set microsoft   --client-id "…" --client-secret "…"
```

> Run `npx @insforge/cli auth provider --help` to confirm the exact flags for your
> CLI version. Secrets are stored server-side and never returned to the client.

---

## 4. Verify

1. `npm run dev`, open the app, click **Continue with Google** (or another provider).
2. You should be redirected to the provider, then back to the app already signed in.
3. The session rides in an httpOnly cookie; `getCurrentUser()` restores it on reload.

If a button errors with "provider not configured", that provider's secrets aren't
set yet — finish §3 for it, or use the email/password fallback meanwhile.
