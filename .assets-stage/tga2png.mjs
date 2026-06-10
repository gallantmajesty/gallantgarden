import { Jimp } from 'jimp'
import { readFileSync } from 'fs'
const files = process.argv.slice(2)
for (const f of files) {
  try {
    const b = readFileSync(f)
    const idlen=b[0], imgtype=b[2], w=b.readUInt16LE(12), h=b.readUInt16LE(14), bpp=b[16], desc=b[17]
    if (imgtype!==2 || (bpp!==32 && bpp!==24)) { console.log('SKIP unsupported', f, imgtype, bpp); continue }
    let off = 18 + idlen
    const img = new Jimp({ width:w, height:h })
    const topLeft = (desc & 0x20) !== 0
    const px = bpp/8
    for (let y=0; y<h; y++) {
      const ty = topLeft ? y : (h-1-y)
      for (let x=0; x<w; x++) {
        const i = off + (y*w + x)*px
        const bl=b[i], gr=b[i+1], re=b[i+2], al = bpp===32 ? b[i+3] : 255
        img.setPixelColor(((re<<24)|(gr<<16)|(bl<<8)|al)>>>0, x, ty)
      }
    }
    const out = f.replace(/\.(tga|TGA)$/,'.png')
    await img.write(out)
    console.log('ok', out, w+'x'+h, bpp+'bpp')
  } catch(e){ console.log('FAIL', f, e.message) }
}
