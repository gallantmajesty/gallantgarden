// Builds a 30s 9:16 (1080x1920) hype ad for Focus Lily from stock footage.
// Usage: node _scripts/ad-build.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const FF = 'C:/Users/taksh/studyforest-dl/ffmpeg-9.0-essentials_build/bin/ffmpeg.exe'
const FONT = 'docs/ad-shots/impact.ttf'
const FONT2 = 'docs/ad-shots/arialbd.ttf'
const CLIPS = 'ad-stock'
const OUT = 'docs/ad-shots/focuslily-ad.mp4'
const W = 1080, H = 1920, FPS = 30

// Segment definition: clip, 6s text lines (big + sub), zoom direction.
// zoom: 'in' | 'out' | 'panUp' | 'panDown'
const SEGS = [
  { clip: 'clip1.mp4', big: 'STOP SCROLLING',           sub: 'your study era starts now',     zoom: 'in' },
  { clip: 'clip5.mp4', big: '25 MIN. ONE GOAL.',        sub: 'deep focus, gamified',           zoom: 'panUp' },
  { clip: 'clip3.mp4', big: 'A WORLD BUILT FOR FOCUS',  sub: 'walk. study. vibe.',             zoom: 'in' },
  { clip: 'clip6.mp4', big: 'PLAN. TRACK. LEVEL UP.',   sub: 'your productivity HQ',           zoom: 'panDown' },
  { clip: 'clip2.mp4', big: 'YOUR STUDY SOUNDTRACK',    sub: 'lofi on tap',                    zoom: 'in' },
  { clip: 'clip4.mp4', big: 'FOCUS LILY',               sub: 'FREE TO PLAY · join the forest', zoom: 'out' },
]

const DUR = 5.5          // seconds per segment
const XFADE = 0.5        // crossfade seconds
const FRAMES = Math.round(DUR * FPS)

function esc(t) {
  return t.replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

// ---- per-segment: crop to 9:16 + Ken Burns + grade + grain + drawtext ------
const TRANSITIONS = ['fade', 'smoothleft', 'wipeleft', 'circleopen', 'dissolve', 'smoothup', 'smoothright']

// Punchy hype grade: contrast + saturation + slight warmth, cinematic vignette.
const GRADE = 'eq=contrast=1.12:saturation=1.28:brightness=0.015,unsharp=5:5:0.35,vignette=PI/4.8'
// Light film grain so the picture feels alive, not flat.
const GRAIN = 'noise=alls=5:allf=t+u'

function segFilter(i, s) {
  // Source is landscape (16:9). Center-crop to 9:16 first, then zoom within it.
  const src = `scale=${W * 3}:${H * 3}:force_original_aspect_ratio=increase,crop=${W * 3}:${H * 3}`
  let zp
  switch (s.zoom) {
    case 'in':
      zp = `zoompan=z='min(1.0+0.12*on/${FRAMES},1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${FRAMES}:s=${W}x${H}:fps=${FPS}`
      break
    case 'out':
      zp = `zoompan=z='max(1.12-0.12*on/${FRAMES},1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${FRAMES}:s=${W}x${H}:fps=${FPS}`
      break
    case 'panUp':
      zp = `zoompan=z='1.14':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/${FRAMES})':d=${FRAMES}:s=${W}x${H}:fps=${FPS}`
      break
    case 'panDown':
      zp = `zoompan=z='1.14':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(on/${FRAMES})':d=${FRAMES}:s=${W}x${H}:fps=${FPS}`
      break
  }
  const big = esc(s.big)
  const sub = esc(s.sub)
  // Text zone: dark gradient scrim at 58-78% height for legibility on any clip.
  const scrim =
    `drawbox=x=0:y=iw*0.42:w=iw:h=iw*0.52:color=black@0.42:t=fill`
  // Text pops in: alpha fade + slide-up settle (6px overshoot that decays).
  const yBig = `h*0.60+36*exp(-6*max(0,t-0.30))`
  const ySub = `h*0.60+118+28*exp(-6*max(0,t-0.65))`
  const drawBig =
    `drawtext=fontfile=${FONT}:text='${big}':fontsize=86:fontcolor=white:borderw=9:bordercolor=black:shadowx=0:shadowy=6:shadowcolor=black@0.6:x=(w-text_w)/2:y='${yBig}':alpha='min(1,max(0,(t-0.30)*3.0))'`
  const drawSub =
    `drawtext=fontfile=${FONT2}:text='${sub}':fontsize=38:fontcolor=0xFFE25C:borderw=5:bordercolor=black:shadowx=0:shadowy=4:shadowcolor=black@0.6:x=(w-text_w)/2:y='${ySub}':alpha='min(1,max(0,(t-0.65)*3.0))'`
  const tag =
    `drawtext=fontfile=${FONT2}:text='FOCUS LILY':fontsize=28:fontcolor=white:borderw=4:bordercolor=black@0.8:x=(w-text_w)/2:y=105:alpha='min(1,max(0,(t-0.15)*3.0))'`
  // White flash-in on every cut: 0.1s white pop right as the clip lands, then
  // the text fades in over it — the classic hype-ad beat.
  return `[${i}:v]${src},${zp},${GRADE},${GRAIN},fade=t=in:color=white:st=0:d=0.10,${scrim},${drawBig},${drawSub},${tag},format=yuv420p[v${i}]`
}

const inputs = SEGS.map((s) => `-i ${CLIPS}/${s.clip}`).join(' ')
const pre = SEGS.map((s, i) => segFilter(i, s)).join(';\n')

// ---- crossfade chain with varied hype transitions ---------------------------
const xfadeExpr = []
let off = DUR - XFADE
for (let i = 1; i < SEGS.length; i++) {
  const trans = TRANSITIONS[(i - 1) % TRANSITIONS.length]
  xfadeExpr.push(`[${i === 1 ? 'v0' : 'c' + (i - 1)}][v${i}]xfade=transition=${trans}:duration=${XFADE}:offset=${off.toFixed(2)}[c${i}]`)
  off += DUR - XFADE
}
const total = (SEGS.length * DUR - (SEGS.length - 1) * XFADE).toFixed(2)
const last = `c${SEGS.length - 1}`

const filter = `${pre};\n${xfadeExpr.join(';\n')}`

// ---- audio: sped-up bebop, trimmed, normalized, faded ----------------------
const AUDIO_SRC = '../public/audio/cozy/alex-morgan-bebop-coffee-shop-517090.mp3'
const aFilter =
  `[${SEGS.length}:a]atempo=1.15,atrim=0:${total},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.3,afade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6[a]`

const fullFilter = `${filter};\n${aFilter}`
const FILTER_FILE = 'docs/ad-shots/filter.txt'
fs.writeFileSync(FILTER_FILE, fullFilter, 'utf8')

const args = [
  '-y',
  ...SEGS.flatMap((s) => ['-i', `${CLIPS}/${s.clip}`]),
  '-i', AUDIO_SRC,
  '-filter_complex', fs.readFileSync(FILTER_FILE, 'utf8'),
  '-map', `[${last}]`, '-map', '[a]',
  '-r', String(FPS),
  '-pix_fmt', 'yuv420p',
  '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '20',
  '-c:a', 'aac', '-ar', '48000', '-b:a', '192k',
  '-movflags', '+faststart',
  '-t', total,
  OUT,
]

console.log('total duration:', total, 's')
console.log('filter written to', FILTER_FILE)

try {
  execFileSync(FF, args, { stdio: 'inherit', timeout: 600000 })
  const size = fs.statSync(OUT).size
  console.log('DONE', OUT, (size / 1024 / 1024).toFixed(1) + 'MB')
} catch (e) {
  console.log('FFMPEG FAILED')
  process.exit(1)
}
