import { useMemo, useState } from 'react'
import type { CalcModule } from '../registry/registry'
import { CalcLayout, Field, NumberInput, Result, ResultGrid, Select, num } from '../ui/kit'
import { formatNumber } from '../engine/math'

// Engineering & Science calculators. A representative, working set across the
// spec's Electrical / Mechanical / Physics / Chemistry buckets — each a real
// formula so the categories ship with substance, and a clear template for the
// hundreds of future modules.

/* ---------- Engineering ---------- */

// Ohm's law: solve the missing one of V, I, R from the other two.
function OhmsLaw() {
  const [v, setV] = useState(''); const [i, setI] = useState('2'); const [r, setR] = useState('110')
  const out = useMemo(() => {
    const V = num(v), I = num(i), R = num(r)
    const known = [V, I, R].filter((x) => x !== null).length
    if (known < 2) return null
    if (V === null && I !== null && R !== null) return { label: 'Voltage (V)', value: I * R, extra: `Power ${formatNumber(I * I * R)} W` }
    if (I === null && V !== null && R !== null && R !== 0) return { label: 'Current (A)', value: V / R, extra: `Power ${formatNumber((V * V) / R)} W` }
    if (R === null && V !== null && I !== null && I !== 0) return { label: 'Resistance (Ω)', value: V / I, extra: `Power ${formatNumber(V * I)} W` }
    return null
  }, [v, i, r])
  return (
    <CalcLayout>
      <p className="conv-note">Leave the value you want to find blank; fill the other two.</p>
      <Field label="Voltage (V)"><NumberInput value={v} onChange={setV} /></Field>
      <Field label="Current (I)"><NumberInput value={i} onChange={setI} /></Field>
      <Field label="Resistance (R)"><NumberInput value={r} onChange={setR} /></Field>
      {out && <Result label={out.label} value={formatNumber(out.value)} big sub={out.extra} />}
    </CalcLayout>
  )
}

// Mechanical: force = mass × acceleration.
function ForceCalc() {
  const [mass, setMass] = useState('10'); const [acc, setAcc] = useState('9.81')
  const out = useMemo(() => {
    const m = num(mass), a = num(acc)
    if (m === null || a === null) return null
    return m * a
  }, [mass, acc])
  return (
    <CalcLayout>
      <Field label="Mass (kg)"><NumberInput value={mass} onChange={setMass} /></Field>
      <Field label="Acceleration (m/s²)"><NumberInput value={acc} onChange={setAcc} /></Field>
      {out !== null && <Result label="Force" value={`${formatNumber(out)} N`} big />}
    </CalcLayout>
  )
}

/* ---------- Science / Physics ---------- */

// Kinetic energy: ½mv².
function KineticEnergy() {
  const [mass, setMass] = useState('2'); const [vel, setVel] = useState('10')
  const out = useMemo(() => {
    const m = num(mass), v = num(vel)
    if (m === null || v === null) return null
    return 0.5 * m * v * v
  }, [mass, vel])
  return (
    <CalcLayout>
      <Field label="Mass (kg)"><NumberInput value={mass} onChange={setMass} /></Field>
      <Field label="Velocity (m/s)"><NumberInput value={vel} onChange={setVel} /></Field>
      {out !== null && <Result label="Kinetic energy" value={`${formatNumber(out)} J`} big />}
    </CalcLayout>
  )
}

// Speed / distance / time triangle.
function SpeedCalc() {
  const [dist, setDist] = useState('100'); const [time, setTime] = useState('2'); const [solve, setSolve] = useState<'speed' | 'dist' | 'time'>('speed')
  const [speed, setSpeed] = useState('50')
  const out = useMemo(() => {
    const d = num(dist), t = num(time), s = num(speed)
    if (solve === 'speed' && d !== null && t && t !== 0) return { label: 'Speed', value: `${formatNumber(d / t)} units/time` }
    if (solve === 'dist' && s !== null && t !== null) return { label: 'Distance', value: formatNumber(s * t) }
    if (solve === 'time' && d !== null && s && s !== 0) return { label: 'Time', value: formatNumber(d / s) }
    return null
  }, [dist, time, speed, solve])
  return (
    <CalcLayout>
      <Field label="Solve for">
        <Select value={solve} onChange={setSolve} options={[
          { value: 'speed', label: 'Speed' }, { value: 'dist', label: 'Distance' }, { value: 'time', label: 'Time' },
        ]} />
      </Field>
      {solve !== 'dist' && <Field label="Distance"><NumberInput value={dist} onChange={setDist} /></Field>}
      {solve !== 'time' && <Field label="Speed"><NumberInput value={speed} onChange={setSpeed} /></Field>}
      {solve !== 'speed' && <Field label="Time"><NumberInput value={time} onChange={setTime} /></Field>}
      {out && <Result label={out.label} value={out.value} big />}
    </CalcLayout>
  )
}

// Chemistry: molarity = moles / litres.
function MolarityCalc() {
  const [moles, setMoles] = useState('0.5'); const [vol, setVol] = useState('2')
  const out = useMemo(() => {
    const m = num(moles), v = num(vol)
    if (m === null || v === null || v === 0) return null
    return m / v
  }, [moles, vol])
  return (
    <CalcLayout>
      <Field label="Solute (moles)"><NumberInput value={moles} onChange={setMoles} /></Field>
      <Field label="Solution volume (litres)"><NumberInput value={vol} onChange={setVol} /></Field>
      {out !== null && <Result label="Molarity" value={`${formatNumber(out)} mol/L`} big />}
    </CalcLayout>
  )
}

// A tiny searchable constants reference (also used by the Master Calculator).
const CONSTANTS = [
  { name: 'Speed of light (c)', value: '299,792,458 m/s' },
  { name: 'Gravity (g)', value: '9.80665 m/s²' },
  { name: "Planck's constant (h)", value: '6.626×10⁻³⁴ J·s' },
  { name: 'Avogadro (Nₐ)', value: '6.022×10²³ /mol' },
  { name: 'Gas constant (R)', value: '8.314 J/(mol·K)' },
  { name: 'Elementary charge (e)', value: '1.602×10⁻¹⁹ C' },
  { name: 'Pi (π)', value: '3.14159265359' },
  { name: "Euler's number (e)", value: '2.71828182846' },
  { name: 'Golden ratio (φ)', value: '1.61803398875' },
]
function ConstantsLibrary() {
  const [q, setQ] = useState('')
  const list = CONSTANTS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <CalcLayout>
      <Field label="Search constants">
        <input className="calc-input" value={q} placeholder="e.g. light, gravity, pi" onChange={(e) => setQ(e.target.value)} />
      </Field>
      <ResultGrid>
        {list.map((c) => <Result key={c.name} label={c.name} value={<span style={{ fontSize: 16 }}>{c.value}</span>} />)}
      </ResultGrid>
    </CalcLayout>
  )
}

export const ENGINEERING_CALCS: CalcModule[] = [
  { id: 'eng-ohms', name: 'Ohm’s Law Calculator', category: 'engineering', description: 'Voltage, current & resistance.', keywords: ['ohm', 'electrical', 'voltage', 'current', 'resistance', 'power'], popularity: 46, Component: OhmsLaw },
  { id: 'eng-force', name: 'Force Calculator', category: 'engineering', description: 'F = m × a (Newton’s 2nd law).', keywords: ['force', 'mechanical', 'newton', 'mass', 'acceleration'], popularity: 42, Component: ForceCalc },
]

export const SCIENCE_CALCS: CalcModule[] = [
  { id: 'sci-kinetic', name: 'Kinetic Energy', category: 'science', description: '½ m v² of a moving body.', keywords: ['kinetic', 'energy', 'physics', 'joule', 'velocity'], popularity: 40, Component: KineticEnergy },
  { id: 'sci-speed', name: 'Speed / Distance / Time', category: 'science', description: 'Solve the motion triangle.', keywords: ['speed', 'distance', 'time', 'physics', 'motion'], popularity: 44, Component: SpeedCalc },
  { id: 'sci-molarity', name: 'Molarity Calculator', category: 'science', description: 'Concentration of a solution.', keywords: ['molarity', 'chemistry', 'concentration', 'moles', 'solution'], popularity: 38, Component: MolarityCalc },
  { id: 'sci-constants', name: 'Constants Library', category: 'science', description: 'Physical & math constants.', keywords: ['constants', 'physics', 'reference', 'library', 'formula'], popularity: 41, Component: ConstantsLibrary },
]
