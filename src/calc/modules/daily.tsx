import { useEffect, useMemo, useState } from 'react'
import type { CalcModule } from '../registry/registry'
import { CalcLayout, Field, NumberInput, Result, ResultGrid, Segmented, Select, num } from '../ui/kit'
import { formatNumber } from '../engine/math'

// Daily-life calculators: Age, Date difference, Percentage tools, Countdown
// timer and a simple Time-zone converter.

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function AgeCalc() {
  const [dob, setDob] = useState('2000-01-01')
  const out = useMemo(() => {
    if (!dob) return null
    const birth = new Date(dob)
    const now = new Date()
    if (isNaN(birth.getTime()) || birth > now) return null
    let years = now.getFullYear() - birth.getFullYear()
    let months = now.getMonth() - birth.getMonth()
    let days = now.getDate() - birth.getDate()
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate() }
    if (months < 0) { years--; months += 12 }
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000)
    return { years, months, days, totalDays }
  }, [dob])
  return (
    <CalcLayout>
      <Field label="Date of birth">
        <input className="calc-input" type="date" value={dob} max={todayISO()} onChange={(e) => setDob(e.target.value)} />
      </Field>
      {out && (
        <>
          <Result label="Age" value={`${out.years} yr ${out.months} mo ${out.days} d`} big />
          <ResultGrid>
            <Result label="Total days" value={formatNumber(out.totalDays)} />
            <Result label="Total weeks" value={formatNumber(Math.floor(out.totalDays / 7))} />
          </ResultGrid>
        </>
      )}
    </CalcLayout>
  )
}

function DateDiffCalc() {
  const [start, setStart] = useState('2024-01-01')
  const [end, setEnd] = useState(todayISO())
  const out = useMemo(() => {
    const a = new Date(start), b = new Date(end)
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null
    const ms = Math.abs(b.getTime() - a.getTime())
    const days = Math.floor(ms / 86400000)
    return { days, weeks: Math.floor(days / 7), months: Math.floor(days / 30.44), hours: Math.floor(ms / 3600000) }
  }, [start, end])
  return (
    <CalcLayout>
      <Field label="From">
        <input className="calc-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      <Field label="To">
        <input className="calc-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </Field>
      {out && (
        <ResultGrid>
          <Result label="Days" value={formatNumber(out.days)} />
          <Result label="Weeks" value={formatNumber(out.weeks)} />
          <Result label="≈ Months" value={formatNumber(out.months)} />
          <Result label="Hours" value={formatNumber(out.hours)} />
        </ResultGrid>
      )}
    </CalcLayout>
  )
}

function PercentageCalc() {
  const [mode, setMode] = useState<'of' | 'change' | 'isWhat'>('of')
  const [a, setA] = useState('25')
  const [b, setB] = useState('200')
  const out = useMemo(() => {
    const x = num(a), y = num(b)
    if (x === null || y === null) return null
    if (mode === 'of') return { label: `${a}% of ${b}`, value: formatNumber((x / 100) * y) }
    if (mode === 'isWhat') return { label: `${a} is what % of ${b}`, value: y === 0 ? '—' : `${formatNumber((x / y) * 100)}%` }
    return { label: `Change from ${a} to ${b}`, value: x === 0 ? '—' : `${formatNumber(((y - x) / x) * 100)}%` }
  }, [mode, a, b])
  return (
    <CalcLayout>
      <Field label="Mode">
        <Segmented value={mode} onChange={setMode} options={[
          { value: 'of', label: 'X% of Y' },
          { value: 'isWhat', label: 'X is what % of Y' },
          { value: 'change', label: '% change' },
        ]} />
      </Field>
      <div className="conv-row">
        <Field label="Value A"><NumberInput value={a} onChange={setA} /></Field>
        <Field label="Value B"><NumberInput value={b} onChange={setB} /></Field>
      </div>
      {out && <Result label={out.label} value={out.value} big />}
    </CalcLayout>
  )
}

function CountdownCalc() {
  const [target, setTarget] = useState('')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const out = useMemo(() => {
    if (!target) return null
    const end = new Date(target).getTime()
    if (isNaN(end)) return null
    const ms = end - now
    if (ms <= 0) return { done: true }
    const s = Math.floor(ms / 1000)
    return { done: false, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
  }, [target, now])
  return (
    <CalcLayout>
      <Field label="Count down to">
        <input className="calc-input" type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      {out && (out.done
        ? <Result label="Countdown" value="Time's up! 🎉" big />
        : <Result label="Time remaining" value={`${out.d}d ${out.h}h ${out.m}m ${out.s}s`} big />)}
    </CalcLayout>
  )
}

// A compact offset-based time-zone converter. Uses fixed UTC offsets (no DST) so
// it stays dependency-free; labelled as approximate.
const ZONES: Record<string, number> = {
  'UTC': 0, 'New York (EST)': -5, 'London (GMT)': 0, 'Paris (CET)': 1,
  'India (IST)': 5.5, 'Dubai (GST)': 4, 'Singapore (SGT)': 8, 'Tokyo (JST)': 9,
  'Sydney (AEST)': 10, 'Los Angeles (PST)': -8,
}
function TimezoneCalc() {
  const [time, setTime] = useState('12:00')
  const [from, setFrom] = useState('India (IST)')
  const [to, setTo] = useState('New York (EST)')
  const opts = Object.keys(ZONES).map((z) => ({ value: z, label: z }))
  const out = useMemo(() => {
    const [h, m] = time.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return null
    const utc = h - ZONES[from]
    let target = utc + ZONES[to]
    target = ((target % 24) + 24) % 24
    const hh = Math.floor(target)
    const mm = Math.round((target - hh) * 60) + m
    const carry = Math.floor(mm / 60)
    const finalH = (hh + carry + 24) % 24
    const finalM = ((mm % 60) + 60) % 60
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`
  }, [time, from, to])
  return (
    <CalcLayout>
      <Field label="Time">
        <input className="calc-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <div className="conv-row">
        <Field label="From zone"><Select value={from} onChange={setFrom} options={opts} /></Field>
        <button className="conv-swap" onClick={() => { setFrom(to); setTo(from) }}>⇄</button>
        <Field label="To zone"><Select value={to} onChange={setTo} options={opts} /></Field>
      </div>
      {out && <Result label={`Time in ${to}`} value={out} big />}
      <p className="conv-note">Fixed offsets — does not account for daylight saving.</p>
    </CalcLayout>
  )
}

export const DAILY_CALCS: CalcModule[] = [
  { id: 'daily-age', name: 'Age Calculator', category: 'daily', description: 'Exact age in years, months & days.', keywords: ['age', 'birthday', 'dob', 'born'], featured: true, popularity: 70, Component: AgeCalc },
  { id: 'daily-datediff', name: 'Date Difference', category: 'daily', description: 'Days/weeks/months between dates.', keywords: ['date', 'difference', 'duration', 'between', 'days'], popularity: 60, Component: DateDiffCalc },
  { id: 'daily-percentage', name: 'Percentage Calculator', category: 'daily', description: 'Percent of, change & ratio.', keywords: ['percentage', 'percent', 'change', 'ratio', '%'], featured: true, popularity: 72, Component: PercentageCalc },
  { id: 'daily-countdown', name: 'Countdown Timer', category: 'daily', description: 'Live countdown to any moment.', keywords: ['countdown', 'timer', 'event', 'deadline'], popularity: 50, Component: CountdownCalc },
  { id: 'daily-timezone', name: 'Time Zone Converter', category: 'daily', description: 'Convert a time across zones.', keywords: ['timezone', 'time zone', 'utc', 'gmt', 'world clock'], popularity: 49, Component: TimezoneCalc },
]
