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

  const status = params.get('status')

  useEffect(() => {
    if (status === 'success') {
      setFlash({ ok: true, msg: '✅ Golden leaves credited!' })
      const t = setTimeout(() => setFlash(null), 5000)
      const r = setTimeout(() => window.history.replaceState({}, '', '/store'), 500)
      return () => { clearTimeout(t); clearTimeout(r) }
    }
  }, [status])

  const exchangeMax = Math.floor(premiumXp / GOLD_TO_GREEN) * GOLD_TO_GREEN
  const exchangeLeaves = Math.min(exchangeAmount, exchangeMax)

  const packs = useMemo(
    () => PACKS.map((p) => ({
      ...p,
      label: provider === 'razorpay' ? `₹${(p.pricePaise / 100).toFixed(0)}` : `$${(p.priceCents / 100).toFixed(2)}`,
    })),
    [provider],
  )

  const buy = async (pack: Pack) => {
    if (!userId || isGuest) { setError('Sign in to buy golden leaves.'); return }
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
            setFlash({ ok: true, msg: '✅ Golden leaves credited!' })
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
    setFlash({ ok: true, msg: '✨ Balance updated!' })
    setTimeout(() => setFlash(null), 3000)
  }

  return (
    <div className="store-page">
      <div className="store-topbar">
        <button className="store-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="store-title">Golden Store</div>
        <div className="store-balance">
          <span className="store-green">🍃 {xp.toLocaleString()}</span>
          <span className="store-gold">🌟 {premiumXp.toLocaleString()}</span>
        </div>
      </div>

      {flash && <div className={`store-flash ${flash.ok ? 'store-flash--ok' : ''}`}>{flash.msg}</div>}
      {error && <div className="store-error">{error}</div>}

      {isGuest && <div className="store-note">You're in guest mode — sign in to buy golden leaves.</div>}

      <section className="store-section">
        <h2>Golden Leaves</h2>
        <p className="store-hint">
          Premium currency for legendary items — the only currency you can buy with real money.
          Spending a little keeps Focus Lily running.
        </p>

        <div className="store-provider">
          <button className={provider === 'razorpay' ? 'active' : ''} onClick={() => setProvider('razorpay')}>
            🇮🇳 Razorpay (₹)
          </button>
          <button className={provider === 'stripe' ? 'active' : ''} onClick={() => setProvider('stripe')}>
            💳 Stripe ($)
          </button>
        </div>

        <div className="store-grid">
          {packs.map((p) => (
            <div key={p.id + provider} className="store-pack">
              <div className="store-pack-gold">🌟 {p.golden.toLocaleString()}</div>
              <div className="store-pack-bonus">{p.bonus?.startsWith('+') ? `Bonus +${p.bonus.slice(1)}` : 'Standard'}</div>
              <button className="store-buy" disabled={!!buying || isGuest} onClick={() => buy(p)}>
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
          <input
            type="number"
            min={0}
            max={exchangeMax}
            step={GOLD_TO_GREEN}
            value={exchangeAmount || ''}
            placeholder="0"
            onChange={(e) => setExchangeAmount(Number(e.target.value))}
          />
          <span className="store-exchange-eq">🌟 → 🍃</span>
          <button className="store-buy" disabled={exchangeLeaves <= 0} onClick={exchange}>
            Exchange {exchangeLeaves > 0 ? `${exchangeLeaves * GOLD_TO_GREEN} leaves` : ''}
          </button>
        </div>
        <div className="store-hint">You can exchange up to {exchangeMax.toLocaleString()} 🌟 for {(exchangeMax * GOLD_TO_GREEN).toLocaleString()} 🍃</div>
      </section>
    </div>
  )
}
