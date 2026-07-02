// Generic object pool to eliminate garbage-collection spikes during gameplay.
// Pre-allocates a batch of reusable objects (particles, sounds, UI elements) and
// recycles them instead of create/destroy cycles. Each pool tracks active count
// and enforces a hard ceiling to prevent unbounded allocation.

export interface PoolOptions<T> {
  create: () => T
  reset: (obj: T) => void
  initialSize?: number
  maxSize?: number
}

export class ObjectPool<T> {
  private pool: T[] = []
  private active: T[] = []
  private create: () => T
  private resetFn: (obj: T) => void
  private maxSize: number

  constructor(opts: PoolOptions<T>) {
    this.create = opts.create
    this.resetFn = opts.reset
    this.maxSize = opts.maxSize ?? 200
    // pre-allocate
    const n = opts.initialSize ?? 0
    for (let i = 0; i < n && i < this.maxSize; i++) {
      this.pool.push(this.create())
    }
  }

  /** Acquire an object from the pool (or create a new one if empty). */
  acquire(): T | null {
    let obj: T | undefined
    if (this.pool.length > 0) {
      obj = this.pool.pop()!
    } else if (this.active.length < this.maxSize) {
      obj = this.create()
    }
    if (obj == null) return null
    this.active.push(obj)
    return obj
  }

  /** Release an object back into the pool for reuse. */
  release(obj: T): void {
    const idx = this.active.indexOf(obj)
    if (idx === -1) return
    this.active.splice(idx, 1)
    this.resetFn(obj)
    this.pool.push(obj)
  }

  /** Release all active objects back into the pool. */
  releaseAll(): void {
    while (this.active.length > 0) {
      const obj = this.active.pop()!
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }

  /** Total objects managed (active + idle). */
  get total(): number {
    return this.active.length + this.pool.length
  }

  /** Currently checked-out objects. */
  get activeCount(): number {
    return this.active.length
  }

  /** Drain pool and active list. */
  dispose(): void {
    this.pool.length = 0
    this.active.length = 0
  }
}

// ── Pre-built pools for train realm ──────────────────────────────────────────

/** Dust mote pool: 100 particles, reused every frame. */
export function createDustPool(create: () => { visible: boolean }) {
  return new ObjectPool({
    create,
    reset: (p) => { p.visible = false },
    initialSize: 100,
    maxSize: 200,
  })
}

/** Sound pool: pre-loaded Audio elements, avoids decoding on the fly. */
export function createSoundPool(create: () => HTMLAudioElement) {
  return new ObjectPool({
    create,
    reset: (a: HTMLAudioElement) => { a.pause(); a.currentTime = 0 },
    initialSize: 6,
    maxSize: 15,
  })
}

/** UI element pool (damage numbers, chat bubbles). */
export function createUIPool(create: () => HTMLElement) {
  return new ObjectPool({
    create,
    reset: (el: HTMLElement) => { el.style.display = 'none' },
    initialSize: 4,
    maxSize: 12,
  })
}
