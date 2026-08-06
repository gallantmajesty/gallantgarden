import { Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useProfile } from '../store/profile'
import { useShop } from '../shop/store'
import { effectiveBanners, effectiveLogos, type BannerCategory, type LogoCategory, type Banner, type Logo, logoFilter } from '../lib/banners'
import { effectiveCharacters, characterById } from '../avatar/characters'
import { ACCESSORIES } from '../avatar/config'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import { useAvatar } from '../avatar/store'
import './Shop.css'

type ShopTab = 'characters' | 'banners' | 'logos' | 'accessories'

const RARITY_COLORS: Record<string, string> = {
  common: '#9aa0aa',
  rare: '#4a90d9',
  epic: '#c084fc',
  legendary: '#f5b940',
}

/** Map a full banner/logo asset to its optimized thumbnail (generated once via
 *  sharp — ~48x smaller). Falls back to the original if a thumb is missing. */
const thumb = (p?: string) => (p ? p.replace(/^\/banners\//, '/banners/thumbs/') : p)

const MAIN_TABS: { id: ShopTab; label: string; icon: string }[] = [
  { id: 'characters', label: 'Characters', icon: '🧑‍🎓' },
  { id: 'banners', label: 'Banners', icon: '🎨' },
  { id: 'logos', label: 'Logos', icon: '🪙' },
  { id: 'accessories', label: 'Accessories', icon: '🎒' },
]

const SUB_FILTERS: Record<ShopTab, { id: string; label: string }[]> = {  characters: [
    { id: 'all', label: 'All' },
    { id: 'starter', label: 'Starter' },
    { id: 'epic', label: 'Epic' },
    { id: 'legendary', label: 'Legendary' },
  ],
  banners: [
    { id: 'all', label: 'All' },
    { id: 'default', label: 'Starter' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'others', label: 'Premium' },
  ],
  logos: [
    { id: 'all', label: 'All' },
    { id: 'default', label: 'Starter' },
    { id: 'others', label: 'Premium' },
  ],
  accessories: [
    { id: 'all', label: 'All' },
    { id: 'green', label: 'Leaves' },
  ],
}

export function Shop() {
  const navigate = useNavigate()
  const xp = useProfile((s) => s.xp)
  const premiumXp = useProfile((s) => s.premiumXp)
  const savePublic = useProfile((s) => s.savePublic)
  const pub = useProfile((s) => s.pub)
  const avatarConfig = useAvatar((s) => s.config)
  const setAvatar = useAvatar((s) => s.set)
  const saveAvatar = useAvatar((s) => s.save)
  const ownedItems = useShop((s) => s.ownedItems)

  const [tab, setTab] = useState<ShopTab>('characters')
  const [sub, setSub] = useState('all')
  const [selectedId, setSelectedId] = useState('james')

  // Legacy grace: anyone who had a paid accessory equipped before the shop
  // existed keeps it for free (the free starter is laptop, which stays in the
  // avatar creator).
  useEffect(() => {
    const equipped = avatarConfig.accessories?.[0]
    if (equipped && equipped !== 'laptop' && !useShop.getState().isOwned(equipped)) {
      useShop.getState().grantItems([equipped])
    }
  }, [avatarConfig.accessories])

  const gold = (c?: string) => c === 'gold'
  const canBuyWith = (price: number, c?: string) =>
    gold(c) ? useShop.getState().canAffordGold(price, premiumXp) : useShop.getState().canAfford(price, xp)

  const buy = (id: string, price: number, cur?: string) => {
    if (price <= 0 || useShop.getState().isOwned(id)) return
    if (gold(cur)) {
      if (!useShop.getState().canAffordGold(price, premiumXp)) return
      const newGold = useShop.getState().purchaseGold(id, price, premiumXp)
      // applyXp persists the deduction to the DB (rank is never demoted).
      useProfile.getState().applyXp({ golden: newGold - premiumXp, rankXp: 0 })
    } else {
      if (!useShop.getState().canAfford(price, xp)) return
      const newLeaves = useShop.getState().purchase(id, price, xp)
      useProfile.getState().applyXp({ leaves: newLeaves - xp, rankXp: 0 })
    }
  }

  const equipCharacter = (id: string) => {
    setAvatar({ ...characterById(id).fallback, characterId: id })
    saveAvatar()
  }

  const equipAccessory = (id: string) => {
    setAvatar({ accessories: [id] })
    saveAvatar()
  }

  const equippedChar = avatarConfig.characterId || 'james'
  const equippedAcc = avatarConfig.accessories?.[0] ?? null

  // Launch catalog: only items flagged visible:true appear (hidden ones stay
  // fully functional everywhere else and come back to the shop later).
  const characters = useMemo(() => effectiveCharacters().filter((c) => c.visible !== false), [])
  const banners = useMemo(() => effectiveBanners().filter((b) => b.visible !== false), [])
  const logos = useMemo(() => effectiveLogos().filter((l) => l.visible !== false), [])
  const accessories = useMemo(() => ACCESSORIES.filter((a) => a.id !== 'laptop' && a.visible !== false), [])

  const filtered = useMemo(() => {
    if (tab === 'characters') {
      if (sub === 'starter') return characters.filter((c) => (c.price ?? 0) === 0)
      if (sub === 'epic' || sub === 'legendary') return characters.filter((c) => (c.rarity ?? '').toLowerCase() === sub)
      return characters
    }
    if (tab === 'banners') {
      if (sub === 'default' || sub === 'gradient' || sub === 'others') return banners.filter((b) => b.category === sub)
      return banners
    }
    if (tab === 'logos') {
      if (sub === 'default' || sub === 'others') return logos.filter((l) => l.category === sub)
      return logos
    }
    if (sub === 'green') return accessories.filter((a) => a.currency !== 'gold')
    if (sub === 'gold') return accessories.filter((a) => a.currency === 'gold')
    return accessories
  }, [tab, sub, characters, banners, logos, accessories])

  // Switching tabs resets the sub-filter and picks a first item.
  useEffect(() => {
    setSub('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    if (!filtered.some((x) => x.id === selectedId)) {
      if (filtered[0]) setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selectedOwned = ownedItems.includes(selectedId)

  const meta = useMemo(() => filtered.find((x) => x.id === selectedId), [filtered, selectedId])

  const renderCta = () => {
    if (!meta) return null
    const price = 'price' in meta ? (meta as { price?: number }).price ?? 0 : 0
    const cur = 'currency' in meta ? (meta as { currency?: string }).currency : undefined

    if (tab === 'characters') {
      const equipped = equippedChar === selectedId
      if (selectedOwned) {
        return (
          <button className="pv-btn" disabled={equipped} onClick={() => equipCharacter(selectedId)}>
            {equipped ? '✓ Equipped' : 'Equip Character'}
          </button>
        )
      }
      if (price === 0) return <span className="pv-free">Free</span>
      const affordable = canBuyWith(price, cur)
      return (
        <button className={`pv-btn pv-btn--buy ${affordable ? '' : 'disabled'}`} disabled={!affordable} onClick={() => buy(selectedId, price, cur)}>
          {gold(cur) ? '🌟' : '🍃'} Buy for {price}
        </button>
      )
    }
    if (tab === 'banners') {
      const equipped = pub.banner === selectedId
      if (selectedOwned) {
        return (
          <button className="pv-btn" disabled={equipped} onClick={() => savePublic({ banner: selectedId, bannerImage: null })}>
            {equipped ? '✓ Equipped' : 'Equip Banner'}
          </button>
        )
      }
      if (price === 0) return <span className="pv-free">Free</span>
      const affordable = canBuyWith(price, cur)
      return (
        <button className={`pv-btn pv-btn--buy ${affordable ? '' : 'disabled'}`} disabled={!affordable} onClick={() => buy(selectedId, price, cur)}>
          {gold(cur) ? '🌟' : '🍃'} Buy for {price}
        </button>
      )
    }
    if (tab === 'logos') {
      const equipped = pub.logo === selectedId
      if (selectedOwned) {
        return (
          <button className="pv-btn" disabled={equipped} onClick={() => savePublic({ logo: selectedId })}>
            {equipped ? '✓ Equipped' : 'Equip Logo'}
          </button>
        )
      }
      if (price === 0) return <span className="pv-free">Free</span>
      const affordable = canBuyWith(price, cur)
      return (
        <button className={`pv-btn pv-btn--buy ${affordable ? '' : 'disabled'}`} disabled={!affordable} onClick={() => buy(selectedId, price, cur)}>
          {gold(cur) ? '🌟' : '🍃'} Buy for {price}
        </button>
      )
    }
    const equipped = equippedAcc === selectedId
    if (selectedOwned) {
      return (
        <button className="pv-btn" disabled={equipped} onClick={() => equipAccessory(selectedId)}>
          {equipped ? '✓ Equipped' : 'Equip Accessory'}
        </button>
      )
    }
    if (price === 0) return <span className="pv-free">Free</span>
    const affordable = canBuyWith(price, cur)
    return (
      <button className={`pv-btn pv-btn--buy ${affordable ? '' : 'disabled'}`} disabled={!affordable} onClick={() => buy(selectedId, price, cur)}>
        {gold(cur) ? '🌟' : '🍃'} Buy for {price}
      </button>
    )
  }

  const canAffordSelected =
    meta && 'price' in meta
      ? canBuyWith((meta as { price?: number }).price ?? 0, 'currency' in meta ? (meta as { currency?: string }).currency : undefined)
      : true

  return (
    <div className="shop-page">
      <div className="shop-bg">
        <div className="shop-orb shop-orb--a" />
        <div className="shop-orb shop-orb--b" />
        <div className="shop-orb shop-orb--c" />
        <div className="shop-spark shop-spark--1">🍃</div>
        <div className="shop-spark shop-spark--2">✨</div>
        <div className="shop-spark shop-spark--3">🌟</div>
      </div>

      <header className="shop-topbar">
        <button className="shop-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="shop-brand">
          <span className="shop-brand-mark">🛍️</span>
          <span className="shop-brand-name">Focus Store</span>
        </div>
        <div className="shop-balance">
          <span className="shop-balance-pill"><img className="shop-balance-icon" src="/icons/golden-leaf.png" alt="" draggable={false} />{xp.toLocaleString()}</span>
          <span className="shop-balance-pill shop-balance-pill--gold">🌟 {premiumXp.toLocaleString()}</span>
          <button className="shop-gold-btn" onClick={() => navigate('/store')}>Get Golden</button>
        </div>
      </header>

      <nav className="shop-tabs">
        {MAIN_TABS.map((t) => (
          <button key={t.id} className={`shop-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="shop-tab-ico">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="shop-body">
        <div className="shop-main">
          <div className="shop-subnav">
            {SUB_FILTERS[tab].map((f) => (
              <button key={f.id} className={`shop-sub ${sub === f.id ? 'active' : ''}`} onClick={() => setSub(f.id)}>
                {f.label}
              </button>
            ))}
            <span className="shop-count">{filtered.length} items</span>
          </div>

          <div className="shop-scroll">
            {filtered.length === 0 && <div className="shop-empty">Nothing here yet 🍃</div>}
            <div className="shop-grid">
              {filtered.map((item, i) => {
                const name = item.name
                const price = 'price' in item ? (item as { price?: number }).price ?? 0 : 0
                const cur = 'currency' in item ? (item as { currency?: string }).currency : undefined
                const owned = ownedItems.includes(item.id)
                const selected = selectedId === item.id
                const rarity = 'rarity' in item ? ((item as { rarity?: string }).rarity ?? 'common').toLowerCase() : 'common'

                return (
                  <button
                    key={item.id}
                    className={`card ${selected ? 'selected' : ''} ${owned ? 'owned' : ''}`}
                    data-rarity={rarity}
                    style={{ animationDelay: `${Math.min(i, 14) * 38}ms` }}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="card-thumb">
                      {tab === 'characters' && 'icon' in item ? (
                        <img className="card-img" src={(item as { icon?: string }).icon} alt={name} draggable={false} />
                      ) : 'icon' in item ? (
                        <span className="card-emoji">{(item as { icon?: string }).icon}</span>
                      ) : tab === 'banners' ? (
                        (item as Banner).image ? (
                          <div className="card-banner" style={{ backgroundImage: `url(${thumb((item as Banner).image)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        ) : (
                          <div className="card-banner" style={{ background: (item as Banner).css || '#333' }} />
                        )
                      ) : (item as Logo).image ? (
                        <img className="card-logo" src={thumb((item as Logo).image)} alt="" loading="lazy" decoding="async" style={{ filter: logoFilter(item as Logo) }} />
                      ) : (
                        <span className="card-logo card-logo--css" style={{ background: (item as Logo).css || '#333' }} />
                      )}
                      {owned && <span className="card-own">Owned</span>}
                    </div>
                    <div className="card-foot">
                      <span className="card-name">{name}</span>
                      {!owned && price > 0 ? (
                        <span className="card-price" data-gold={gold(cur) ? '' : undefined}>
                          {gold(cur) ? '🌟' : '🍃'} {price}
                        </span>
                      ) : price === 0 && !owned ? (
                        <span className="card-free">Free</span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="shop-preview">
          <div className="pv-head">
            <div className="pv-title">{meta ? ('name' in meta ? meta.name : '') : ''}</div>
            {meta && tab === 'characters' && 'rarity' in meta && (
              <span className="pv-rarity" style={{ color: RARITY_COLORS[((meta as { rarity?: string }).rarity ?? 'common').toLowerCase()] ?? '#fff' }}>
                {(meta as { rarity?: string }).rarity}
              </span>
            )}
          </div>

          <div className="pv-stage">
            {tab === 'characters' && meta && (
              <Suspense fallback={<div className="pv-loading">Loading 3D…</div>}>
                <CharacterPreview3D characterId={selectedId} />
              </Suspense>
            )}
            {tab === 'banners' && meta && (
              <div
                className="pv-banner"
                style={(meta as Banner).image
                  ? { backgroundImage: `url(${thumb((meta as Banner).image)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: (meta as Banner).css || '#222' }
                }
              />
            )}
            {tab === 'logos' && meta && (
              <div className="pv-logo">
                {(meta as Logo).image ? (
                  <img src={thumb((meta as Logo).image)} alt="" loading="lazy" decoding="async" style={{ filter: logoFilter(meta as Logo) }} />
                ) : (
                  <span className="pv-logo-bg" style={{ background: (meta as Logo).css || '#222' }} />
                )}
              </div>
            )}
            {tab === 'accessories' && meta && (
              <div className="pv-acc">
                <span className="pv-acc-emoji">{'icon' in meta ? (meta as { icon?: string }).icon : ''}</span>
              </div>
            )}
          </div>

          <div className="pv-body">
            {tab === 'characters' && meta && 'description' in meta && (
              <p className="pv-desc">{(meta as { description?: string }).description}</p>
            )}
            {tab === 'accessories' && meta && 'blurb' in meta && (
              <p className="pv-desc">{(meta as { blurb?: string }).blurb}</p>
            )}
            {tab === 'characters' && meta && 'price' in meta && (meta as { price?: number }).price !== 0 && (
              <div className="pv-price-row">
                <span className="pv-price">{(meta as { price?: number }).price}</span>
                <span className="pv-currency">{'currency' in meta && (meta as { currency?: string }).currency === 'gold' ? '🌟 Golden' : '🍃 Leaves'}</span>
              </div>
            )}
            {renderCta()}
            {!selectedOwned && meta && 'price' in meta && (meta as { price?: number }).price !== 0 && !canAffordSelected && (
              <button className="pv-gold" onClick={() => navigate('/store')}>Need more leaves? Get Golden 🌟</button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- pieces */

/** Live 3D preview of a character on the right panel (Free-Fire style). */
function CharacterPreview3D({ characterId }: { characterId: string }) {
  const config = characterById(characterId).fallback
  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.1, 3.6], fov: 40, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#141225']} />
      <hemisphereLight args={['#ffe8c0', '#2a2250', 0.75]} />
      <directionalLight position={[3, 5, 2]} intensity={1.15} color="#ffecd0" />
      <directionalLight position={[-2, 3, -1]} intensity={0.4} color="#c9b6ff" />
      <pointLight position={[0, 0.6, 0]} intensity={0.6} color="#ff9040" distance={4} decay={2} />
      <ambientLight intensity={0.25} color="#ffe8d0" />
      <group position={[0, -0.95, 0]}>
        <CharacterAvatar config={config} static />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[0.7, 48]} />
          <meshStandardMaterial color="#241d40" roughness={0.9} metalness={0.05} />
        </mesh>
      </group>
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={2.2}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        minDistance={2}
        maxDistance={5}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, 0.1, 0]}
      />
    </Canvas>
  )
}
