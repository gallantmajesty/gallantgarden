import { useMemo, useState } from 'react'
import type { CalcModule } from '../registry/registry'
import { CalcLayout, Field, NumberInput, Select, Result, num } from '../ui/kit'
import { formatNumber } from '../engine/math'

// Conversions. A single generic factor-based converter powers length, weight,
// speed, area, volume, time and data-storage. Temperature needs offset formulas
// so it has a small dedicated converter. Currency uses a static reference table
// (clearly labelled) since there's no live FX feed wired up.

interface Unit {
  id: string
  label: string
  /** Value of 1 of this unit expressed in the category's base unit. */
  factor: number
}

function FactorConverter({ units, defaultFrom, defaultTo }: { units: Unit[]; defaultFrom: string; defaultTo: string }) {
  const [value, setValue] = useState('1')
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const options = units.map((u) => ({ value: u.id, label: u.label }))

  const out = useMemo(() => {
    const v = num(value)
    if (v === null) return ''
    const f = units.find((u) => u.id === from)!.factor
    const t = units.find((u) => u.id === to)!.factor
    return formatNumber((v * f) / t)
  }, [value, from, to, units])

  return (
    <CalcLayout>
      <Field label="Amount">
        <NumberInput value={value} onChange={setValue} />
      </Field>
      <div className="conv-row">
        <Field label="From">
          <Select value={from} onChange={setFrom} options={options} />
        </Field>
        <button className="conv-swap" title="Swap" onClick={() => { setFrom(to); setTo(from) }}>
          ⇄
        </button>
        <Field label="To">
          <Select value={to} onChange={setTo} options={options} />
        </Field>
      </div>
      <Result label="Result" value={out || '—'} big sub={`${value || '0'} ${labelOf(units, from)} = ${out || '—'} ${labelOf(units, to)}`} />
    </CalcLayout>
  )
}

function labelOf(units: Unit[], id: string) {
  return units.find((u) => u.id === id)?.label ?? id
}

/* ---- temperature (offset formulas, not simple factors) ---- */
function TemperatureConverter() {
  const [value, setValue] = useState('100')
  const [from, setFrom] = useState<'C' | 'F' | 'K'>('C')
  const [to, setTo] = useState<'C' | 'F' | 'K'>('F')
  const opts = [
    { value: 'C' as const, label: 'Celsius (°C)' },
    { value: 'F' as const, label: 'Fahrenheit (°F)' },
    { value: 'K' as const, label: 'Kelvin (K)' },
  ]
  const out = useMemo(() => {
    const v = num(value)
    if (v === null) return ''
    const c = from === 'C' ? v : from === 'F' ? (v - 32) * (5 / 9) : v - 273.15
    const r = to === 'C' ? c : to === 'F' ? c * (9 / 5) + 32 : c + 273.15
    return formatNumber(r)
  }, [value, from, to])
  return (
    <CalcLayout>
      <Field label="Temperature">
        <NumberInput value={value} onChange={setValue} />
      </Field>
      <div className="conv-row">
        <Field label="From">
          <Select value={from} onChange={(v) => setFrom(v as 'C' | 'F' | 'K')} options={opts} />
        </Field>
        <button className="conv-swap" onClick={() => { setFrom(to); setTo(from) }}>⇄</button>
        <Field label="To">
          <Select value={to} onChange={(v) => setTo(v as 'C' | 'F' | 'K')} options={opts} />
        </Field>
      </div>
      <Result label="Result" value={out ? `${out}°` : '—'} big />
    </CalcLayout>
  )
}

/* ---- currency (static reference rates) ---- */
// Approximate reference rates relative to 1 USD. Clearly labelled as indicative.
const USD_RATES: Record<string, { label: string; perUsd: number }> = {
  USD: { label: 'US Dollar (USD)', perUsd: 1 },
  EUR: { label: 'Euro (EUR)', perUsd: 0.92 },
  GBP: { label: 'British Pound (GBP)', perUsd: 0.79 },
  INR: { label: 'Indian Rupee (INR)', perUsd: 83.2 },
  JPY: { label: 'Japanese Yen (JPY)', perUsd: 157 },
  AUD: { label: 'Australian Dollar (AUD)', perUsd: 1.52 },
  CAD: { label: 'Canadian Dollar (CAD)', perUsd: 1.36 },
  CNY: { label: 'Chinese Yuan (CNY)', perUsd: 7.24 },
  AED: { label: 'UAE Dirham (AED)', perUsd: 3.67 },
  CHF: { label: 'Swiss Franc (CHF)', perUsd: 0.89 },
}
function CurrencyConverter() {
  const [value, setValue] = useState('100')
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('INR')
  const opts = Object.entries(USD_RATES).map(([id, r]) => ({ value: id, label: r.label }))
  const out = useMemo(() => {
    const v = num(value)
    if (v === null) return ''
    const usd = v / USD_RATES[from].perUsd
    return formatNumber(usd * USD_RATES[to].perUsd)
  }, [value, from, to])
  return (
    <CalcLayout>
      <Field label="Amount">
        <NumberInput value={value} onChange={setValue} />
      </Field>
      <div className="conv-row">
        <Field label="From">
          <Select value={from} onChange={setFrom} options={opts} />
        </Field>
        <button className="conv-swap" onClick={() => { setFrom(to); setTo(from) }}>⇄</button>
        <Field label="To">
          <Select value={to} onChange={setTo} options={opts} />
        </Field>
      </div>
      <Result label="Converted" value={out || '—'} big />
      <p className="conv-note">Indicative reference rates — not live market data.</p>
    </CalcLayout>
  )
}

const LENGTH: Unit[] = [
  { id: 'mm', label: 'Millimetre', factor: 0.001 },
  { id: 'cm', label: 'Centimetre', factor: 0.01 },
  { id: 'm', label: 'Metre', factor: 1 },
  { id: 'km', label: 'Kilometre', factor: 1000 },
  { id: 'in', label: 'Inch', factor: 0.0254 },
  { id: 'ft', label: 'Foot', factor: 0.3048 },
  { id: 'yd', label: 'Yard', factor: 0.9144 },
  { id: 'mi', label: 'Mile', factor: 1609.344 },
  { id: 'nmi', label: 'Nautical mile', factor: 1852 },
]
const WEIGHT: Unit[] = [
  { id: 'mg', label: 'Milligram', factor: 1e-6 },
  { id: 'g', label: 'Gram', factor: 0.001 },
  { id: 'kg', label: 'Kilogram', factor: 1 },
  { id: 't', label: 'Tonne', factor: 1000 },
  { id: 'oz', label: 'Ounce', factor: 0.0283495 },
  { id: 'lb', label: 'Pound', factor: 0.453592 },
  { id: 'st', label: 'Stone', factor: 6.35029 },
]
const SPEED: Unit[] = [
  { id: 'mps', label: 'Metre / second', factor: 1 },
  { id: 'kmph', label: 'Kilometre / hour', factor: 0.277778 },
  { id: 'mph', label: 'Mile / hour', factor: 0.44704 },
  { id: 'knot', label: 'Knot', factor: 0.514444 },
  { id: 'fps', label: 'Foot / second', factor: 0.3048 },
]
const AREA: Unit[] = [
  { id: 'mm2', label: 'Square millimetre', factor: 1e-6 },
  { id: 'cm2', label: 'Square centimetre', factor: 1e-4 },
  { id: 'm2', label: 'Square metre', factor: 1 },
  { id: 'ha', label: 'Hectare', factor: 10000 },
  { id: 'km2', label: 'Square kilometre', factor: 1e6 },
  { id: 'ft2', label: 'Square foot', factor: 0.092903 },
  { id: 'ac', label: 'Acre', factor: 4046.86 },
]
const VOLUME: Unit[] = [
  { id: 'ml', label: 'Millilitre', factor: 0.001 },
  { id: 'l', label: 'Litre', factor: 1 },
  { id: 'm3', label: 'Cubic metre', factor: 1000 },
  { id: 'tsp', label: 'Teaspoon', factor: 0.00492892 },
  { id: 'tbsp', label: 'Tablespoon', factor: 0.0147868 },
  { id: 'cup', label: 'Cup', factor: 0.236588 },
  { id: 'pt', label: 'Pint (US)', factor: 0.473176 },
  { id: 'gal', label: 'Gallon (US)', factor: 3.78541 },
]
const TIME: Unit[] = [
  { id: 'ms', label: 'Millisecond', factor: 0.001 },
  { id: 's', label: 'Second', factor: 1 },
  { id: 'min', label: 'Minute', factor: 60 },
  { id: 'h', label: 'Hour', factor: 3600 },
  { id: 'd', label: 'Day', factor: 86400 },
  { id: 'wk', label: 'Week', factor: 604800 },
  { id: 'yr', label: 'Year', factor: 31557600 },
]
const DATA: Unit[] = [
  { id: 'b', label: 'Byte', factor: 1 },
  { id: 'kb', label: 'Kilobyte', factor: 1024 },
  { id: 'mb', label: 'Megabyte', factor: 1024 ** 2 },
  { id: 'gb', label: 'Gigabyte', factor: 1024 ** 3 },
  { id: 'tb', label: 'Terabyte', factor: 1024 ** 4 },
  { id: 'pb', label: 'Petabyte', factor: 1024 ** 5 },
]

function makeFactorCalc(units: Unit[], from: string, to: string) {
  return function Converter() {
    return <FactorConverter units={units} defaultFrom={from} defaultTo={to} />
  }
}

export const CONVERSION_CALCS: CalcModule[] = [
  { id: 'conv-currency', name: 'Currency Converter', category: 'conversions', description: 'Convert between world currencies.', keywords: ['currency', 'money', 'usd', 'eur', 'inr', 'forex', 'exchange'], icon: 'achievements', featured: true, popularity: 85, Component: CurrencyConverter },
  { id: 'conv-temperature', name: 'Temperature Converter', category: 'conversions', description: 'Celsius, Fahrenheit & Kelvin.', keywords: ['temperature', 'celsius', 'fahrenheit', 'kelvin', 'heat'], popularity: 70, Component: TemperatureConverter },
  { id: 'conv-length', name: 'Length Converter', category: 'conversions', description: 'Metres, miles, feet, inches & more.', keywords: ['length', 'distance', 'metre', 'mile', 'foot', 'inch', 'km'], popularity: 72, Component: makeFactorCalc(LENGTH, 'm', 'ft') },
  { id: 'conv-weight', name: 'Weight Converter', category: 'conversions', description: 'Kilograms, pounds, ounces & more.', keywords: ['weight', 'mass', 'kg', 'pound', 'lb', 'ounce', 'gram'], popularity: 68, Component: makeFactorCalc(WEIGHT, 'kg', 'lb') },
  { id: 'conv-speed', name: 'Speed Converter', category: 'conversions', description: 'km/h, mph, m/s, knots.', keywords: ['speed', 'velocity', 'kmph', 'mph', 'knot'], popularity: 55, Component: makeFactorCalc(SPEED, 'kmph', 'mph') },
  { id: 'conv-time', name: 'Time Converter', category: 'conversions', description: 'Seconds, minutes, hours, days, years.', keywords: ['time', 'seconds', 'minutes', 'hours', 'days'], popularity: 52, Component: makeFactorCalc(TIME, 'h', 'min') },
  { id: 'conv-area', name: 'Area Converter', category: 'conversions', description: 'Square metres, acres, hectares.', keywords: ['area', 'square', 'acre', 'hectare', 'land'], popularity: 50, Component: makeFactorCalc(AREA, 'm2', 'ft2') },
  { id: 'conv-volume', name: 'Volume Converter', category: 'conversions', description: 'Litres, gallons, cups, spoons.', keywords: ['volume', 'litre', 'gallon', 'cup', 'capacity'], popularity: 51, Component: makeFactorCalc(VOLUME, 'l', 'gal') },
  { id: 'conv-data', name: 'Data Storage Converter', category: 'conversions', description: 'Bytes, KB, MB, GB, TB.', keywords: ['data', 'storage', 'byte', 'kb', 'mb', 'gb', 'tb', 'memory'], popularity: 53, Component: makeFactorCalc(DATA, 'mb', 'gb') },
]
