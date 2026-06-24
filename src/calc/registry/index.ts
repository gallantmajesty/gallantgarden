// Central registration point. Importing this module registers every shipped
// calculator into the registry. To add a new calculator: create its module,
// export its CalcModule(s), and add it to the appropriate array (or import +
// register here). Nothing else in the app needs to change — the Hub, search,
// favorites and recents all read from the registry.

import { registerCalc } from './registry'
import './modules.css'

import { MASTER_CALC } from '../modules/master'
import { MATH_CALCS } from '../modules/math'
import { CONVERSION_CALCS } from '../modules/conversions'
import { FINANCE_CALCS } from '../modules/finance'
import { HEALTH_CALCS } from '../modules/health'
import { DAILY_CALCS } from '../modules/daily'
import { UTILITY_CALCS } from '../modules/utilities'
import { ENGINEERING_CALCS, SCIENCE_CALCS } from '../modules/sciences'

let registered = false

/** Register all built-in calculators exactly once (safe under HMR / re-import). */
export function ensureCalcsRegistered() {
  if (registered) return
  registered = true
  const all = [
    MASTER_CALC,
    ...MATH_CALCS,
    ...CONVERSION_CALCS,
    ...FINANCE_CALCS,
    ...HEALTH_CALCS,
    ...DAILY_CALCS,
    ...UTILITY_CALCS,
    ...ENGINEERING_CALCS,
    ...SCIENCE_CALCS,
  ]
  for (const mod of all) registerCalc(mod)
}

ensureCalcsRegistered()
