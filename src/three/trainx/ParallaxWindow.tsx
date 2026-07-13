import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Color, type Points, type ShaderMaterial } from 'three'
import { getTrain, useTrainX, type TrainId } from '../../store/trainx'

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Layered, per-train parallax scenery. Each train gets a distinct silhouette
// world (cottages, castles, forests, snow, christmas, rotating biomes, gold)
// plus a moving sun/moon for in-scene time-of-day. Fully procedural — no assets.
const fragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uType;
  uniform float uBiome; // for mixed (6): 0 desert,1 ocean,2 islands,3 caves
  uniform vec3 uSky;
  uniform vec3 uMid;
  uniform vec3 uNear;

  float band(float x, float f, float a, float o) { return o + a * (0.5 + 0.5 * sin(x * f)); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float triTop(float dx, float by, float th, float hw) { return abs(dx) < hw ? by + th * (1.0 - abs(dx) / hw) : -1.0; }
  float boxTop(float dx, float by, float h, float hw) { return abs(dx) < hw ? by + h : -1.0; }
  float glow(vec2 uv, vec2 c, float r) { return smoothstep(r, 0.0, distance(uv, c)); }
  float eyes(vec2 uv, vec2 c, float r) {
    return glow(uv, c + vec2(-r, 0.0), r * 0.6) + glow(uv, c + vec2(r, 0.0), r * 0.6);
  }
  // soft flying-creature silhouette (owl / hippogriff) centred at c
  float creature(vec2 uv, vec2 c, float s, float ph) {
    vec2 p = (uv - c) / s;
    float flap = 0.5 + 0.5 * sin(ph);
    float body = smoothstep(0.10, 0.08, length(p));
    float wy = abs(p.x) * 1.4 - 0.12 * flap;
    float wings = smoothstep(0.03, 0.0, abs(abs(p.y) - abs(wy))) * step(abs(p.x), 0.32);
    return max(body, wings);
  }

  void main() {
    vec2 uv = vUv;
    float x = uv.x, y = uv.y, t = uTime;

    // ---------------- SKY (dynamic time of day) ----------------
    bool moon = (uType > 1.5 && uType < 2.5) || (uType > 3.5 && uType < 4.5);
    vec3 hi = uSky;
    vec3 lo = mix(uSky * 1.35, uMid * 1.15, 0.5);
    vec3 col = mix(lo, hi, smoothstep(0.0, 1.0, y));
    // moving sun / moon
    vec2 sun = vec2(0.3 + 0.5 * sin(t * 0.025), 0.5 + 0.28 * cos(t * 0.025));
    float sd = distance(uv, sun);
    vec3 sunCol = moon ? vec3(0.85, 0.9, 1.0) : vec3(1.0, 0.92, 0.72);
    col += sunCol * smoothstep(0.20, 0.0, sd) * (moon ? 0.7 : 0.6);

    // aurora for frost / vip
    if (uType > 3.5 && uType < 4.5) {
      float a = smoothstep(0.10, 0.0, abs(y - 0.74)) * (0.5 + 0.5 * sin(x * 9.0 + t));
      col += vec3(0.25, 0.85, 0.55) * a * 0.3;
    }

    // flying magical creatures (owls / hippogriffs) drifting across the sky
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float cx = fract(fi * 0.37 + t * 0.02 * (0.6 + 0.2 * fi)) * 2.0 - 1.0;
      float cy = 0.55 + 0.12 * sin(t * 0.3 + fi * 2.0) + fi * 0.05;
      float cr = creature(uv, vec2(cx, cy), 0.05, t * 3.0 + fi);
      col = mix(col, vec3(0.05, 0.05, 0.08), cr * 0.8);
      col += vec3(1.0, 0.85, 0.5) * eyes(uv, vec2(cx, cy), 0.015) * 0.6;
    }

    // ---------------- FAR LAYER ----------------
    float farY = band(x * 1.4 + t * 0.01, 2.2, 0.13, 0.52);
    if (uType > 3.5 && uType < 4.5) farY = 0.40 + 0.18 * abs(sin(x * 3.0 + t * 0.01)); // sharp peaks
    if (uType > 5.5) farY = 0.44 + 0.15 * abs(sin(x * 3.4 + t * 0.01));
    if (y < farY) col = mix(col, uMid * 0.7, smoothstep(farY, farY - 0.03, y));

    // ---------------- MID + NEAR (per train) ----------------
    float scroll = t * 0.05;
    float nearTop = band(x * 1.0 + scroll, 1.6, 0.05, 0.26);
    float midTop = 0.30;
    vec3 midCol = uMid;
    vec3 nearCol = uNear;
    float gl = 0.0;
    vec3 glCol = vec3(0.0);
    vec3 accCol = vec3(0.0);
    float accCov = 0.0;

    if (uType < 1.5) {
      // MEADOW — cottages + flowers
      for (int i = 0; i < 4; i++) {
        float fx = fract(float(i) * 0.27 + scroll * 0.4);
        float cx = fx * 2.0 - 1.0;
        float dx = x - cx;
        float base = band(cx * 1.5, 1.0, 0.05, 0.26);
        midTop = max(midTop, boxTop(dx, base, 0.10, 0.09));
        midTop = max(midTop, triTop(dx, base + 0.10, 0.10, 0.11));
        if (abs(dx) < 0.02) midTop = max(midTop, base + 0.20); // chimney
        // warm window glow (electric + candle)
        gl += glow(uv, vec2(cx - 0.03, base + 0.06), 0.014) * (0.6 + 0.4 * sin(t * 3.0 + float(i)));
        // moon-phase satellite dish on the roof (modern-in-magic)
        float dx2 = x - (cx + 0.06);
        float dy2 = abs(y - (base + 0.24));
        float dc = smoothstep(0.05, 0.0, abs(dx2)) * step(dy2, 0.05);
        float dph = 0.5 + 0.5 * sin(t * 0.2 + float(i));
        if (dc > accCov) { accCov = dc; accCol = vec3(0.8, 0.85, 1.0) * (0.6 + 0.4 * dph); }
        // modern street lamp beside the cottage
        float lx = cx + 0.14;
        gl += glow(uv, vec2(lx, base + 0.34), 0.02) * 0.6;
      }
      midCol = uMid * 0.85;
      for (int i = 0; i < 7; i++) {
        float fx = fract(float(i) * 0.137 + 0.3);
        float cx = fx * 1.9 - 0.95;
        float fy = 0.06 + 0.04 * hash(vec2(float(i), 1.0));
        gl += glow(uv, vec2(cx, fy), 0.012) * (0.6 + 0.4 * sin(t * 3.0 + float(i)));
      }
      glCol = vec3(1.0, 0.82, 0.5);
    } else if (uType < 2.5) {
      // ENCHANTED FOREST — tall trees + mushrooms + fairy houses
      for (int i = 0; i < 6; i++) {
        float fx = fract(float(i) * 0.17 + scroll * 0.5);
        float cx = fx * 2.0 - 1.0;
        float dx = x - cx;
        float base = band(cx * 1.2, 1.0, 0.04, 0.22);
        midTop = max(midTop, triTop(dx, base, 0.34, 0.10));
        midTop = max(midTop, triTop(dx, base + 0.22, 0.22, 0.07));
      }
      midCol = vec3(0.06, 0.18, 0.10);
      // Whomping Willow (big animated tree at centre)
      {
        float sway = sin(t * 1.2) * 0.06;
        midTop = max(midTop, triTop(x, 0.22, 0.5, 0.05 + sway));
        for (int b = 0; b < 3; b++) {
          float by = 0.5 + float(b) * 0.12;
          float off = sway * (1.0 + float(b) * 0.5);
          midTop = max(midTop, triTop(x - off, by, 0.18, 0.10));
          midTop = max(midTop, triTop(-(x + off), by, 0.18, 0.10));
        }
      }
      // glowing creature eyes near the ground (thestral / deer)
      for (int i = 0; i < 3; i++) {
        float ex = fract(float(i) * 0.41 + 0.2 + scroll * 0.3) * 1.8 - 0.9;
        gl += eyes(uv, vec2(ex, 0.12), 0.02) * (0.5 + 0.5 * sin(t * 2.0 + float(i)));
      }
      // Devil's Snare tendrils at the base
      for (int i = 0; i < 5; i++) {
        float tx = fract(float(i) * 0.21 + 0.6) * 1.8 - 0.9;
        float dx = x - tx;
        if (abs(dx) < 0.04) {
          float ty = 0.10 + 0.06 * sin(t * 1.5 + float(i) * 2.0) + 0.05 * sin(dx * 20.0 + t);
          gl += glow(uv, vec2(tx, ty), 0.02) * 0.4;
        }
      }
      // modern LED trail markers along the ground (fusion with the bioluminescent mushrooms)
      for (int i = 0; i < 8; i++) {
        float fx = fract(float(i) * 0.211 + 0.5);
        float cx = fx * 1.9 - 0.95;
        gl += glow(uv, vec2(cx + 0.02, 0.04), 0.01) * 0.8;
      }
      for (int i = 0; i < 8; i++) {
        float fx = fract(float(i) * 0.211 + 0.5);
        float cx = fx * 1.9 - 0.95;
        float fy = 0.10 + 0.05 * hash(vec2(float(i), 2.0));
        gl += glow(uv, vec2(cx, fy), 0.014) * (0.5 + 0.5 * sin(t * 2.0 + float(i) * 1.7));
      }
      glCol = vec3(0.4, 1.0, 0.5);
    } else if (uType < 3.5) {
      // ROYAL KINGDOM — castle + flags + knights
      float base = 0.24;
      midTop = max(midTop, boxTop(x, base, 0.34, 0.34));
      // battlements
      float b = step(0.5, fract(x * 9.0));
      midTop = max(midTop, (abs(x) < 0.34 && b > 0.5) ? base + 0.40 : -1.0);
      // towers
      midTop = max(midTop, boxTop(x + 0.28, base, 0.46, 0.07));
      midTop = max(midTop, boxTop(x - 0.28, base, 0.46, 0.07));
      // flag
      midTop = max(midTop, triTop(x, base + 0.46, 0.12, 0.02));
      // glass observation deck (modern, on the left tower)
      float gd = step(abs(x - (-0.28)), 0.05) * step(base + 0.30, y) * step(y, base + 0.44);
      if (gd > accCov) { accCov = gd; accCol = vec3(0.6, 0.85, 1.0); }
      // hanging banners
      for (int i = 0; i < 3; i++) {
        float bx = -0.2 + float(i) * 0.2;
        float bc = step(abs(x - bx), 0.02) * step(base + 0.30, y) * step(y, base + 0.40);
        if (bc > accCov) { accCov = bc; accCol = vec3(0.8, 0.2, 0.2); }
      }
      // moat (animated water at the base)
      float mc = step(y, 0.10);
      if (mc > accCov) { accCov = mc; accCol = vec3(0.2, 0.4, 0.7) * (0.8 + 0.2 * sin(x * 10.0 + t * 2.0)); }
      // bridge (arch) across the moat
      float arch = 0.10 + 0.04 * sin(x * 6.0);
      float br = step(abs(y - arch), 0.02) * step(abs(x), 0.3);
      if (br > accCov) { accCov = br; accCol = vec3(0.3, 0.2, 0.1); }
      midCol = vec3(0.32, 0.22, 0.45);
      for (int i = 0; i < 5; i++) {
        float fx = fract(float(i) * 0.31 + 0.2);
        float cx = fx * 1.6 - 0.8;
        gl += glow(uv, vec2(cx, base + 0.12), 0.010);
      }
      glCol = vec3(1.0, 0.8, 0.4);
    } else if (uType < 4.5) {
      // FROST — snow mountains + frozen lake + ice lines
      midTop = max(midTop, 0.30 + 0.16 * abs(sin(x * 3.0 + scroll)));
      midCol = vec3(0.55, 0.72, 0.9);
      nearTop = band(x * 1.0 + scroll, 1.4, 0.04, 0.22);
      nearCol = vec3(0.8, 0.9, 1.0);
      gl += glow(uv, vec2(0.0, 0.30), 0.04) * 0.3;
      glCol = vec3(0.7, 0.9, 1.0);
      // glowing snow crystals drifting (magical shimmer + real-physics handled by particles)
      for (int i = 0; i < 6; i++) {
        float fx = fract(float(i) * 0.27 + 0.4);
        float cx = fx * 1.9 - 0.95;
        gl += glow(uv, vec2(cx, 0.5 + 0.1 * sin(t + float(i))), 0.01) * 0.5;
      }
    } else if (uType < 5.5) {
      // CHRISTMAS — trees with lights + snowmen + gifts + santa houses
      for (int i = 0; i < 4; i++) {
        float fx = fract(float(i) * 0.25 + scroll * 0.4);
        float cx = fx * 2.0 - 1.0;
        float dx = x - cx;
        float base = 0.22;
        midTop = max(midTop, triTop(dx, base, 0.30, 0.12));
        midTop = max(midTop, triTop(dx, base + 0.18, 0.20, 0.09));
        midTop = max(midTop, triTop(dx, base + 0.32, 0.12, 0.06));
        for (int k = 0; k < 4; k++) {
          float ly = base + 0.08 + float(k) * 0.07;
          gl += glow(uv, vec2(cx + 0.05 * cos(float(k) * 2.0), ly), 0.012) * (0.6 + 0.4 * sin(t * 4.0 + float(k)));
        }
      }
      midCol = vec3(0.12, 0.32, 0.18);
      glCol = vec3(1.0, 0.85, 0.4);
    } else if (uType < 6.5) {
      // MIXED — rotating biomes every ~12s
      if (uBiome < 0.5) {
        midTop = max(midTop, band(x * 1.0 + scroll, 1.2, 0.10, 0.40)); // dunes
        midCol = vec3(0.85, 0.7, 0.4);
      } else if (uBiome < 1.5) {
        midTop = max(midTop, 0.30 + 0.04 * sin(x * 6.0 + t)); // ocean waves
        midCol = vec3(0.1, 0.4, 0.7);
        glCol = vec3(0.6, 0.9, 1.0); gl += glow(uv, vec2(0.3, 0.34), 0.05) * 0.2;
      } else if (uBiome < 2.5) {
        for (int i = 0; i < 3; i++) {
          float fx = fract(float(i) * 0.4 + scroll * 0.3);
          float cx = fx * 1.6 - 0.8;
          float dx = x - cx;
          float r = 0.16;
          if (abs(dx) < r) {
            float top = 0.4 + sqrt(r * r - dx * dx);
            midTop = max(midTop, top);
          }
        }
        midCol = vec3(0.4, 0.6, 0.9);
      } else {
        midTop = max(midTop, 0.34 + 0.10 * abs(sin(x * 4.0))); // cave crystals
        midCol = vec3(0.3, 0.2, 0.5);
        glCol = vec3(0.7, 0.5, 1.0); gl += glow(uv, vec2(0.2, 0.4), 0.05) * 0.4;
      }
    } else {
      // VIP — golden castle + diamonds
      float base = 0.24;
      midTop = max(midTop, boxTop(x, base, 0.36, 0.32));
      midTop = max(midTop, boxTop(x + 0.26, base, 0.5, 0.06));
      midTop = max(midTop, boxTop(x - 0.26, base, 0.5, 0.06));
      midTop = max(midTop, triTop(x, base + 0.5, 0.14, 0.02));
      // glass observation deck (modern)
      float gd = step(abs(x - 0.26), 0.05) * step(base + 0.34, y) * step(y, base + 0.48);
      if (gd > accCov) { accCov = gd; accCol = vec3(0.7, 0.9, 1.0); }
      midCol = vec3(0.55, 0.42, 0.12);
      for (int i = 0; i < 6; i++) {
        float fx = fract(float(i) * 0.19 + 0.4);
        float cx = fx * 1.8 - 0.9;
        float fy = base + 0.14 + 0.08 * hash(vec2(float(i), 3.0));
        gl += glow(uv, vec2(cx, fy), 0.013) * (0.6 + 0.4 * sin(t * 3.0 + float(i)));
      }
      glCol = vec3(1.0, 0.85, 0.4);
    }

    if (y < midTop) col = mix(col, midCol, smoothstep(midTop, midTop - 0.02, y));
    if (y < nearTop) col = mix(col, nearCol, smoothstep(nearTop, nearTop - 0.02, y));
    col += glCol * gl * 0.9;
    col = mix(col, accCol, accCov);

    gl_FragColor = vec4(col, 1.0);
  }
`

const TYPE_BY_ID: Record<TrainId, number> = {
  sprint: 1,
  forest: 2,
  kingdom: 3,
  frost: 4,
  crystal: 5,
  horizon: 6,
  royale: 7,
}

/** The VIP Royale epic journey: one continuous route through every scenario,
 *  progressing with the journey fraction. Each chapter swaps the scenery shader
 *  (uType + uBiome) and its weather (particle style). */
export const ROYALE_SEGMENTS = [
  { name: 'Village Meadows', type: 1, biome: 0, weather: 'calm' as const },
  { name: 'Enchanted Forest', type: 2, biome: 0, weather: 'fireflies' as const },
  { name: 'Royal Kingdom', type: 3, biome: 0, weather: 'calm' as const },
  { name: 'Frost Mountains', type: 4, biome: 0, weather: 'snow' as const },
  { name: 'Christmas Snow', type: 5, biome: 0, weather: 'snow' as const },
  { name: 'Crystal Caves', type: 6, biome: 3, weather: 'motes' as const },
  { name: 'Floating Islands', type: 6, biome: 2, weather: 'motes' as const },
]

/** Which chapter the VIP journey is in, given active elapsed ms + total. */
export function royaleChapter(elapsedActive: number, totalMs: number) {
  const frac = totalMs > 0 ? Math.min(1, elapsedActive / totalMs) : 0
  const idx = Math.min(ROYALE_SEGMENTS.length - 1, Math.floor(frac * ROYALE_SEGMENTS.length))
  return { index: idx, ...ROYALE_SEGMENTS[idx] }
}

/** Weather particles for the VIP journey — style follows the current chapter. */
function RoyaleParticles() {
  const geom = useRef<BufferGeometry>(null)
  const count = 150
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.4
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.6
      positions[i * 3 + 2] = 0.1 + Math.random() * 0.1
      speeds[i] = 0.4 + Math.random() * 0.8
    }
    return { positions, speeds }
  }, [])

  useFrame((state, dtRaw) => {
    const g = geom.current
    if (!g || !useTrainX.getState().visible) return
    const dt = Math.min(dtRaw, 0.05)
    const t = getTrain('royale')
    const total = (t?.durationHours ?? 9) * 3600 * 1000
    const weather = royaleChapter(useTrainX.getState().elapsedActive, total).weather
    const arr = (g.attributes.position.array as Float32Array)
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      if (weather === 'snow') {
        arr[ix + 1] -= speeds[i] * dt
        arr[ix] += Math.sin(state.clock.elapsedTime + i) * dt * 0.1
        if (arr[ix + 1] < -0.8) arr[ix + 1] = 0.8
      } else if (weather === 'fireflies') {
        arr[ix] += Math.sin(state.clock.elapsedTime * 0.5 + i) * dt * 0.15
        arr[ix + 1] += Math.cos(state.clock.elapsedTime * 0.4 + i * 1.3) * dt * 0.15
      } else {
        arr[ix + 1] += dt * 0.05 * speeds[i]
        if (arr[ix + 1] > 0.9) arr[ix + 1] = -0.9
      }
    }
    g.attributes.position.needsUpdate = true
  })

  const color = (() => {
    const w = royaleChapter(useTrainX.getState().elapsedActive, 9 * 3600 * 1000).weather
    if (w === 'snow') return '#ffffff'
    if (w === 'fireflies') return '#bfffce'
    return '#ffe6a0'
  })()

  return (
    <points position={[0, 0, 0.12]}>
      <bufferGeometry ref={geom}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

/** Soft particle layer in front of the window (fireflies / snow / etc.). */
function WindowParticles({ trainId }: { trainId: TrainId }) {
  const type = TYPE_BY_ID[trainId]
  const geom = useRef<BufferGeometry>(null)
  const pts = useRef<Points>(null)
  const count = type === 4 || type === 5 ? 140 : type === 2 ? 80 : type === 1 ? 50 : 40

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.4
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.6
      positions[i * 3 + 2] = 0.1 + Math.random() * 0.1
      speeds[i] = 0.4 + Math.random() * 0.8
    }
    return { positions, speeds }
  }, [count])

  useFrame((state, dtRaw) => {
    const g = geom.current
    if (!g) return
    if (!useTrainX.getState().visible) return // freeze scenery when the realm is off-screen
    const dt = Math.min(dtRaw, 0.05)
    const arr = (g.attributes.position.array as Float32Array)
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      if (type === 4 || type === 5) {
        // snow: fall down, drift
        arr[ix + 1] -= speeds[i] * dt
        arr[ix] += Math.sin(state.clock.elapsedTime + i) * dt * 0.1
        if (arr[ix + 1] < -0.8) arr[ix + 1] = 0.8
      } else if (type === 2) {
        // fireflies: gentle float
        arr[ix] += Math.sin(state.clock.elapsedTime * 0.5 + i) * dt * 0.15
        arr[ix + 1] += Math.cos(state.clock.elapsedTime * 0.4 + i * 1.3) * dt * 0.15
      } else if (type === 1) {
        // butterflies / dust: flutter
        arr[ix] += Math.sin(state.clock.elapsedTime * 0.8 + i) * dt * 0.2
        arr[ix + 1] += Math.sin(state.clock.elapsedTime * 1.2 + i * 2.0) * dt * 0.18
      } else {
        // slow magical motes
        arr[ix + 1] += dt * 0.05 * speeds[i]
        if (arr[ix + 1] > 0.9) arr[ix + 1] = -0.9
      }
    }
    g.attributes.position.needsUpdate = true
  })

  const color =
    type === 2 ? '#bfffce' :
    type === 4 || type === 5 ? '#ffffff' :
    type === 1 ? '#ffd9a0' :
    type === 7 ? '#ffe6a0' : '#cfe0ff'

  return (
    <points ref={pts} position={[0, 0, 0.12]}>
      <bufferGeometry ref={geom}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={type === 2 || type === 1 ? 0.07 : 0.05}
        color={color}
        transparent
        opacity={type === 4 || type === 5 ? 0.9 : 0.8}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

export function ParallaxWindow({ trainId, width = 3.4, height = 1.8 }: { trainId: TrainId; width?: number; height?: number }) {
  const mat = useRef<ShaderMaterial>(null)
  const t = getTrain(trainId)
  const uniforms = useMemo(() => {
    const p = t?.palette ?? ['#9fd8ff', '#4f9fe0', '#2f6fb0']
    return {
      uTime: { value: 0 },
      uType: { value: TYPE_BY_ID[trainId] },
      uBiome: { value: 0 },
      uSky: { value: new Color(p[0]) },
      uMid: { value: new Color(p[1]) },
      uNear: { value: new Color(p[2]) },
    }
  }, [trainId, t])

  // rotate mixed biome every ~12s of scene time; for VIP Royale, advance through
  // the story chapters (each swaps the scenery + weather as the journey progresses).
  const biome = useRef(0)
  useFrame((_, dtRaw) => {
    if (!useTrainX.getState().visible) return // freeze scenery when the realm is off-screen
    const dt = dtRaw
    if (mat.current) mat.current.uniforms.uTime.value += dt
    if (trainId === 'royale') {
      const rt = getTrain('royale')
      const total = (rt?.durationHours ?? 9) * 3600 * 1000
      const seg = royaleChapter(useTrainX.getState().elapsedActive, total)
      uniforms.uType.value = seg.type
      uniforms.uBiome.value = seg.biome
    } else if (TYPE_BY_ID[trainId] === 6) {
      biome.current += dt
      if (biome.current > 12) {
        biome.current = 0
        uniforms.uBiome.value = (uniforms.uBiome.value + 1) % 4
      }
    }
  })

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} toneMapped={false} />
      </mesh>
      {trainId === 'royale' ? <RoyaleParticles /> : <WindowParticles trainId={trainId} />}
    </group>
  )
}
