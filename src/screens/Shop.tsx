import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { createNullSafeEvents } from '../three/safeEvents'
import { useProfile } from '../store/profile'
import { useShop } from '../shop/store'
import { effectiveBanners, effectiveLogos, type BannerCategory, type LogoCategory, type Banner, type Logo, logoFilter } from '../lib/banners'
import { effectiveCharacters, characterById } from '../avatar/characters'
import { ACCESSORIES, type AccessoryId } from '../avatar/config'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import { AccessoryModel } from '../avatar/Accessories'
import { useAvatar } from '../avatar/store'
import './Shop.css'

type ShopTab = 'characters' | 'banners' | 'logos' | 'accessories'

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  rare: '#6ee7b7',
  epic: '#22c55e',
  legendary: '#a3e635',
}

/** Map a full banner/logo asset to its optimized thumbnail (generated once via
 *  sharp — ~48x smaller). Falls back to the original if a thumb is missing. */
const thumb = (p?: string) => (p ? p.replace(/^\/banners\//, '/banners/thumbs/') : p)

const MAIN_TABS: { id: ShopTab; label: string }[] = [
  { id: 'characters', label: 'Characters' },
  { id: 'banners', label: 'Banners' },
  { id: 'logos', label: 'Logos' },
  { id: 'accessories', label: 'Accessories' },
]

/** Focus Store emblem — monochrome coin with a green sprouting leaf, drawn as
 *  pure SVG so there are no emoji or image dependencies. */
function ShopLogo() {
  return (
    <svg className="shop-logo" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="sl-core" cx="35%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e5e5e5" />
          <stop offset="100%" stopColor="#9ca3af" />
        </radialGradient>
        <linearGradient id="sl-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      {/* black outer ring with white rim */}
      <circle cx="32" cy="32" r="30" fill="#050505" />
      <circle cx="32" cy="32" r="29.2" fill="none" stroke="#ffffff" strokeWidth="2.6" />
      {/* white coin face */}
      <circle cx="32" cy="32" r="22.5" fill="url(#sl-core)" />
      <circle cx="32" cy="32" r="22.5" fill="none" stroke="rgba(0, 0, 0, 0.25)" strokeWidth="0.8" />
      {/* sprouting leaf */}
      <path d="M32 44.5 C 24.5 38.5, 22.5 28.5, 26.5 20.5 C 30.5 26, 34 26, 37.5 21.5 C 41.5 29, 39.5 38.5, 32 44.5 Z" fill="url(#sl-leaf)" />
      <path d="M26.5 20.5 C 30.5 26, 34 26, 37.5 21.5" fill="none" stroke="#064e1e" strokeWidth="1.4" strokeLinecap="round" />
      {/* green spark above the leaf */}
      <path d="M32 10.5 l 2.1 4.4 4.9 0.7 -3.5 3.4 0.8 4.9 -4.3 -2.3 -4.3 2.3 0.8 -4.9 -3.5 -3.4 4.9 -0.7 Z" fill="#4ade80" />
    </svg>
  )
}

/** Small line icons for the main shop tabs (no emoji). */
function ShopIcon({ id }: { id: ShopTab }) {
  const common = {
    className: 'shop-tab-ico',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (id === 'characters') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20c1.4-3.6 4.4-5.2 7.5-5.2s6.1 1.6 7.5 5.2" />
      </svg>
    )
  }
  if (id === 'banners') {
    return (
      <svg {...common}>
        <path d="M5 3v18" />
        <path d="M5 4.5c4-2.2 6 1.8 10 0v8.5c-4 1.8-6-2.2-10 0" />
      </svg>
    )
  }
  if (id === 'logos') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="5.5" y="8.5" width="13" height="11.5" rx="3" />
      <path d="M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5" />
      <path d="M5.5 13h13" />
    </svg>
  )
}

/** Green star for the premium balance pill (no emoji). */
function StarIcon() {
  return (
    <svg className="shop-balance-star" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.6l2.55 5.8 6.35 0.55 -4.8 4.25 1.4 6.25 -5.5 -3.25 -5.5 3.25 1.4 -6.25 -4.8 -4.25 6.35 -0.55 Z"
        fill="#4ade80"
        stroke="#16a34a"
        strokeWidth="0.9"
      />
    </svg>
  )
}

/** Small leaf for leaf-price chips (no emoji, no image dependency). */
function LeafIcon() {
  return (
    <svg className="shop-leaf" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19.5 4.8c-6.6-.4-12.3 2-12.3 7.5 0 3.6 2.6 6.2 6 6.2 5.4 0 6.8-7.5 6.3-13.7Z"
        fill="#4ade80"
        stroke="#16a34a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M7.8 17.2c2.8-4.3 6.4-7.9 11-9.6" fill="none" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

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

const PREVIEW_LABEL: Record<ShopTab, string> = {
  characters: 'Character preview',
  banners: 'Banner preview',
  logos: 'Logo preview',
  accessories: 'Accessory preview',
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
    const hideOwned = <T extends { id: string }>(list: T[]) => list.filter((x) => !ownedItems.includes(x.id))
    if (tab === 'characters') {
      if (sub === 'starter') return hideOwned(characters.filter((c) => (c.price ?? 0) === 0))
      if (sub === 'epic' || sub === 'legendary') return hideOwned(characters.filter((c) => (c.rarity ?? '').toLowerCase() === sub))
      return hideOwned(characters)
    }
    if (tab === 'banners') {
      if (sub === 'default' || sub === 'gradient' || sub === 'others') return hideOwned(banners.filter((b) => b.category === sub))
      return hideOwned(banners)
    }
    if (tab === 'logos') {
      if (sub === 'default' || sub === 'others') return hideOwned(logos.filter((l) => l.category === sub))
      return hideOwned(logos)
    }
    if (sub === 'green') return hideOwned(accessories.filter((a) => a.currency !== 'gold'))
    if (sub === 'gold') return hideOwned(accessories.filter((a) => a.currency === 'gold'))
    return hideOwned(accessories)
  }, [tab, sub, characters, banners, logos, accessories, ownedItems])

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
          Buy for {price}
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
          Buy for {price}
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
          Buy for {price}
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
        Buy for {price}
      </button>
    )
  }

  const metaPrice = meta && 'price' in meta ? (meta as { price?: number }).price ?? 0 : 0
  const metaCur = meta && 'currency' in meta ? (meta as { currency?: string }).currency : undefined
  const canAffordSelected = meta ? canBuyWith(metaPrice, metaCur) : true

  return (
    <div className="shop-page">
      <div className="shop-bg">
        <div className="shop-orb shop-orb--a" />
        <div className="shop-orb shop-orb--b" />
        <div className="shop-orb shop-orb--c" />
        <div className="shop-spark shop-spark--1" />
        <div className="shop-spark shop-spark--2" />
        <div className="shop-spark shop-spark--3" />
      </div>

      <header className="shop-topbar">
        <button className="shop-back" onClick={() => navigate(-1)}>
          <svg className="shop-back-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back
        </button>
        <div className="shop-brand">
          <ShopLogo />
          <span className="shop-brand-name">Focus Store</span>
        </div>
        <div className="shop-balance">
          <span className="shop-balance-pill"><LeafIcon />{xp.toLocaleString()}</span>
          <span className="shop-balance-pill shop-balance-pill--gold"><StarIcon />{premiumXp.toLocaleString()}</span>
          <button className="shop-gold-btn" onClick={() => navigate('/store')}>Get Golden</button>
        </div>
      </header>

      <nav className="shop-tabs">
        {MAIN_TABS.map((t) => (
          <button key={t.id} className={`shop-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <ShopIcon id={t.id} />
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
            {filtered.length === 0 && (
              <div className="shop-empty">
                <p className="shop-empty-title">You own the whole shelf</p>
                <p className="shop-empty-sub">Everything in this category is yours — new items arrive soon.</p>
              </div>
            )}
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
                    aria-pressed={selected}
                    title={name}
                  >
                    <div className="card-thumb">
                      {tab === 'characters' && 'icon' in item ? (
                        <img className="card-img" src={(item as { icon?: string }).icon} alt={name} draggable={false} />
                      ) : tab === 'accessories' ? (
                        <span className="card-acc">
                          {((item as { name?: string }).name || '?').charAt(0)}
                        </span>
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
                      {tab === 'characters' && <span className="card-rarity" data-rarity={rarity}>{rarity}</span>}
                      {owned && <span className="card-own">Owned</span>}
                    </div>
                    <div className="card-foot">
                      <span className="card-name">{name}</span>
                      {!owned && price > 0 ? (
                        <span className="card-price" data-gold={gold(cur) ? '' : undefined}>
                          {gold(cur) ? <StarIcon /> : <LeafIcon />}
                          {price}
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
            <div className="pv-heading">
              <div className="pv-eyebrow">{PREVIEW_LABEL[tab]}</div>
              <div className="pv-title">{meta ? ('name' in meta ? meta.name : '') : ''}</div>
            </div>
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
              <Suspense fallback={<div className="pv-loading">Loading 3D…</div>}>
                <AccessoryPreview3D id={selectedId} />
              </Suspense>
            )}
          </div>

          <div className="pv-body">
            {tab === 'characters' && meta && 'description' in meta && (
              <p className="pv-desc">{(meta as { description?: string }).description}</p>
            )}
            {tab === 'accessories' && meta && 'blurb' in meta && (
              <p className="pv-desc">{(meta as { blurb?: string }).blurb}</p>
            )}
            {meta && metaPrice !== 0 && (
              <div className="pv-price-row">
                {metaCur === 'gold' ? <StarIcon /> : <LeafIcon />}
                <span className="pv-price">{metaPrice}</span>
                <span className="pv-currency">{metaCur === 'gold' ? 'Golden' : 'Leaves'}</span>
              </div>
            )}
            {renderCta()}
            {!selectedOwned && meta && metaPrice !== 0 && !canAffordSelected && (
              <button className="pv-gold" onClick={() => navigate('/store')}>Need more leaves? Get Golden</button>
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
  // Preview the player's REAL avatar when they're looking at the character they
  // have equipped (skin/hair/outfit/accessories all carry over), and the
  // character's signature look otherwise — that's exactly what equipping it
  // would produce.
  const liveConfig = useAvatar((s) => s.config)
  const config =
    (liveConfig.characterId || 'james') === characterId
      ? liveConfig
      : characterById(characterId).fallback
  return (
    <Canvas
      events={createNullSafeEvents}
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.1, 3.6], fov: 40, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#050505']} />
      <hemisphereLight args={['#ffffff', '#0a0a0a', 0.9]} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-2, 3, -1]} intensity={0.35} color="#cfead8" />
      <pointLight position={[0, 0.6, 0]} intensity={0.7} color="#4ade80" distance={4} decay={2} />
      <ambientLight intensity={0.3} color="#ffffff" />
      <group position={[0, -0.95, 0]}>
        <CharacterAvatar config={config} static />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[0.7, 48]} />
          <meshStandardMaterial color="#151515" roughness={0.9} metalness={0} />
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

/** Live 3D turntable preview of the selected accessory — every laptop shows its
 *  real procedural model (aluminum study laptop, dark RGB gaming rig, navy
 *  triple-monitor trading station) instead of a flat emoji. */
function SpinningAccessory({ id }: { id: AccessoryId }) {
  const spin = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.5
  })
  return (
    <group ref={spin}>
      <AccessoryModel id={id} />
    </group>
  )
}

function AccessoryPreview3D({ id }: { id: string }) {
  return (
    <Canvas
      events={createNullSafeEvents}
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.5, 2.6], fov: 40, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#050505']} />
      <hemisphereLight args={['#ffffff', '#0a0a0a', 0.9]} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-2, 3, -1]} intensity={0.35} color="#cfead8" />
      <ambientLight intensity={0.3} color="#ffffff" />
      <group position={[0, -0.42, 0]}>
        <SpinningAccessory id={id as AccessoryId} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[0.55, 48]} />
          <meshStandardMaterial color="#151515" roughness={0.9} metalness={0} />
        </mesh>
      </group>
    </Canvas>
  )
}
