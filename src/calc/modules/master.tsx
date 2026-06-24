import { useState } from 'react'
import type { CalcModule } from '../registry/registry'
import { useKeypad } from '../engine/useKeypad'
import { Keypad } from '../ui/Keypad'
import './master.css'

// The flagship Master Calculator. It combines the most-used tools into one
// workspace so most users never need to leave it: a scientific keypad with live
// history + memory, plus quick-access tabs that embed existing calculator
// modules (conversions, currency, dates, percentages, finance, constants).
//
// The floating-window chrome (resize / drag / minimise / maximise) is provided
// by the Hub host that renders the Master Calculator; this component is the
// workspace *content*. It reuses the same module components as the rest of the
// Hub, so it never drifts out of sync with them.

import { CONVERSION_CALCS } from './conversions'
import { FINANCE_CALCS } from './finance'
import { DAILY_CALCS } from './daily'
import { SCIENCE_CALCS } from './sciences'

function pick(list: CalcModule[], id: string) {
  return list.find((c) => c.id === id)!.Component
}

const CurrencyConverter = pick(CONVERSION_CALCS, 'conv-currency')
const LengthConverter = pick(CONVERSION_CALCS, 'conv-length')
const TempConverter = pick(CONVERSION_CALCS, 'conv-temperature')
const Percentage = pick(DAILY_CALCS, 'daily-percentage')
const Age = pick(DAILY_CALCS, 'daily-age')
const Emi = pick(FINANCE_CALCS, 'fin-emi')
const Compound = pick(FINANCE_CALCS, 'fin-compound')
const Constants = pick(SCIENCE_CALCS, 'sci-constants')

type Tab =
  | 'calc' | 'convert' | 'currency' | 'dates' | 'percent' | 'finance' | 'constants'

const TABS: { id: Tab; label: string }[] = [
  { id: 'calc', label: 'Calculator' },
  { id: 'convert', label: 'Convert' },
  { id: 'currency', label: 'Currency' },
  { id: 'dates', label: 'Dates' },
  { id: 'percent', label: 'Percentage' },
  { id: 'finance', label: 'Finance' },
  { id: 'constants', label: 'Constants' },
]

function MasterCalculator({ embedded }: { embedded?: boolean }) {
  const [tab, setTab] = useState<Tab>('calc')
  const k = useKeypad()

  return (
    <div className={`master ${embedded ? 'embedded' : ''}`}>
      <div className="master-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`master-tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="master-body">
        {tab === 'calc' && (
          <div className="master-calc-split">
            <div className="master-calc-pad">
              <Keypad k={k} scientific />
            </div>
            <aside className="master-side">
              <section className="master-card">
                <header>History</header>
                <div className="master-history">
                  {k.history.length === 0 && <p className="master-empty">No calculations yet.</p>}
                  {k.history.slice(0, 12).map((h, idx) => (
                    <button key={idx} className="master-hist-row" onClick={() => k.recall(h)}>
                      <span className="master-hist-expr">{h.expr}</span>
                      <span className="master-hist-eq">= {h.result}</span>
                    </button>
                  ))}
                </div>
                {k.history.length > 0 && (
                  <button className="master-clear" onClick={k.clearHistory}>Clear history</button>
                )}
              </section>
              <section className="master-card">
                <header>Memory</header>
                <div className="master-mem-value">{k.memory}</div>
                <div className="master-mem-row">
                  <button onClick={k.memoryClear}>MC</button>
                  <button onClick={k.memoryRecall}>MR</button>
                  <button onClick={k.memoryAdd}>M+</button>
                  <button onClick={k.memorySub}>M−</button>
                </div>
              </section>
            </aside>
          </div>
        )}

        {tab === 'convert' && (
          <div className="master-two">
            <section className="master-card"><header>Length</header><LengthConverter /></section>
            <section className="master-card"><header>Temperature</header><TempConverter /></section>
          </div>
        )}
        {tab === 'currency' && <section className="master-card solo"><header>Currency Converter</header><CurrencyConverter /></section>}
        {tab === 'dates' && (
          <div className="master-two">
            <section className="master-card"><header>Age</header><Age /></section>
          </div>
        )}
        {tab === 'percent' && <section className="master-card solo"><header>Percentage Tools</header><Percentage /></section>}
        {tab === 'finance' && (
          <div className="master-two">
            <section className="master-card"><header>EMI / Loan</header><Emi /></section>
            <section className="master-card"><header>Compound Interest</header><Compound /></section>
          </div>
        )}
        {tab === 'constants' && <section className="master-card solo"><header>Constants Library</header><Constants /></section>}
      </div>
    </div>
  )
}

export const MASTER_CALC: CalcModule = {
  id: 'master',
  name: 'Master Calculator',
  category: 'featured',
  description: 'The all-in-one flagship workspace — calc, convert, finance, dates & more.',
  keywords: ['master', 'all in one', 'workspace', 'flagship', 'everything', 'pro'],
  icon: 'realm',
  featured: true,
  popularity: 120,
  Component: MasterCalculator,
}
