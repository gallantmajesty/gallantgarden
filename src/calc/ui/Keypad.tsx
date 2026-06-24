import type { CalcKeypad } from '../engine/useKeypad'
import './keypad.css'

// The visual calculator keypad. A single component drives the Basic pad, the
// Scientific pad (scientific=true adds the function rows) and the Master
// workspace's standard tab. The display shows the live expression with an
// instant preview of the result beneath it.

interface Key {
  label: string
  token?: string // what to press(); defaults to label
  action?: 'equals' | 'clear' | 'clearEntry' | 'back'
  span?: number
  variant?: 'op' | 'fn' | 'eq' | 'mem' | 'util'
}

const BASIC_ROWS: Key[][] = [
  [
    { label: 'AC', action: 'clear', variant: 'util' },
    { label: 'CE', action: 'clearEntry', variant: 'util' },
    { label: '⌫', action: 'back', variant: 'util' },
    { label: '÷', token: '/', variant: 'op' },
  ],
  [
    { label: '7' }, { label: '8' }, { label: '9' },
    { label: '×', token: '*', variant: 'op' },
  ],
  [
    { label: '4' }, { label: '5' }, { label: '6' },
    { label: '−', token: '-', variant: 'op' },
  ],
  [
    { label: '1' }, { label: '2' }, { label: '3' },
    { label: '+', token: '+', variant: 'op' },
  ],
  [
    { label: '%', token: '%', variant: 'op' },
    { label: '0' },
    { label: '.', token: '.' },
    { label: '=', action: 'equals', variant: 'eq' },
  ],
]

const SCI_ROWS: Key[][] = [
  [
    { label: 'sin', token: 'sin(', variant: 'fn' },
    { label: 'cos', token: 'cos(', variant: 'fn' },
    { label: 'tan', token: 'tan(', variant: 'fn' },
    { label: 'π', token: 'pi', variant: 'fn' },
    { label: 'e', token: 'e', variant: 'fn' },
  ],
  [
    { label: 'ln', token: 'ln(', variant: 'fn' },
    { label: 'log', token: 'log(', variant: 'fn' },
    { label: '√', token: 'sqrt(', variant: 'fn' },
    { label: 'x²', token: '^2', variant: 'fn' },
    { label: 'xʸ', token: '^', variant: 'fn' },
  ],
  [
    { label: '(', token: '(', variant: 'fn' },
    { label: ')', token: ')', variant: 'fn' },
    { label: 'n!', token: '!', variant: 'fn' },
    { label: '1/x', token: '^-1', variant: 'fn' },
    { label: '|x|', token: 'abs(', variant: 'fn' },
  ],
]

export function Keypad({ k, scientific = false }: { k: CalcKeypad; scientific?: boolean }) {
  function handle(key: Key) {
    if (key.action === 'equals') return k.equals()
    if (key.action === 'clear') return k.clear()
    if (key.action === 'clearEntry') return k.clearEntry()
    if (key.action === 'back') return k.backspace()
    k.press(key.token ?? key.label)
  }

  return (
    <div className="kp">
      <div className="kp-display">
        <div className="kp-expr">{k.expr || ' '}</div>
        <div className="kp-value">{k.result}</div>
      </div>

      {scientific && (
        <div className="kp-sci-controls">
          <div className="calc-seg" role="tablist">
            <button
              className={`calc-seg-btn ${k.angle === 'deg' ? 'on' : ''}`}
              onClick={() => k.setAngle('deg')}
            >
              DEG
            </button>
            <button
              className={`calc-seg-btn ${k.angle === 'rad' ? 'on' : ''}`}
              onClick={() => k.setAngle('rad')}
            >
              RAD
            </button>
          </div>
          <div className="kp-mem">
            <button onClick={k.memoryClear}>MC</button>
            <button onClick={k.memoryRecall}>MR</button>
            <button onClick={k.memoryAdd}>M+</button>
            <button onClick={k.memorySub}>M−</button>
          </div>
        </div>
      )}

      {scientific &&
        SCI_ROWS.map((row, ri) => (
          <div className="kp-row kp-row-5" key={`sci-${ri}`}>
            {row.map((key) => (
              <button key={key.label} className="kp-key fn" onClick={() => handle(key)}>
                {key.label}
              </button>
            ))}
          </div>
        ))}

      {BASIC_ROWS.map((row, ri) => (
        <div className="kp-row" key={`b-${ri}`}>
          {row.map((key) => (
            <button
              key={key.label}
              className={`kp-key ${key.variant ?? ''}`}
              onClick={() => handle(key)}
            >
              {key.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
