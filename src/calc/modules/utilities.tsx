import { useMemo, useState } from 'react'
import type { CalcModule } from '../registry/registry'
import { CalcLayout, Field, NumberInput, Result, ResultGrid, Segmented, num } from '../ui/kit'
import { formatNumber } from '../engine/math'

// Utilities: random number generator, password generator, tip calculator and
// split-bill calculator. These intentionally use cheap, dependency-free logic.

function RandomCalc() {
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('100')
  const [count, setCount] = useState('1')
  const [result, setResult] = useState<number[]>([])
  function roll() {
    const lo = num(min) ?? 0
    const hi = num(max) ?? 100
    const n = Math.max(1, Math.min(50, Math.floor(num(count) ?? 1)))
    const a = Math.min(lo, hi), b = Math.max(lo, hi)
    const out: number[] = []
    for (let i = 0; i < n; i++) out.push(Math.floor(Math.random() * (b - a + 1)) + a)
    setResult(out)
  }
  return (
    <CalcLayout>
      <div className="conv-row">
        <Field label="Minimum"><NumberInput value={min} onChange={setMin} /></Field>
        <Field label="Maximum"><NumberInput value={max} onChange={setMax} /></Field>
      </div>
      <Field label="How many" hint="1–50"><NumberInput value={count} onChange={setCount} /></Field>
      <button className="calc-action" onClick={roll}>Generate</button>
      {result.length > 0 && <Result label="Random" value={result.join(', ')} big />}
    </CalcLayout>
  )
}

function PasswordCalc() {
  const [length, setLength] = useState('16')
  const [opts, setOpts] = useState({ upper: true, lower: true, digits: true, symbols: true })
  const [pwd, setPwd] = useState('')
  function gen() {
    const sets: string[] = []
    if (opts.lower) sets.push('abcdefghijkmnopqrstuvwxyz')
    if (opts.upper) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ')
    if (opts.digits) sets.push('23456789')
    if (opts.symbols) sets.push('!@#$%^&*-_=+?')
    if (!sets.length) return setPwd('')
    const all = sets.join('')
    const len = Math.max(4, Math.min(64, Math.floor(num(length) ?? 16)))
    const bytes = new Uint32Array(len)
    crypto.getRandomValues(bytes)
    let out = ''
    for (let i = 0; i < len; i++) out += all[bytes[i] % all.length]
    setPwd(out)
  }
  const toggle = (k: keyof typeof opts) => setOpts((o) => ({ ...o, [k]: !o[k] }))
  return (
    <CalcLayout>
      <Field label="Length" hint="4–64"><NumberInput value={length} onChange={setLength} /></Field>
      <Field label="Include">
        <div className="pwd-opts">
          {(['lower', 'upper', 'digits', 'symbols'] as const).map((k) => (
            <button key={k} className={`pwd-chip ${opts[k] ? 'on' : ''}`} onClick={() => toggle(k)}>
              {k === 'lower' ? 'a-z' : k === 'upper' ? 'A-Z' : k === 'digits' ? '0-9' : '!@#'}
            </button>
          ))}
        </div>
      </Field>
      <button className="calc-action" onClick={gen}>Generate password</button>
      {pwd && <Result label="Password" value={<code className="pwd-out">{pwd}</code>} />}
    </CalcLayout>
  )
}

function TipCalc() {
  const [bill, setBill] = useState('1200')
  const [tip, setTip] = useState('10')
  const [people, setPeople] = useState('2')
  const out = useMemo(() => {
    const b = num(bill), t = num(tip), p = num(people)
    if (b === null || t === null) return null
    const tipAmt = (b * t) / 100
    const total = b + tipAmt
    const per = p && p > 0 ? total / p : total
    return { tipAmt, total, per }
  }, [bill, tip, people])
  return (
    <CalcLayout>
      <Field label="Bill amount"><NumberInput value={bill} onChange={setBill} /></Field>
      <Field label="Tip"><NumberInput value={tip} onChange={setTip} suffix="%" /></Field>
      <Field label="Split between"><NumberInput value={people} onChange={setPeople} /></Field>
      {out && (
        <>
          <Result label="Total" value={formatNumber(Math.round(out.total * 100) / 100)} big />
          <ResultGrid>
            <Result label="Tip" value={formatNumber(Math.round(out.tipAmt * 100) / 100)} />
            <Result label="Per person" value={formatNumber(Math.round(out.per * 100) / 100)} />
          </ResultGrid>
        </>
      )}
    </CalcLayout>
  )
}

function SplitCalc() {
  const [total, setTotal] = useState('3000')
  const [people, setPeople] = useState('4')
  const [mode, setMode] = useState<'equal' | 'round'>('equal')
  const out = useMemo(() => {
    const t = num(total), p = num(people)
    if (t === null || p === null || p <= 0) return null
    const exact = t / p
    return { exact, rounded: Math.ceil(exact) }
  }, [total, people])
  return (
    <CalcLayout>
      <Field label="Total bill"><NumberInput value={total} onChange={setTotal} /></Field>
      <Field label="Number of people"><NumberInput value={people} onChange={setPeople} /></Field>
      <Field label="Rounding">
        <Segmented value={mode} onChange={(v) => setMode(v as 'equal' | 'round')} options={[
          { value: 'equal', label: 'Exact' }, { value: 'round', label: 'Round up' },
        ]} />
      </Field>
      {out && <Result label="Each pays" value={formatNumber(mode === 'equal' ? Math.round(out.exact * 100) / 100 : out.rounded)} big />}
    </CalcLayout>
  )
}

export const UTILITY_CALCS: CalcModule[] = [
  { id: 'util-random', name: 'Random Number Generator', category: 'utilities', description: 'Random numbers in a range.', keywords: ['random', 'number', 'generator', 'dice', 'rng'], popularity: 54, Component: RandomCalc },
  { id: 'util-password', name: 'Password Generator', category: 'utilities', description: 'Strong, secure passwords.', keywords: ['password', 'generator', 'secure', 'random', 'security'], popularity: 58, Component: PasswordCalc },
  { id: 'util-tip', name: 'Tip Calculator', category: 'utilities', description: 'Tip & total, split per person.', keywords: ['tip', 'gratuity', 'restaurant', 'bill'], popularity: 56, Component: TipCalc },
  { id: 'util-split', name: 'Split Bill Calculator', category: 'utilities', description: 'Divide a bill fairly.', keywords: ['split', 'bill', 'share', 'divide', 'group'], popularity: 55, Component: SplitCalc },
]
