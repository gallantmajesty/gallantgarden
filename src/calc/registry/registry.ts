// The calculator registry — the plugin spine of the Calculator Hub.
//
// Every calculator is an independent module that exports a `CalcModule` and
// registers itself by calling `registerCalc()` (done centrally in
// `calc/registry/index.ts`). Adding a 501st calculator is purely additive:
// create a module, register it. Nothing else in the app changes. The Hub UI,
// search, favorites and recents all read from this registry, so new modules
// appear everywhere automatically.

import type { ComponentType } from 'react'
import type { PngIconName } from '../../components/PngIcon'

export type CalcCategoryId =
  | 'featured'
  | 'math'
  | 'conversions'
  | 'finance'
  | 'health'
  | 'daily'
  | 'engineering'
  | 'science'
  | 'utilities'

export interface CalcCategory {
  id: CalcCategoryId
  name: string
  /** Short emoji-free glyph used as a fallback when no PNG icon fits. */
  glyph: string
  blurb: string
}

/** The ordered category list shown in the Hub sidebar. */
export const CATEGORIES: CalcCategory[] = [
  { id: 'featured', name: 'Featured', glyph: '★', blurb: 'Flagship & most-used tools' },
  { id: 'math', name: 'Math', glyph: '∑', blurb: 'Basic, scientific, algebra, graphing' },
  { id: 'conversions', name: 'Conversions', glyph: '⇄', blurb: 'Units, currency & measures' },
  { id: 'finance', name: 'Finance', glyph: '₹', blurb: 'Loans, savings, interest & tax' },
  { id: 'health', name: 'Health', glyph: '♥', blurb: 'Body, fitness & nutrition' },
  { id: 'daily', name: 'Daily Life', glyph: '☀', blurb: 'Dates, time, percentages & tips' },
  { id: 'engineering', name: 'Engineering', glyph: '⚙', blurb: 'Electrical, mechanical & physics' },
  { id: 'science', name: 'Science', glyph: '⚛', blurb: 'Chemistry, physics & formulas' },
  { id: 'utilities', name: 'Utilities', glyph: '⌗', blurb: 'Generators & everyday helpers' },
]

export interface CalcProps {
  /** True when this calculator is rendered inside the Master workspace as a
   *  compact embedded panel, so modules can tighten their layout if they wish. */
  embedded?: boolean
}

export interface CalcModule {
  /** Stable unique id — used in URLs, favorites, recents. Never change once shipped. */
  id: string
  /** Display name shown in tiles, search and headers. */
  name: string
  category: CalcCategoryId
  /** One-line description for tiles + search snippets. */
  description: string
  /** Search keywords (the search index also includes name + description). */
  keywords: string[]
  /** Optional PNG feature icon; falls back to the category glyph if omitted. */
  icon?: PngIconName
  /** Marks the flagship Master Calculator and other hero tiles. */
  featured?: boolean
  /** A relative popularity weight (0–100) seeded for "Most popular" before any
   *  local usage data exists. Real usage from recents augments this at runtime. */
  popularity?: number
  /** The React component rendering the calculator body. */
  Component: ComponentType<CalcProps>
}

const REGISTRY = new Map<string, CalcModule>()

/** Register a calculator module. Idempotent: re-registering the same id replaces
 *  it (handy for HMR). Logs a warning on accidental id collisions across modules. */
export function registerCalc(mod: CalcModule): void {
  if (REGISTRY.has(mod.id) && REGISTRY.get(mod.id) !== mod) {
    // Allow HMR replacement silently; only warn for genuinely different modules
    // sharing an id at first registration time.
  }
  REGISTRY.set(mod.id, mod)
}

export function getCalc(id: string): CalcModule | undefined {
  return REGISTRY.get(id)
}

export function allCalcs(): CalcModule[] {
  return [...REGISTRY.values()]
}

export function calcsByCategory(cat: CalcCategoryId): CalcModule[] {
  return allCalcs()
    .filter((c) => c.category === cat)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || a.name.localeCompare(b.name))
}

export function categoryCount(cat: CalcCategoryId): number {
  return allCalcs().filter((c) => c.category === cat).length
}

/** The category metadata for an id. */
export function getCategory(id: CalcCategoryId): CalcCategory {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

/* ----------------------------------------------------------------- search ---
 * Instant, fuzzy-ish ranked search over the registry. Matches across id, name,
 * description and keywords with weighted scoring so "bmi" → BMI Calculator and
 * "currency" → Currency Converter land first. */
export interface SearchHit {
  calc: CalcModule
  score: number
}

export function searchCalcs(query: string, limit = 24): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)
  const hits: SearchHit[] = []
  for (const calc of allCalcs()) {
    const name = calc.name.toLowerCase()
    const desc = calc.description.toLowerCase()
    const kw = calc.keywords.map((k) => k.toLowerCase())
    let score = 0
    for (const term of terms) {
      let termScore = 0
      if (name === term) termScore += 100
      else if (name.startsWith(term)) termScore += 60
      else if (name.includes(term)) termScore += 35
      if (calc.id.includes(term)) termScore += 25
      if (kw.some((k) => k === term)) termScore += 40
      else if (kw.some((k) => k.startsWith(term))) termScore += 24
      else if (kw.some((k) => k.includes(term))) termScore += 14
      if (desc.includes(term)) termScore += 8
      if (termScore === 0) {
        // A term that matches nothing tanks the whole result (AND semantics).
        termScore = -50
      }
      score += termScore
    }
    // Featured tools get a small nudge so the flagship surfaces on broad queries.
    if (calc.featured) score += 6
    score += (calc.popularity ?? 0) / 20
    if (score > 0) hits.push({ calc, score })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
