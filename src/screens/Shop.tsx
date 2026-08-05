import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../store/profile'
import { useShop } from '../shop/store'
import { BANNERS, LOGOS, type BannerCategory, type LogoCategory, logoFilter } from '../lib/banners'
import './Shop.css'

export default function Shop() {
  const navigate = useNavigate()
  const xp = useProfile((s) => s.xp)
  const premiumXp = useProfile((s) => s.premiumXp)
  const savePublic = useProfile((s) => s.savePublic)
  const pub = useProfile((s) => s.pub)
  const [tab, setTab] = useState<'banners' | 'logos'>('banners')
  const [flash, setFlash] = useState<string | null>(null)

  const buyBanner = (id: string, price: number, gold: boolean) => {
    if (useShop.getState().isOwned(id)) return
    if (gold) {
      if (!useShop.getState().canAffordGold(price, premiumXp)) return
      const newGold = useShop.getState().purchaseGold(id, price, premiumXp)
      useProfile.setState({ premiumXp: newGold })
    } else {
      if (!useShop.getState().canAfford(price, xp)) return
      const newLeaves = useShop.getState().purchase(id, price, xp)
      useProfile.setState({ xp: newLeaves })
    }
    setFlash(id)
    setTimeout(() => setFlash(null), 800)
  }

  const buyLogo = (id: string, price: number, gold: boolean) => {
    if (useShop.getState().isOwned(id)) return
    if (gold) {
      if (!useShop.getState().canAffordGold(price, premiumXp)) return
      const newGold = useShop.getState().purchaseGold(id, price, premiumXp)
      useProfile.setState({ premiumXp: newGold })
    } else {
      if (!useShop.getState().canAfford(price, xp)) return
      const newLeaves = useShop.getState().purchase(id, price, xp)
      useProfile.setState({ xp: newLeaves })
    }
    setFlash(id)
    setTimeout(() => setFlash(null), 800)
  }

  const gold = (c?: string) => c === 'gold'
  const canBuyWith = (price: number, c?: string) =>
    gold(c) ? useShop.getState().canAffordGold(price, premiumXp) : useShop.getState().canAfford(price, xp)

  return (
    <div className="shop-page">
      <div className="shop-topbar">
        <button className="shop-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="shop-title">Shop</div>
        <div className="shop-balance">
          <img className="shop-balance-icon" src="/icons/golden-leaf.png" alt="" draggable={false} />
          <span>{xp.toLocaleString()}</span>
          <span className="shop-gold-balance">🌟 {premiumXp.toLocaleString()}</span>
        </div>
      </div>

      <div className="shop-tabs">
        <button className={`shop-tab ${tab === 'banners' ? 'active' : ''}`} onClick={() => setTab('banners')}>Banners</button>
        <button className={`shop-tab ${tab === 'logos' ? 'active' : ''}`} onClick={() => setTab('logos')}>Logos</button>
      </div>

      <div className="shop-content">
        {tab === 'banners' && (
          <>
            {(['default', 'gradient', 'others'] as BannerCategory[]).map((cat) => {
              const items = BANNERS.filter((b) => b.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat} className="shop-section">
                  <div className="shop-section-title">
                    {cat === 'default' ? 'Starter' : cat === 'gradient' ? 'Gradient' : 'Premium'}
                  </div>
                  <div className="shop-banner-grid">
                    {items.map((b) => {
                      const owned = useShop.getState().isOwned(b.id)
                      const equipped = pub.banner === b.id
                      const g = gold(b.currency)
                      const canBuy = !owned && b.price > 0 && canBuyWith(b.price, b.currency)
                      return (
                        <div key={b.id} className={`shop-banner-card ${flash === b.id ? 'shop-flash' : ''}`}>
                          <div
                            className="shop-banner-preview"
                            style={b.image
                              ? { backgroundImage: `url(${b.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                              : { background: b.css }
                            }
                          >
                            {owned && (
                              <button
                                className="shop-equip-btn"
                                onClick={() => savePublic({ banner: b.id, bannerImage: null })}
                                title={equipped ? 'Equipped' : 'Equip'}
                              >
                                {equipped ? '✓ Equipped' : 'Equip'}
                              </button>
                            )}
                          </div>
                          <div className="shop-card-footer">
                            <span className="shop-card-name">{b.name}</span>
                            {owned ? (
                              <span className="shop-owned-badge">Owned</span>
                            ) : b.price === 0 ? (
                              <span className="shop-free-badge">Free</span>
                            ) : (
                              <button
                                className={`shop-buy-btn ${canBuy ? '' : 'shop-buy-btn--disabled'}`}
                                onClick={() => buyBanner(b.id, b.price, g)}
                                disabled={!canBuy}
                              >
                                <span className={g ? 'shop-gold-icon' : 'shop-leaf-icon'}>{g ? '🌟' : '🍃'}</span> {b.price}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {tab === 'logos' && (
          <>
            {(['default', 'others'] as LogoCategory[]).map((cat) => {
              const items = LOGOS.filter((l) => l.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat} className="shop-section">
                  <div className="shop-section-title">
                    {cat === 'default' ? 'Starter' : 'Premium'}
                  </div>
                  <div className="shop-logo-grid">
                    {items.map((l) => {
                      const owned = useShop.getState().isOwned(l.id)
                      const equipped = pub.logo === l.id
                      const g = gold(l.currency)
                      const canBuy = !owned && l.price > 0 && canBuyWith(l.price, l.currency)
                      return (
                        <div key={l.id} className={`shop-logo-card ${flash === l.id ? 'shop-flash' : ''}`}>
                          <div className="shop-logo-preview">
                            {l.image ? (
                              <img src={l.image} alt="" style={{ filter: logoFilter(l) }} />
                            ) : (
                              <span className="shop-logo-gradient" style={{ background: l.css || 'rgba(255,255,255,0.1)' }} />
                            )}
                          </div>
                          <div className="shop-card-footer">
                            <span className="shop-card-name">{l.name}</span>
                            {owned ? (
                              <button
                                className="shop-equip-btn shop-equip-btn--sm"
                                onClick={() => savePublic({ logo: l.id })}
                                title={equipped ? 'Equipped' : 'Equip'}
                              >
                                {equipped ? '✓' : 'Equip'}
                              </button>
                            ) : l.price === 0 ? (
                              <span className="shop-free-badge">Free</span>
                            ) : (
                              <button
                                className={`shop-buy-btn ${canBuy ? '' : 'shop-buy-btn--disabled'}`}
                                onClick={() => buyLogo(l.id, l.price, g)}
                                disabled={!canBuy}
                              >
                                <span className={g ? 'shop-gold-icon' : 'shop-leaf-icon'}>{g ? '🌟' : '🍃'}</span> {l.price}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
