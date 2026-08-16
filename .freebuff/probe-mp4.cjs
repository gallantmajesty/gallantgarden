// Dependency-free MP4 box walker: prints duration, video track size and audio
// presence for a given file. Handles moov/trak/tkhd/mvhd/hdlr.
const fs = require('fs')

const file = process.argv[2]
if (!file) { console.error('usage: node probe-mp4.js <file>'); process.exit(1) }

const buf = fs.readFileSync(file)
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)

function fourcc(o) { return String.fromCharCode(buf[o], buf[o+1], buf[o+2], buf[o+3]) }

function walk(start, end, cb) {
  let o = start
  while (o + 8 <= end) {
    const size = dv.getUint32(o)
    const type = fourcc(o + 4)
    if (size < 8) break
    const boxEnd = (size === 1) ? Number(dv.getBigUint64(o + 8)) : o + size
    const header = (size === 1) ? 16 : 8
    cb(type, o, boxEnd, header)
    o = boxEnd
  }
}

let durationSec = null
let video = null
let audio = null
const tracks = []

walk(0, buf.length, (type, o, boxEnd, h) => {
  if (type === 'moov') {
    walk(o + h, boxEnd, (t2, o2, e2, h2) => {
      if (t2 === 'mvhd') {
        const ver = buf[o2 + h2]
        const off = o2 + h2 + 4
        if (ver === 0) {
          const ts = dv.getUint32(off + 12)
          const dur = dv.getUint32(off + 16)
          durationSec = dur / ts
        } else {
          const ts = dv.getUint32(off + 20)
          const dur = Number(dv.getBigUint64(off + 24))
          durationSec = dur / ts
        }
      }
      if (t2 === 'trak') {
        let w = null, h = null, handler = null
        walk(o2 + h2, e2, (t3, o3, e3, h3) => {
          if (t3 === 'tkhd') {
            const ver = buf[o3 + h3]
            // Box header (8) + version/flags (4) + creation(4) + mod(4) +
            // trackID(4) + reserved(4) + duration(4|8) + reserved(8) +
            // layer(2) + alt(2) + volume(2) + reserved(2) + matrix(36) = 76
            // before width (v0). v1 adds 4 for the 64-bit duration.
            const wo = o3 + h3 + 4 + (ver === 1 ? 76 : 72)
            w = dv.getUint32(wo) / 65536
            h = dv.getUint32(wo + 4) / 65536
          }
          if (t3 === 'mdia') {
            walk(o3 + h3, e3, (t4, o4, e4, h4) => {
              if (t4 === 'hdlr') {
                handler = fourcc(o4 + h4 + 8)
              }
            })
          }
        })
        tracks.push({ handler, w, h })
      }
    })
  }
})

for (const t of tracks) {
  if (t.handler === 'vide') video = t
  if (t.handler === 'soun') audio = t
}

const mins = Math.floor(durationSec / 60)
const secs = Math.round(durationSec % 60)
const ar = video && video.h && video.w ? (video.w / video.h) : null
console.log('file        :', file)
console.log('duration    :', `${mins}m ${secs}s (${durationSec.toFixed(1)}s)`)
console.log('video       :', video ? `${video.w}x${video.h}` : 'none')
console.log('aspect      :', ar ? ar.toFixed(3) : 'n/a')
console.log('audio track :', audio ? 'yes' : 'NO')
