import { Jimp } from 'jimp'
const files = process.argv.slice(2)
for (const f of files) {
  try {
    const img = await Jimp.read(f)
    const out = f.replace(/\.(bmp|tga|BMP|TGA)$/,'.png')
    await img.write(out)
    console.log('ok', out, img.bitmap.width+'x'+img.bitmap.height)
  } catch(e) { console.log('FAIL', f, e.message) }
}
