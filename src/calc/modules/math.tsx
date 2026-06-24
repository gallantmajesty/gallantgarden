import type { CalcModule } from '../registry/registry'
import { useKeypad } from '../engine/useKeypad'
import { Keypad } from '../ui/Keypad'

// Math calculators: Basic and Scientific. Both are keypad-driven and share the
// useKeypad engine + Keypad component; Scientific just turns on the function
// rows and DEG/RAD + memory controls.

function BasicCalc() {
  const k = useKeypad()
  return <Keypad k={k} />
}

function ScientificCalc() {
  const k = useKeypad()
  return <Keypad k={k} scientific />
}

export const MATH_CALCS: CalcModule[] = [
  {
    id: 'basic',
    name: 'Basic Calculator',
    category: 'math',
    description: 'Fast, clean everyday arithmetic.',
    keywords: ['basic', 'simple', 'arithmetic', 'add', 'subtract', 'multiply', 'divide', 'percent'],
    icon: 'focus-timer',
    featured: true,
    popularity: 100,
    Component: BasicCalc,
  },
  {
    id: 'scientific',
    name: 'Scientific Calculator',
    category: 'math',
    description: 'Trig, logs, powers, factorials & constants.',
    keywords: ['scientific', 'trig', 'sin', 'cos', 'tan', 'log', 'ln', 'power', 'factorial', 'pi'],
    icon: 'analytics',
    featured: true,
    popularity: 90,
    Component: ScientificCalc,
  },
]
