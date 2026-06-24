import { useCallback, useState } from 'react'
import { evaluate, formatNumber, type AngleMode } from '../engine/math'

// Shared calculator state for the keypad-driven calculators (Basic, Scientific,
// and the Master workspace's standard pad). Holds the live expression, the last
// result, a memory register and a short history. Pure logic — the UI just calls
// these actions and renders the returned state.

export interface HistoryEntry {
  expr: string
  result: string
}

export interface CalcKeypad {
  expr: string
  result: string
  memory: number
  history: HistoryEntry[]
  angle: AngleMode
  setAngle: (m: AngleMode) => void
  press: (token: string) => void
  clear: () => void
  clearEntry: () => void
  backspace: () => void
  equals: () => void
  memoryAdd: () => void
  memorySub: () => void
  memoryRecall: () => void
  memoryClear: () => void
  recall: (entry: HistoryEntry) => void
  clearHistory: () => void
}

const HIST_KEY = 'calc.keypad.history.v1'
function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HIST_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}
function saveHistory(h: HistoryEntry[]) {
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 50)))
  } catch {
    /* ignore */
  }
}

export function useKeypad(): CalcKeypad {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('0')
  const [memory, setMemory] = useState(0)
  const [angle, setAngle] = useState<AngleMode>('deg')
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  // After "=", the next digit starts a fresh expression; an operator continues
  // from the result. This mirrors how phone/desktop calculators behave.
  const [justEvaluated, setJustEvaluated] = useState(false)

  const press = useCallback(
    (token: string) => {
      setExpr((prev) => {
        let base = prev
        if (justEvaluated) {
          // operator → continue from result; digit/function → start fresh
          if (/^[+\-*/^%]$/.test(token)) base = result.replace(/,/g, '')
          else base = ''
          setJustEvaluated(false)
        }
        const next = base + token
        const preview = computePreview(next, angle, result, memory)
        if (preview !== null) setResult(preview)
        return next
      })
    },
    [justEvaluated, result, angle, memory],
  )

  const clear = useCallback(() => {
    setExpr('')
    setResult('0')
    setJustEvaluated(false)
  }, [])

  const clearEntry = useCallback(() => {
    setExpr('')
    setJustEvaluated(false)
  }, [])

  const backspace = useCallback(() => {
    setExpr((prev) => {
      const next = prev.slice(0, -1)
      const preview = computePreview(next, angle, result, memory)
      if (preview !== null) setResult(next === '' ? '0' : preview)
      return next
    })
  }, [angle, result, memory])

  const equals = useCallback(() => {
    setExpr((prev) => {
      if (!prev.trim()) return prev
      try {
        const r = evaluate(prev, { angle, vars: { ans: lastNumber(result), m: memory } })
        const formatted = formatNumber(r)
        setResult(formatted)
        setHistory((h) => {
          const next = [{ expr: prev, result: formatted }, ...h].slice(0, 50)
          saveHistory(next)
          return next
        })
        setJustEvaluated(true)
        return formatted
      } catch {
        setResult('Error')
        return prev
      }
    })
  }, [angle, result, memory])

  const memoryAdd = useCallback(() => setMemory((m) => m + (lastNumber(result) || 0)), [result])
  const memorySub = useCallback(() => setMemory((m) => m - (lastNumber(result) || 0)), [result])
  const memoryRecall = useCallback(() => press(String(memory)), [memory, press])
  const memoryClear = useCallback(() => setMemory(0), [])

  const recall = useCallback((entry: HistoryEntry) => {
    setExpr(entry.expr)
    setResult(entry.result)
    setJustEvaluated(true)
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    saveHistory([])
  }, [])

  return {
    expr,
    result,
    memory,
    history,
    angle,
    setAngle,
    press,
    clear,
    clearEntry,
    backspace,
    equals,
    memoryAdd,
    memorySub,
    memoryRecall,
    memoryClear,
    recall,
    clearHistory,
  }
}

function computePreview(
  e: string,
  angle: AngleMode,
  result: string,
  memory: number,
): string | null {
  if (!e.trim()) return '0'
  try {
    const r = evaluate(e, { angle, vars: { ans: lastNumber(result), m: memory } })
    return formatNumber(r)
  } catch {
    return null // keep last good preview while mid-typing
  }
}

function lastNumber(s: string): number {
  const n = Number(String(s).replace(/,/g, ''))
  return isFinite(n) ? n : 0
}
