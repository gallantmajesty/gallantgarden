// Golden-leaf Store — buy golden leaves with real money and exchange golden →
// green leaves. Two payment providers:
//   • Stripe  — USD checkout (redirects to Stripe's hosted page)
//   • Razorpay — INR checkout (in-app modal, popular in India)
// Amounts are always decided server-side by the edge functions. Credit lands via
// the credit_golden_leaves RPC (service-role only, idempotent on the txn id).

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProfile } from '../store/profile'
import { supabase } from '../lib/supabase'
import './Store.css'

type Provider = 'stripe' | 'razorpay'

interface Pack {
  id: string
  golden: number
  priceCents: number
  pricePaise: number
  label: string
  bonus?: string
}

const GOLD_AMOUNTS = [120, 320, 900, 2400]
const USD_PRICES = [199, 499, 1299, 2999]
const INR_PRICES = [9900, 24900, 64900, 149900]

const PACKS: Pack[] = GOLD_AMOUNTS.map((golden, i) => ({
  id: `${golden}`,
  golden,
  priceCents: USD_PRICES[i],
  pricePaise: INR_PRICES[i],
  label: '',
  bonus: i >= 2 ? `+${[0, 0, 60, 300][i]}` : undefined,
}))

const GOLD_TO_GREEN = 10 // 1 golden leaf = 10 green leaves

/** Golden leaf coin — pure SVG (no emoji, no image dependency). */
function GoldCoin({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="gc-face" cx="35%" cy="28%" r="90%">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="55%" stopColor="#ffd45e" />
          <stop offset="100%" stopColor="#e0a52e" />
        </radialGradient>
        <linearGradient id="gc-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffefb8" />
          <stop offset="100%" stopColor="#b57f1c" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#gc-rim)" />
      <circle cx="32" cy="32" r="25" fill="url(#gc-face)" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="rgba(140, 90, 10, 0.35)" strokeWidth="1.2" />
      {/* sprouting golden leaf */}
      <path d="M32 42.5 C 25.8 37.6, 24.2 29.6, 27.4 22.8 C 30.8 27.4, 33.7 27.4, 36.6 23.6 C 39.9 30.2, 38.3 37.6, 32 42.5 Z" fill="#7a5206" />
      <path d="M27.4 22.8 C 30.8 27.4, 33.7 27.4, 36.6 23.6" fill="none" stroke="#5c3b04" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/** Green leaf — matches the shop's LeafIcon. */
function LeafIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M19.5 4.8c-6.6-.4-12.3 2-12.3 7.5 0 3.6 2.6 6.2 6 6.2 5.4 0 6.8-7.5 6.3-13.7Z" fill="#4ade80" stroke="#16a34a" strokeWidth="1" strokeLinejoin="round" />
      <path d="M7.8 17.2c2.8-4.3 6.4-7.9 11-9.6" fill="none" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Razorpay checkout.js is loaded on demand (it's a 3rd-party script).
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve()
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Razorpay'))
    document.head.appendChild(s)
  })
}

export function Store() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const xp = useProfile((s) => s.xp)
  const premiumXp = useProfile((s) => s.premiumXp)
  const userId = useProfile((s) => s.userId)
  const isGuest = useProfile((s) => s.isGuest)
  const refreshXp = useProfile((s) => s.refreshXp)

  const [provider, setProvider] = useState<Provider>('razorpay')
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exchangeAmount, setExchangeAmount] = useState(0)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)
  // Guardian/adult gate — remembered for the session (per tab), reset on close.
  const [adultConfirmed, setAdultConfirmed] = useState(() => sessionStorage.getItem('sf.store.adultConfirmed') === '1')

  const status = params.get('status')

  useEffect(() => {
    if (status === 'success') {
      setFlash({ ok: true, msg: 'Golden leaves credited!' })
      const t = setTimeout(() => setFlash(null), 5000)
      const r = setTimeout(() => window.history.replaceState({}, '', '/store'), 500)
      return () => { clearTimeout(t); clearTimeout(r) }
    }
  }, [status])

  const exchangeMax = Math.floor(premiumXp / GOLD_TO_GREEN) * GOLD_TO_GREEN
  const exchangeLeaves = Math.min(exchangeAmount, exchangeMax)

  const packs = useMemo(
    () => PACKS.map((p) => {
      const price = provider === 'razorpay' ? p.pricePaise / 100 : p.priceCents / 100
      const total = p.golden + (p.bonus ? Number(p.bonus.slice(1)) : 0)
      return {
        ...p,
        label: provider === 'razorpay' ? `₹${price.toFixed(0)}` : `$${price.toFixed(2)}`,
        total,
        perLeaf: price / total,
      }
    }),
    [provider],
  )

  const bestId = useMemo(() => {
    const sorted = [...packs].sort((a, b) => a.perLeaf - b.perLeaf)
    return sorted[0]?.id
  }, [packs])

  const buy = async (pack: Pack) => {
    if (!userId || isGuest) { setError('Sign in to buy golden leaves.'); return }
    if (!adultConfirmed) { setError('Please confirm the adult/guardian statement below to continue.'); return }
    setBuying(pack.id); setError(null); setFlash(null)
    try {
      if (provider === 'razorpay') {
        const { data, error: fnError } = await supabase.functions.invoke('razorpay-checkout', {
          body: { packId: `r${pack.golden}` },
        })
        if (fnError) throw new Error(fnError.message)
        if (!data?.orderId) throw new Error('No order returned')

        await loadRazorpayScript()
        const RazorpayCtor = (window as unknown as { Razorpay: new (o: Record<string, unknown>) => { open: () => void } }).Razorpay
        if (!RazorpayCtor) throw new Error('Razorpay failed to load')

        const rzp = new RazorpayCtor({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency || 'INR',
          name: 'Focus Lily',
          description: `${data.golden} Golden Leaves`,
          prefill: { name: data.name ?? '', email: data.email ?? '' },
          handler: async (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            // Verify + credit (near-instant); webhook is the idempotent fallback.
            try {
              await supabase.functions.invoke('razorpay-verify', {
                body: { paymentId: res.razorpay_payment_id, orderId: res.razorpay_order_id, signature: res.razorpay_signature },
              })
            } catch { /* webhook will credit anyway */ }
            setFlash({ ok: true, msg: 'Golden leaves credited!' })
            void refreshXp()
          },
          modal: { ondismiss: () => setBuying(null) },
        })
        rzp.open()
      } else {
        const { data, error: fnError } = await supabase.functions.invoke('stripe-checkout', {
          body: { packId: `g${pack.golden}`, returnUrl: window.location.origin },
        })
        if (fnError) throw new Error(fnError.message)
        if (!data?.url) throw new Error('No checkout URL returned')
        window.location.href = data.url
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed — payments may not be configured yet.')
      setBuying(null)
    }
  }

  const exchange = () => {
    if (exchangeLeaves <= 0) return
    useProfile.getState().applyXp({ golden: -exchangeLeaves, leaves: exchangeLeaves * GOLD_TO_GREEN, rankXp: 0 })
    setExchangeAmount(0)
    setFlash({ ok: true, msg: 'Balance updated!' })
    setTimeout(() => setFlash(null), 3000)
  }

  return (
    <div className="store-page">
      <header className="store-topbar">
        <button className="store-back" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back
        </button>
        <div className="store-brand">
          <GoldCoin size={34} />
          <div>
            <div className="store-title">Golden Store</div>
            <div className="store-subtitle">Premium currency for legendary items</div>
          </div>
        </div>
        <div className="store-balance">
          <span className="store-pill store-pill--green"><LeafIcon />{xp.toLocaleString()}</span>
          <span className="store-pill store-pill--gold"><GoldCoin size={18} />{premiumXp.toLocaleString()}</span>
        </div>
      </header>

      {flash && <div className={`store-flash ${flash.ok ? 'store-flash--ok' : ''}`}>{flash.msg}</div>}
      {error && <div className="store-error">{error}</div>}

      {isGuest && <div className="store-note">You're in guest mode — sign in to buy golden leaves.</div>}

      <section className="store-section">
        <div className="store-section-head">
          <div>
            <h2>Golden Leaves</h2>
            <p className="store-hint">
              The only currency you can buy with real money — spend it on legendary items.
              Buying a pack keeps Focus Lily running.
            </p>
          </div>
          <span className="store-secure">🔒 Secure checkout</span>
        </div>

        <div className="store-provider">
          <button className={provider === 'razorpay' ? 'active' : ''} onClick={() => setProvider('razorpay')}>
            🇮🇳 Razorpay (₹)
          </button>
          <button className={provider === 'stripe' ? 'active' : ''} onClick={() => setProvider('stripe')}>
            💳 Stripe ($)
          </button>
        </div>

        <label className="store-consent">
          <input
            type="checkbox"
            checked={adultConfirmed}
            onChange={(e) => {
              const v = e.target.checked
              setAdultConfirmed(v)
              try {
                if (v) sessionStorage.setItem('sf.store.adultConfirmed', '1')
                else sessionStorage.removeItem('sf.store.adultConfirmed')
              } catch { /* storage blocked */ }
            }}
          />
          <span>
            I am <strong>18 or older</strong>, or I am buying with my{" "}
            <strong>parent or guardian's permission</strong>.
          </span>
        </label>
        {!adultConfirmed && (
          <p className="store-consent-hint">You must confirm this before you can buy golden leaves.</p>
        )}

        <div className="store-grid">
          {packs.map((p) => (
            <div key={p.id + provider} className={`store-pack ${p.id === bestId ? 'store-pack--best' : ''}`}>
              {p.id === bestId && <span className="store-best-tag">BEST VALUE</span>}
              <GoldCoin size={52} />
              <div className="store-pack-gold">
                {p.golden.toLocaleString()}
                {p.bonus && <span className="store-pack-total">+{p.bonus.slice(1)}</span>}
              </div>
              <div className="store-pack-per">≈ {p.total.toLocaleString()} golden total</div>
              <button className="store-buy" disabled={!!buying || isGuest || !adultConfirmed} onClick={() => buy(p)}>
                {buying === p.id && provider === 'razorpay' ? 'Opening…' : p.label}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="store-section">
        <h2>Exchange to Green Leaves</h2>
        <p className="store-hint">
          Convert golden leaves into green leaves at <strong>1 🌟 = {GOLD_TO_GREEN} 🍃</strong>.
          Use it to grab any green-priced cosmetic instantly.
        </p>
        <div className="store-exchange">
          <div className="store-exchange-input-wrap">
            <GoldCoin size={20} />
            <input
              type="number"
              min={0}
              max={exchangeMax}
              step={GOLD_TO_GREEN}
              value={exchangeAmount || ''}
              placeholder="0"
              onChange={(e) => setExchangeAmount(Number(e.target.value))}
            />
            <span className="store-exchange-eq">→</span>
            <LeafIcon />
            <span className="store-exchange-out">{exchangeLeaves > 0 ? (exchangeLeaves * GOLD_TO_GREEN).toLocaleString() : '0'}</span>
          </div>
          <button className="store-buy" disabled={exchangeLeaves <= 0} onClick={exchange}>
            Exchange{exchangeLeaves > 0 ? ` ${exchangeLeaves * GOLD_TO_GREEN} leaves` : ''}
          </button>
        </div>
        <div className="store-hint store-hint--end">You can exchange up to {exchangeMax.toLocaleString()} 🌟 for {(exchangeMax * GOLD_TO_GREEN).toLocaleString()} 🍃</div>
      </section>
    </div>
  )
}
