import { createRequire } from 'node:module'
const require = createRequire('C:/Users/taksh/studyforest/package.json')
const Jimp = require('C:/Users/taksh/studyforest/node_modules/jimp')

const src = 'C:/Users/taksh/studyforest/docs/_scripts/ref_elephant.webp'
const dst = 'C:/Users/taksh/studyforest/docs/_scripts/ref_elephant.png'

try {
  const img = await Jimp.read(src)
  await img.writeAsync(dst)
  console.log('converted ok')
} catch (e) {
  console.error('jimp failed:', e.message)
  process.exit(1)
}
