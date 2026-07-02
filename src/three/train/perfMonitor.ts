// Singleton perf monitor shared across the train realm.
// Separated from the overlay component to satisfy react-refresh/only-export-components.

import { TrainPerfMonitor } from './optimization/PerformanceMonitor'

export const sharedPerfMonitor = new TrainPerfMonitor({ targetFPS: 65 })
