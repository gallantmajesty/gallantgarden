import { createExtractorFromData } from 'node-unrar-js'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const rars = process.argv.slice(2)
for (const rar of rars) {
  const name = rar.split('/').pop().replace(/\.rar$/i,'')
  const out = join('.assets-stage', name)
  const data = Uint8Array.from(readFileSync(rar)).buffer
  const extractor = await createExtractorFromData({ data })
  const list = extractor.getFileList()
  const headers = [...list.fileHeaders]
  console.log(`\n=== ${name} (${headers.length} entries) ===`)
  const extracted = extractor.extract()
  for (const file of extracted.files) {
    const h = file.fileHeader
    if (h.flags.directory) continue
    const dest = join(out, h.name)
    mkdirSync(dirname(dest), { recursive: true })
    if (file.extraction) writeFileSync(dest, Buffer.from(file.extraction))
    console.log(' ', h.name, h.unpSize)
  }
}
