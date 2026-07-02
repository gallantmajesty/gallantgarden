// Real-time performance monitor + auto-adjustment system.
// Tracks FPS, frame time, draw calls, triangle count, texture memory, and
// active LOD level. When FPS drops below target, automatically reduces
// resolution, lowers LOD bias, and disables expensive features.
// Optionally renders an overlay HUD for debugging.

export interface PerfSnapshot {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  texturesMB: number
  lights: number
  lodLevel: number
  resolution: number
}

export interface PerfConfig {
  targetFPS: number
  minResolution: number
  maxResolution: number
  historySize: number
  adjustDownThreshold: number   // consecutive low frames before downgrade
  adjustUpThreshold: number     // consecutive good frames before upgrade
}

const DEFAULT_CONFIG: PerfConfig = {
  targetFPS: 65,
  minResolution: 0.5,
  maxResolution: 1.0,
  historySize: 60,
  adjustDownThreshold: 3,  // 3 seconds below target
  adjustUpThreshold: 10,   // 10 seconds above target
}

export class TrainPerfMonitor {
  config: PerfConfig

  private fpsHistory: number[] = []
  private frameTimeHistory: number[] = []
  private drawCallHistory: number[] = []
  private triangleHistory: number[] = []

  resolution = 1.0
  lodBias = 0
  dustParticlesEnabled = true

  private lowFrameCount = 0
  private highFrameCount = 0
  private lastAdjustment = 0

  // Renderer info callbacks (set by the React integration)
  private getDrawCalls: () => number = () => 0
  private getTriangles: () => number = () => 0
  private getTextureMemory: () => number = () => 0

  constructor(config?: Partial<PerfConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** Wire up renderer info getters. */
  setRendererInfo(
    getDrawCalls: () => number,
    getTriangles: () => number,
    getTextureMemory: () => number,
  ) {
    this.getDrawCalls = getDrawCalls
    this.getTriangles = getTriangles
    this.getTextureMemory = getTextureMemory
  }

  /** Call once per frame with delta time in seconds. */
  update(dt: number): PerfSnapshot {
    const fps = dt > 0 ? 1 / dt : 0
    const frameTime = dt * 1000

    this.fpsHistory.push(fps)
    this.frameTimeHistory.push(frameTime)
    this.drawCallHistory.push(this.getDrawCalls())
    this.triangleHistory.push(this.getTriangles())

    // Trim history
    if (this.fpsHistory.length > this.config.historySize) {
      this.fpsHistory.shift()
      this.frameTimeHistory.shift()
      this.drawCallHistory.shift()
      this.triangleHistory.shift()
    }

    // Auto-adjust
    this.autoAdjust(fps)

    return this.getSnapshot()
  }

  private autoAdjust(fps: number): void {
    const now = performance.now()

    if (fps < this.config.targetFPS - 5) {
      this.lowFrameCount++
      this.highFrameCount = 0
      if (this.lowFrameCount >= this.config.adjustDownThreshold && now - this.lastAdjustment > 3000) {
        this.adjustDown()
        this.lastAdjustment = now
        this.lowFrameCount = 0
      }
    } else if (fps > this.config.targetFPS + 10) {
      this.highFrameCount++
      this.lowFrameCount = 0
      if (this.highFrameCount >= this.config.adjustUpThreshold && now - this.lastAdjustment > 5000) {
        this.adjustUp()
        this.lastAdjustment = now
        this.highFrameCount = 0
      }
    } else {
      this.lowFrameCount = 0
      this.highFrameCount = 0
    }
  }

  private adjustDown(): void {
    // Priority order: resolution → LOD → particles
    if (this.resolution > this.config.minResolution + 0.05) {
      this.resolution = Math.max(this.config.minResolution, this.resolution - 0.05)
    } else if (this.lodBias < 1.5) {
      this.lodBias = Math.min(1.5, this.lodBias + 0.3)
    } else if (this.dustParticlesEnabled) {
      this.dustParticlesEnabled = false
    }
  }

  private adjustUp(): void {
    // Reverse order: particles → LOD → resolution
    if (!this.dustParticlesEnabled) {
      this.dustParticlesEnabled = true
    } else if (this.lodBias > 0) {
      this.lodBias = Math.max(0, this.lodBias - 0.15)
    } else if (this.resolution < this.config.maxResolution) {
      this.resolution = Math.min(this.config.maxResolution, this.resolution + 0.02)
    }
  }

  getSnapshot(): PerfSnapshot {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    return {
      fps: avg(this.fpsHistory),
      frameTime: avg(this.frameTimeHistory),
      drawCalls: this.drawCallHistory[this.drawCallHistory.length - 1] ?? 0,
      triangles: this.triangleHistory[this.triangleHistory.length - 1] ?? 0,
      texturesMB: this.getTextureMemory(),
      lights: 1, // after optimization: 1 directional only
      lodLevel: Math.round(this.lodBias),
      resolution: this.resolution,
    }
  }

  /** Get formatted stats string for HUD display. */
  getStatsString(): string {
    const s = this.getSnapshot()
    return [
      `FPS: ${s.fps.toFixed(0)}  |  Frame: ${s.frameTime.toFixed(1)}ms`,
      `Draw Calls: ${s.drawCalls}  |  Triangles: ${s.triangles.toLocaleString()}`,
      `Textures: ${s.texturesMB.toFixed(1)} MB  |  Lights: ${s.lights}`,
      `LOD Bias: ${s.lodLevel}  |  Resolution: ${(s.resolution * 100).toFixed(0)}%`,
    ].join('\n')
  }

  reset(): void {
    this.fpsHistory.length = 0
    this.frameTimeHistory.length = 0
    this.drawCallHistory.length = 0
    this.triangleHistory.length = 0
    this.resolution = 1.0
    this.lodBias = 0
    this.dustParticlesEnabled = true
    this.lowFrameCount = 0
    this.highFrameCount = 0
  }
}
