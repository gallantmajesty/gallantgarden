// A small, dependency-free, safe math expression evaluator. We never use eval();
// instead we tokenize → shunting-yard to RPN → evaluate. Supports the operators,
// functions and constants the Scientific / Master calculators need, plus an
// angle mode (deg/rad) for trig. Designed to be reused by any calculator module.

export type AngleMode = 'deg' | 'rad'

export interface EvalOptions {
  angle?: AngleMode
  /** Extra variables made available to the expression (e.g. ans, memory). */
  vars?: Record<string, number>
}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' }
  | { t: 'fn'; v: string }
  | { t: 'name'; v: string }

const CONSTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
}

const FUNCS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh',
  'ln', 'log', 'log2', 'sqrt', 'cbrt', 'abs', 'exp',
  'floor', 'ceil', 'round', 'sign', 'fact', 'root', 'pow', 'mod',
])

// operator → [precedence, rightAssoc]
const OPS: Record<string, [number, boolean]> = {
  '+': [2, false],
  '-': [2, false],
  '*': [3, false],
  '/': [3, false],
  '%': [3, false],
  '^': [4, true],
  'u-': [5, true], // unary minus
}

function tokenize(input: string): Tok[] {
  const s = input.replace(/\s+/g, '')
  const toks: Tok[] = []
  let i = 0
  const prev = () => toks[toks.length - 1]
  const isUnaryContext = () => {
    const p = prev()
    return !p || p.t === 'op' || p.t === 'lp' || p.t === 'comma'
  }
  while (i < s.length) {
    const c = s[i]
    if (/[0-9.]/.test(c)) {
      let j = i + 1
      while (j < s.length && /[0-9.eE]/.test(s[j])) {
        // allow scientific notation like 1.2e-3
        if ((s[j] === 'e' || s[j] === 'E') && (s[j + 1] === '+' || s[j + 1] === '-')) j++
        j++
      }
      const num = Number(s.slice(i, j))
      if (!isFinite(num)) throw new Error('Invalid number')
      toks.push({ t: 'num', v: num })
      i = j
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i + 1
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++
      const name = s.slice(i, j).toLowerCase()
      if (FUNCS.has(name)) toks.push({ t: 'fn', v: name })
      else toks.push({ t: 'name', v: name })
      i = j
      continue
    }
    if (c === '(') { toks.push({ t: 'lp' }); i++; continue }
    if (c === ')') { toks.push({ t: 'rp' }); i++; continue }
    if (c === ',') { toks.push({ t: 'comma' }); i++; continue }
    if (c === '!') { toks.push({ t: 'op', v: '!' }); i++; continue } // postfix factorial
    if ('+-*/%^'.includes(c)) {
      if (c === '-' && isUnaryContext()) toks.push({ t: 'op', v: 'u-' })
      else if (c === '+' && isUnaryContext()) { i++; continue } // unary plus is a no-op
      else toks.push({ t: 'op', v: c })
      i++
      continue
    }
    // Treat common alt symbols
    if (c === '×') { toks.push({ t: 'op', v: '*' }); i++; continue }
    if (c === '÷') { toks.push({ t: 'op', v: '/' }); i++; continue }
    if (c === '−') { toks.push({ t: 'op', v: isUnaryContext() ? 'u-' : '-' }); i++; continue }
    throw new Error(`Unexpected character: ${c}`)
  }
  return toks
}

function toRPN(toks: Tok[]): Tok[] {
  const out: Tok[] = []
  const stack: Tok[] = []
  for (const tk of toks) {
    if (tk.t === 'num' || tk.t === 'name') out.push(tk)
    else if (tk.t === 'fn') stack.push(tk)
    else if (tk.t === 'comma') {
      while (stack.length && stack[stack.length - 1].t !== 'lp') out.push(stack.pop()!)
    } else if (tk.t === 'op') {
      if (tk.v === '!') { out.push(tk); continue } // postfix: emit immediately
      const [p1, right] = OPS[tk.v]
      while (stack.length) {
        const top = stack[stack.length - 1]
        if (top.t === 'op') {
          const [p2] = OPS[top.v]
          if ((right && p1 < p2) || (!right && p1 <= p2)) out.push(stack.pop()!)
          else break
        } else break
      }
      stack.push(tk)
    } else if (tk.t === 'lp') stack.push(tk)
    else if (tk.t === 'rp') {
      while (stack.length && stack[stack.length - 1].t !== 'lp') out.push(stack.pop()!)
      if (!stack.length) throw new Error('Mismatched parentheses')
      stack.pop() // remove lp
      if (stack.length && stack[stack.length - 1].t === 'fn') out.push(stack.pop()!)
    }
  }
  while (stack.length) {
    const top = stack.pop()!
    if (top.t === 'lp') throw new Error('Mismatched parentheses')
    out.push(top)
  }
  return out
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    // gamma for non-integers via Lanczos
    return gamma(n + 1)
  }
  let r = 1
  for (let k = 2; k <= n; k++) r *= k
  return r
}

// Lanczos approximation for the gamma function (for non-integer factorials).
function gamma(z: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
}

function applyFn(name: string, args: number[], angle: AngleMode): number {
  const a = args[0]
  const toRad = (x: number) => (angle === 'deg' ? (x * Math.PI) / 180 : x)
  const fromRad = (x: number) => (angle === 'deg' ? (x * 180) / Math.PI : x)
  switch (name) {
    case 'sin': return Math.sin(toRad(a))
    case 'cos': return Math.cos(toRad(a))
    case 'tan': return Math.tan(toRad(a))
    case 'asin': return fromRad(Math.asin(a))
    case 'acos': return fromRad(Math.acos(a))
    case 'atan': return fromRad(Math.atan(a))
    case 'sinh': return Math.sinh(a)
    case 'cosh': return Math.cosh(a)
    case 'tanh': return Math.tanh(a)
    case 'ln': return Math.log(a)
    case 'log': return Math.log10(a)
    case 'log2': return Math.log2(a)
    case 'sqrt': return Math.sqrt(a)
    case 'cbrt': return Math.cbrt(a)
    case 'abs': return Math.abs(a)
    case 'exp': return Math.exp(a)
    case 'floor': return Math.floor(a)
    case 'ceil': return Math.ceil(a)
    case 'round': return Math.round(a)
    case 'sign': return Math.sign(a)
    case 'fact': return factorial(a)
    case 'root': return Math.pow(args[1], 1 / a) // root(n, x) = x^(1/n)
    case 'pow': return Math.pow(a, args[1])
    case 'mod': return a % args[1]
    default: throw new Error(`Unknown function: ${name}`)
  }
}

function evalRPN(rpn: Tok[], opts: EvalOptions): number {
  const angle = opts.angle ?? 'deg'
  const vars = { ...CONSTS, ...(opts.vars ?? {}) }
  const st: number[] = []
  for (const tk of rpn) {
    if (tk.t === 'num') st.push(tk.v)
    else if (tk.t === 'name') {
      if (!(tk.v in vars)) throw new Error(`Unknown name: ${tk.v}`)
      st.push(vars[tk.v])
    } else if (tk.t === 'fn') {
      // Multi-arg functions (root, pow, mod) take 2 operands; others take 1.
      const arity = tk.v === 'root' || tk.v === 'pow' || tk.v === 'mod' ? 2 : 1
      const args: number[] = []
      for (let k = 0; k < arity; k++) {
        if (!st.length) throw new Error('Missing argument')
        args.unshift(st.pop()!)
      }
      st.push(applyFn(tk.v, args, angle))
    } else if (tk.t === 'op') {
      if (tk.v === 'u-') { st.push(-st.pop()!); continue }
      if (tk.v === '!') { st.push(factorial(st.pop()!)); continue }
      const b = st.pop()!
      const a = st.pop()!
      switch (tk.v) {
        case '+': st.push(a + b); break
        case '-': st.push(a - b); break
        case '*': st.push(a * b); break
        case '/': st.push(a / b); break
        case '%': st.push(a % b); break
        case '^': st.push(Math.pow(a, b)); break
        default: throw new Error(`Unknown operator: ${tk.v}`)
      }
    }
  }
  if (st.length !== 1) throw new Error('Invalid expression')
  return st[0]
}

/** Evaluate a math expression string. Throws on malformed input. */
export function evaluate(expr: string, opts: EvalOptions = {}): number {
  const trimmed = expr.trim()
  if (!trimmed) throw new Error('Empty expression')
  // Percent convenience: "200+10%" → "200+(200*10/100)" is ambiguous; we keep
  // the simple meaning "% = /100" via the % operator above, so we leave as-is.
  const result = evalRPN(toRPN(tokenize(trimmed)), opts)
  if (!isFinite(result)) {
    if (Number.isNaN(result)) throw new Error('Not a number')
    // ±Infinity is a valid (overflow) result; let the caller format it.
  }
  return result
}

/** Format a number for display: trims float noise, uses scientific notation for
 *  very large/small magnitudes, and groups thousands for readability. */
export function formatNumber(n: number, maxDigits = 12): string {
  if (Number.isNaN(n)) return 'Error'
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e15 || (abs < 1e-9 && abs > 0)) {
    return n.toExponential(8).replace(/\.?0+e/, 'e')
  }
  // Round to kill binary float artefacts, then trim trailing zeros.
  const rounded = Number(n.toPrecision(maxDigits))
  const [intPart, frac] = String(rounded).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}
