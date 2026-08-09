import { useMemo, useState } from 'react'
import type { CalcModule } from '../registry/registry'
import { CalcLayout, Field, NumberInput, Result, ResultGrid, Segmented, num } from '../ui/kit'
import { formatNumber } from '../engine/math'

// Finance calculators: EMI/Loan, SIP, Compound Interest, ROI and Tax. Each is a
// small form over the kit primitives. Currency-agnostic — values are plain
// numbers so they work for any currency.

function money(n: number) {
  return formatNumber(Math.round(n * 100) / 100)
}

/* ---- EMI / Loan ---- */
function EmiCalc() {
  const [principal, setPrincipal] = useState('500000')
  const [rate, setRate] = useState('9')
  const [years, setYears] = useState('5')
  const out = useMemo(() => {
    const p = num(principal), r = num(rate), y = num(years)
    if (p === null || r === null || y === null || y <= 0) return null
    const n = y * 12
    const i = r / 12 / 100
    const emi = i === 0 ? p / n : (p * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
    const total = emi * n
    return { emi, total, interest: total - p }
  }, [principal, rate, years])
  return (
    <CalcLayout>
      <Field label="Loan amount"><NumberInput value={principal} onChange={setPrincipal} /></Field>
      <Field label="Annual interest rate" hint="% per year"><NumberInput value={rate} onChange={setRate} suffix="%" /></Field>
      <Field label="Tenure" hint="years"><NumberInput value={years} onChange={setYears} /></Field>
      {out && (
        <>
          <Result label="Monthly EMI" value={money(out.emi)} big />
          <ResultGrid>
            <Result label="Total interest" value={money(out.interest)} />
            <Result label="Total payable" value={money(out.total)} />
          </ResultGrid>
        </>
      )}
    </CalcLayout>
  )
}

/* ---- SIP (systematic investment plan) ---- */
function SipCalc() {
  const [monthly, setMonthly] = useState('5000')
  const [rate, setRate] = useState('12')
  const [years, setYears] = useState('10')
  const out = useMemo(() => {
    const m = num(monthly), r = num(rate), y = num(years)
    if (m === null || r === null || y === null) return null
    const n = y * 12
    const i = r / 12 / 100
    const fv = i === 0 ? m * n : m * ((Math.pow(1 + i, n) - 1) / i) * (1 + i)
    const invested = m * n
    return { fv, invested, gain: fv - invested }
  }, [monthly, rate, years])
  return (
    <CalcLayout>
      <Field label="Monthly investment"><NumberInput value={monthly} onChange={setMonthly} /></Field>
      <Field label="Expected return" hint="% per year"><NumberInput value={rate} onChange={setRate} suffix="%" /></Field>
      <Field label="Duration" hint="years"><NumberInput value={years} onChange={setYears} /></Field>
      {out && (
        <>
          <Result label="Future value" value={money(out.fv)} big />
          <ResultGrid>
            <Result label="Invested" value={money(out.invested)} />
            <Result label="Est. gains" value={money(out.gain)} />
          </ResultGrid>
        </>
      )}
    </CalcLayout>
  )
}

/* ---- Compound interest ---- */
function CompoundCalc() {
  const [principal, setPrincipal] = useState('100000')
  const [rate, setRate] = useState('8')
  const [years, setYears] = useState('5')
  const [freq, setFreq] = useState<'1' | '4' | '12' | '365'>('12')
  const out = useMemo(() => {
    const p = num(principal), r = num(rate), y = num(years)
    if (p === null || r === null || y === null) return null
    const n = Number(freq)
    const amount = p * Math.pow(1 + r / 100 / n, n * y)
    return { amount, interest: amount - p }
  }, [principal, rate, years, freq])
  return (
    <CalcLayout>
      <Field label="Principal"><NumberInput value={principal} onChange={setPrincipal} /></Field>
      <Field label="Annual rate"><NumberInput value={rate} onChange={setRate} suffix="%" /></Field>
      <Field label="Years"><NumberInput value={years} onChange={setYears} /></Field>
      <Field label="Compounding frequency">
        <Segmented value={freq} onChange={(v) => setFreq(v as '1' | '4' | '12' | '365')} options={[
          { value: '1', label: 'Yearly' }, { value: '4', label: 'Quarterly' },
          { value: '12', label: 'Monthly' }, { value: '365', label: 'Daily' },
        ]} />
      </Field>
      {out && (
        <>
          <Result label="Maturity amount" value={money(out.amount)} big />
          <Result label="Interest earned" value={money(out.interest)} />
        </>
      )}
    </CalcLayout>
  )
}

/* ---- ROI ---- */
function RoiCalc() {
  const [invested, setInvested] = useState('10000')
  const [returned, setReturned] = useState('15000')
  const [years, setYears] = useState('2')
  const out = useMemo(() => {
    const inv = num(invested), ret = num(returned), y = num(years)
    if (inv === null || ret === null || inv === 0) return null
    const roi = ((ret - inv) / inv) * 100
    const annualized = y && y > 0 ? (Math.pow(ret / inv, 1 / y) - 1) * 100 : null
    return { roi, gain: ret - inv, annualized }
  }, [invested, returned, years])
  return (
    <CalcLayout>
      <Field label="Amount invested"><NumberInput value={invested} onChange={setInvested} /></Field>
      <Field label="Amount returned"><NumberInput value={returned} onChange={setReturned} /></Field>
      <Field label="Holding period" hint="years (optional)"><NumberInput value={years} onChange={setYears} /></Field>
      {out && (
        <>
          <Result label="ROI" value={`${formatNumber(out.roi)}%`} big sub={`Net gain ${money(out.gain)}`} />
          {out.annualized !== null && <Result label="Annualized" value={`${formatNumber(out.annualized)}%`} />}
        </>
      )}
    </CalcLayout>
  )
}

/* ---- Tax (simple progressive-free flat + slab helper) ---- */
function TaxCalc() {
  const [income, setIncome] = useState('800000')
  const [rate, setRate] = useState('20')
  const [deductions, setDeductions] = useState('50000')
  const out = useMemo(() => {
    const inc = num(income), r = num(rate), d = num(deductions) ?? 0
    if (inc === null || r === null) return null
    const taxable = Math.max(0, inc - d)
    const tax = (taxable * r) / 100
    return { taxable, tax, net: inc - tax }
  }, [income, rate, deductions])
  return (
    <CalcLayout>
      <Field label="Gross income"><NumberInput value={income} onChange={setIncome} /></Field>
      <Field label="Deductions / exemptions"><NumberInput value={deductions} onChange={setDeductions} /></Field>
      <Field label="Tax rate"><NumberInput value={rate} onChange={setRate} suffix="%" /></Field>
      {out && (
        <>
          <Result label="Tax payable" value={money(out.tax)} big />
          <ResultGrid>
            <Result label="Taxable income" value={money(out.taxable)} />
            <Result label="Net income" value={money(out.net)} />
          </ResultGrid>
        </>
      )}
    </CalcLayout>
  )
}

export const FINANCE_CALCS: CalcModule[] = [
  { id: 'fin-emi', name: 'EMI Calculator', category: 'finance', description: 'Monthly loan instalment & interest.', keywords: ['emi', 'loan', 'instalment', 'mortgage', 'repayment'], featured: true, popularity: 80, Component: EmiCalc },
  { id: 'fin-loan', name: 'Loan Calculator', category: 'finance', description: 'Plan repayments for any loan.', keywords: ['loan', 'borrow', 'emi', 'mortgage', 'finance'], popularity: 74, Component: EmiCalc },
  { id: 'fin-sip', name: 'SIP Calculator', category: 'finance', description: 'Project mutual-fund SIP growth.', keywords: ['sip', 'invest', 'mutual fund', 'savings', 'wealth'], popularity: 66, Component: SipCalc },
  { id: 'fin-compound', name: 'Compound Interest', category: 'finance', description: 'Grow savings with compounding.', keywords: ['compound', 'interest', 'savings', 'maturity', 'deposit', 'fd'], popularity: 64, Component: CompoundCalc },
  { id: 'fin-roi', name: 'ROI Calculator', category: 'finance', description: 'Return on investment & annualized rate.', keywords: ['roi', 'return', 'investment', 'profit', 'gain'], popularity: 58, Component: RoiCalc },
  { id: 'fin-tax', name: 'Tax Calculator', category: 'finance', description: 'Quick income-tax estimate.', keywords: ['tax', 'income', 'deduction', 'salary'], popularity: 56, Component: TaxCalc },
]
