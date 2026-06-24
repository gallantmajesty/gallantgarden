import { useMemo, useState } from 'react'
import type { CalcModule } from '../registry/registry'
import { CalcLayout, Field, NumberInput, Result, ResultGrid, Segmented, Select, num } from '../ui/kit'
import { formatNumber } from '../engine/math'

// Health calculators: BMI, daily Calorie needs (Mifflin–St Jeor) and Water
// intake. Educational estimates only — copy makes that clear where relevant.

function BmiCalc() {
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric')
  const [height, setHeight] = useState('170')
  const [weight, setWeight] = useState('65')
  const out = useMemo(() => {
    const h = num(height), w = num(weight)
    if (h === null || w === null || h <= 0) return null
    const bmi = unit === 'metric' ? w / Math.pow(h / 100, 2) : (703 * w) / (h * h)
    let cat = 'Normal weight'
    if (bmi < 18.5) cat = 'Underweight'
    else if (bmi < 25) cat = 'Normal weight'
    else if (bmi < 30) cat = 'Overweight'
    else cat = 'Obese'
    return { bmi, cat }
  }, [height, weight, unit])
  return (
    <CalcLayout>
      <Field label="Units">
        <Segmented value={unit} onChange={setUnit} options={[
          { value: 'metric', label: 'Metric (cm/kg)' },
          { value: 'imperial', label: 'Imperial (in/lb)' },
        ]} />
      </Field>
      <Field label={unit === 'metric' ? 'Height (cm)' : 'Height (in)'}><NumberInput value={height} onChange={setHeight} /></Field>
      <Field label={unit === 'metric' ? 'Weight (kg)' : 'Weight (lb)'}><NumberInput value={weight} onChange={setWeight} /></Field>
      {out && <Result label="Body Mass Index" value={formatNumber(Math.round(out.bmi * 10) / 10)} big sub={out.cat} />}
    </CalcLayout>
  )
}

function CalorieCalc() {
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [age, setAge] = useState('25')
  const [height, setHeight] = useState('170')
  const [weight, setWeight] = useState('65')
  const [activity, setActivity] = useState('1.55')
  const out = useMemo(() => {
    const a = num(age), h = num(height), w = num(weight)
    if (a === null || h === null || w === null) return null
    // Mifflin–St Jeor BMR
    const bmr = 10 * w + 6.25 * h - 5 * a + (sex === 'male' ? 5 : -161)
    const tdee = bmr * Number(activity)
    return { bmr, tdee }
  }, [sex, age, height, weight, activity])
  return (
    <CalcLayout>
      <Field label="Sex">
        <Segmented value={sex} onChange={setSex} options={[
          { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
        ]} />
      </Field>
      <Field label="Age"><NumberInput value={age} onChange={setAge} /></Field>
      <Field label="Height (cm)"><NumberInput value={height} onChange={setHeight} /></Field>
      <Field label="Weight (kg)"><NumberInput value={weight} onChange={setWeight} /></Field>
      <Field label="Activity level">
        <Select value={activity} onChange={setActivity} options={[
          { value: '1.2', label: 'Sedentary (little exercise)' },
          { value: '1.375', label: 'Light (1–3 days/wk)' },
          { value: '1.55', label: 'Moderate (3–5 days/wk)' },
          { value: '1.725', label: 'Active (6–7 days/wk)' },
          { value: '1.9', label: 'Very active (athlete)' },
        ]} />
      </Field>
      {out && (
        <ResultGrid>
          <Result label="BMR" value={`${formatNumber(Math.round(out.bmr))} kcal`} />
          <Result label="Daily needs" value={`${formatNumber(Math.round(out.tdee))} kcal`} />
        </ResultGrid>
      )}
    </CalcLayout>
  )
}

function WaterCalc() {
  const [weight, setWeight] = useState('65')
  const [activity, setActivity] = useState('30')
  const out = useMemo(() => {
    const w = num(weight), a = num(activity) ?? 0
    if (w === null) return null
    // ~35 ml per kg baseline + ~12 ml per minute of exercise.
    const ml = w * 35 + a * 12
    return { litres: ml / 1000, glasses: Math.round(ml / 250) }
  }, [weight, activity])
  return (
    <CalcLayout>
      <Field label="Body weight (kg)"><NumberInput value={weight} onChange={setWeight} /></Field>
      <Field label="Daily exercise (minutes)"><NumberInput value={activity} onChange={setActivity} /></Field>
      {out && (
        <>
          <Result label="Recommended intake" value={`${formatNumber(Math.round(out.litres * 10) / 10)} L`} big sub={`≈ ${out.glasses} glasses (250 ml)`} />
        </>
      )}
    </CalcLayout>
  )
}

export const HEALTH_CALCS: CalcModule[] = [
  { id: 'health-bmi', name: 'BMI Calculator', category: 'health', description: 'Body Mass Index & category.', keywords: ['bmi', 'body mass', 'weight', 'health', 'fitness'], featured: true, popularity: 76, Component: BmiCalc },
  { id: 'health-calorie', name: 'Calorie Calculator', category: 'health', description: 'Daily calorie needs (BMR/TDEE).', keywords: ['calorie', 'bmr', 'tdee', 'diet', 'nutrition'], popularity: 62, Component: CalorieCalc },
  { id: 'health-water', name: 'Water Intake', category: 'health', description: 'Daily hydration target.', keywords: ['water', 'hydration', 'drink', 'intake'], popularity: 48, Component: WaterCalc },
]
