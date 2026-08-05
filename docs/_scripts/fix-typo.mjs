import { readFileSync, writeFileSync } from 'node:fs'
const APP = 'C:/Users/taksh/studyforest/src/App.tsx'
const src = readFileSync(APP, 'utf8')
if (src.includes('cconst PUBLIC_PATHS')) {
  writeFileSync(APP, src.replace('cconst PUBLIC_PATHS', 'const PUBLIC_PATHS'), 'utf8')
  console.log('fixed typo')
} else {
  console.log('no typo found')
}
