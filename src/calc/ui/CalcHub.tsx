import { useEffect, useMemo, useState } from 'react'
import { PngIcon } from '../../components/PngIcon'
import '../registry' // ensure all calculators are registered
import {
  CATEGORIES,
  allCalcs,
  calcsByCategory,
  categoryCount,
  getCalc,
  getCategory,
  searchCalcs,
  type CalcCategoryId,
  type CalcModule,
} from '../registry/registry'
import { useCalcPrefs } from '../store/prefs'
import { FloatingWindow } from '../ui/FloatingWindow'
import './CalcHub.css'

// The Calculator Hub. A clean Basic Calculator is the default view; a ☰ button
// (and the sidebar) opens the full hub of categorised calculators with instant
// search, favorites, recents and "most popular". The flagship Master Calculator
// opens in a large floating professional window; every other calculator opens in
// a centred modal panel. Built entirely off the plugin registry, so it scales to
// hundreds of calculators with no changes here.

type View =
  | { kind: 'home' }
  | { kind: 'category'; id: CalcCategoryId }
  | { kind: 'favorites' }
  | { kind: 'recents' }

export function CalcHub({ onExit }: { onExit?: () => void }) {
  const [open, setOpen] = useState(true) // sidebar open
  const [view, setView] = useState<View>({ kind: 'home' })
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null) // open calculator modal
  const [masterOpen, setMasterOpen] = useState(false)

  const prefs = useCalcPrefs()
  const results = useMemo(() => searchCalcs(query), [query])

  function openCalc(id: string) {
    prefs.markUsed(id)
    if (id === 'master') {
      setMasterOpen(true)
      return
    }
    setActiveId(id)
  }

  // Keyboard shortcut: "/" focuses search; Escape closes the open calculator.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeId) setActiveId(null)
        else if (masterOpen) setMasterOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId, masterOpen])

  const active = activeId ? getCalc(activeId) : null
  const master = getCalc('master')!

  return (
    <div className={`ch ${open ? '' : 'sidebar-collapsed'}`}>
      {/* ---------------- top bar ---------------- */}
      <header className="ch-topbar">
        <button className="ch-menu" onClick={() => setOpen((o) => !o)} aria-label="Toggle calculator hub">
          ☰
        </button>
        <button className="ch-brand" onClick={() => setView({ kind: 'home' })}>
          <PngIcon name="lotus" size={26} />
          <span>Calc<b>Hub</b></span>
        </button>

        <div className="ch-search">
          <span className="ch-search-icon">⌕</span>
          <input
            placeholder="Search calculators — e.g. currency, bmi, loan, temperature"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && <button className="ch-search-clear" onClick={() => setQuery('')}>✕</button>}
          {query && (
            <div className="ch-search-results">
              {results.length === 0 && <div className="ch-search-empty">No calculators match “{query}”.</div>}
              {results.map(({ calc }) => (
                <button key={calc.id} className="ch-search-row" onClick={() => { openCalc(calc.id); setQuery('') }}>
                  <CalcGlyph calc={calc} size={24} />
                  <span className="ch-search-name">{calc.name}</span>
                  <span className="ch-search-cat">{getCategory(calc.category).name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ch-top-actions">
          <button className={`ch-top-btn ${view.kind === 'favorites' ? 'on' : ''}`} onClick={() => setView({ kind: 'favorites' })}>
            ★ Favorites
          </button>
          <button className={`ch-top-btn ${view.kind === 'recents' ? 'on' : ''}`} onClick={() => setView({ kind: 'recents' })}>
            ↺ History
          </button>
          {onExit && <button className="ch-top-btn exit" onClick={onExit}>‹ Realm</button>}
        </div>
      </header>

      <div className="ch-body">
        {/* ---------------- sidebar ---------------- */}
        <aside className="ch-sidebar">
          <button className="ch-master-cta" onClick={() => openCalc('master')}>
            <PngIcon name="realm" size={30} />
            <span>
              <strong>Master Calculator</strong>
              <small>The all-in-one workspace</small>
            </span>
          </button>

          <nav className="ch-nav">
            <button className={`ch-nav-item ${view.kind === 'home' ? 'on' : ''}`} onClick={() => setView({ kind: 'home' })}>
              <span className="ch-nav-glyph">⌂</span> All Calculators
              <span className="ch-nav-count">{allCalcs().length}</span>
            </button>
            {CATEGORIES.filter((c) => c.id !== 'featured').map((cat) => (
              <button
                key={cat.id}
                className={`ch-nav-item ${view.kind === 'category' && view.id === cat.id ? 'on' : ''}`}
                onClick={() => setView({ kind: 'category', id: cat.id })}
              >
                <span className="ch-nav-glyph">{cat.glyph}</span> {cat.name}
                <span className="ch-nav-count">{categoryCount(cat.id)}</span>
              </button>
            ))}
          </nav>

          <div className="ch-sidebar-foot">
            <button className={`ch-nav-item ${view.kind === 'favorites' ? 'on' : ''}`} onClick={() => setView({ kind: 'favorites' })}>
              <span className="ch-nav-glyph">★</span> Favorites
              <span className="ch-nav-count">{prefs.favorites.length}</span>
            </button>
            <button className={`ch-nav-item ${view.kind === 'recents' ? 'on' : ''}`} onClick={() => setView({ kind: 'recents' })}>
              <span className="ch-nav-glyph">↺</span> Recent
              <span className="ch-nav-count">{prefs.recents.length}</span>
            </button>
          </div>
        </aside>

        {/* ---------------- main ---------------- */}
        <main className="ch-main">
          {view.kind === 'home' && <HomeView onOpen={openCalc} />}
          {view.kind === 'category' && <CategoryView id={view.id} onOpen={openCalc} />}
          {view.kind === 'favorites' && <ListView title="Favorites" calcs={favList(prefs.favorites)} onOpen={openCalc} empty="Tap the ★ on any calculator to pin it here." />}
          {view.kind === 'recents' && <ListView title="Recently used" calcs={favList(prefs.recents)} onOpen={openCalc} empty="Calculators you open will appear here." />}
        </main>
      </div>

      {/* ---------------- the Master Calculator floating window ---------------- */}
      {masterOpen && (
        <FloatingWindow
          title="Master Calculator"
          icon={<PngIcon name="realm" size={20} />}
          onClose={() => setMasterOpen(false)}
        >
          <div className="ch-window-body">
            <master.Component />
          </div>
        </FloatingWindow>
      )}

      {/* ---------------- regular calculator modal ---------------- */}
      {active && (
        <div className="ch-modal-scrim" onPointerDown={(e) => e.target === e.currentTarget && setActiveId(null)}>
          <div className="ch-modal" role="dialog" aria-label={active.name}>
            <header className="ch-modal-head">
              <div className="ch-modal-title">
                <CalcGlyph calc={active} size={26} />
                <div>
                  <strong>{active.name}</strong>
                  <small>{active.description}</small>
                </div>
              </div>
              <div className="ch-modal-actions">
                <button
                  className={`ch-fav ${prefs.isFavorite(active.id) ? 'on' : ''}`}
                  onClick={() => prefs.toggleFavorite(active.id)}
                  title="Favorite"
                >
                  ★
                </button>
                <button className="ch-modal-x" onClick={() => setActiveId(null)} aria-label="Close">✕</button>
              </div>
            </header>
            <div className="ch-modal-body">
              <active.Component />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function favList(ids: string[]): CalcModule[] {
  return ids.map((id) => getCalc(id)).filter(Boolean) as CalcModule[]
}

/* ----------------------------------------------------------------- views --- */

function HomeView({ onOpen }: { onOpen: (id: string) => void }) {
  const prefs = useCalcPrefs()
  const featured = allCalcs().filter((c) => c.featured).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  const popular = [...allCalcs()].sort((a, b) => {
    const ua = prefs.usage[a.id] ?? 0, ub = prefs.usage[b.id] ?? 0
    return ub - ua || (b.popularity ?? 0) - (a.popularity ?? 0)
  }).slice(0, 8)
  const recents = favList(prefs.recents).slice(0, 6)

  return (
    <div className="ch-home">
      <section className="ch-hero">
        <div className="ch-hero-text">
          <span className="ch-pill">Calculator Hub</span>
          <h1>Hundreds of calculators. One calm workspace.</h1>
          <p>Start with the Master Calculator, or pick any tool from the hub. Search anything instantly.</p>
        </div>
      </section>

      <Shelf title="Featured" calcs={featured} onOpen={onOpen} big />
      {recents.length > 0 && <Shelf title="Recently used" calcs={recents} onOpen={onOpen} />}
      <Shelf title="Most popular" calcs={popular} onOpen={onOpen} />
    </div>
  )
}

function CategoryView({ id, onOpen }: { id: CalcCategoryId; onOpen: (id: string) => void }) {
  const cat = getCategory(id)
  const calcs = calcsByCategory(id)
  return (
    <div className="ch-cat">
      <header className="ch-cat-head">
        <span className="ch-cat-glyph">{cat.glyph}</span>
        <div>
          <h1>{cat.name}</h1>
          <p>{cat.blurb}</p>
        </div>
      </header>
      <Grid calcs={calcs} onOpen={onOpen} />
    </div>
  )
}

function ListView({ title, calcs, onOpen, empty }: { title: string; calcs: CalcModule[]; onOpen: (id: string) => void; empty: string }) {
  return (
    <div className="ch-cat">
      <header className="ch-cat-head">
        <div>
          <h1>{title}</h1>
        </div>
      </header>
      {calcs.length === 0 ? <p className="ch-empty">{empty}</p> : <Grid calcs={calcs} onOpen={onOpen} />}
    </div>
  )
}

/* ------------------------------------------------------------- components --- */

function Shelf({ title, calcs, onOpen, big }: { title: string; calcs: CalcModule[]; onOpen: (id: string) => void; big?: boolean }) {
  if (!calcs.length) return null
  return (
    <section className="ch-shelf">
      <h2>{title}</h2>
      <div className={`ch-tile-row ${big ? 'big' : ''}`}>
        {calcs.map((c) => <Tile key={c.id} calc={c} onOpen={onOpen} big={big} />)}
      </div>
    </section>
  )
}

function Grid({ calcs, onOpen }: { calcs: CalcModule[]; onOpen: (id: string) => void }) {
  return (
    <div className="ch-grid">
      {calcs.map((c) => <Tile key={c.id} calc={c} onOpen={onOpen} />)}
    </div>
  )
}

function Tile({ calc, onOpen, big }: { calc: CalcModule; onOpen: (id: string) => void; big?: boolean }) {
  const prefs = useCalcPrefs()
  const fav = prefs.isFavorite(calc.id)
  return (
    <div className={`ch-tile ${big ? 'big' : ''} ${calc.featured ? 'featured' : ''}`}>
      <button className="ch-tile-main" onClick={() => onOpen(calc.id)}>
        <span className="ch-tile-icon"><CalcGlyph calc={calc} size={big ? 40 : 30} /></span>
        <span className="ch-tile-text">
          <strong>{calc.name}</strong>
          <small>{calc.description}</small>
        </span>
      </button>
      <button
        className={`ch-tile-fav ${fav ? 'on' : ''}`}
        onClick={(e) => { e.stopPropagation(); prefs.toggleFavorite(calc.id) }}
        title={fav ? 'Remove favorite' : 'Add favorite'}
      >
        ★
      </button>
    </div>
  )
}

/** A calculator's icon: its PNG feature icon if it has one, else the category glyph. */
function CalcGlyph({ calc, size }: { calc: CalcModule; size: number }) {
  if (calc.icon) return <PngIcon name={calc.icon} size={size} />
  return <span className="ch-glyph" style={{ fontSize: size * 0.7 }}>{getCategory(calc.category).glyph}</span>
}
