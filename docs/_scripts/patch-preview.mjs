// Patch script: register /__shot in PUBLIC_PATHS so it renders without auth.
import { readFileSync, writeFileSync } from 'node:fs'

const APP = 'C:/Users/taksh/studyforest/src/App.tsx'

const src = readFileSync(APP, 'utf8')
const isCrlf = src.includes('\r\n')
const norm = src.replace(/\r\n/g, '\n')

const oldStr = `const PUBLIC_PATHS = new Set(['/', '/about', '/guest', '/login', '/login/github', '/login/perinfo'])`
const newStr = `const PUBLIC_PATHS = new Set(['/', '/about', '/guest', '/login', '/login/github', '/login/perinfo', '/__shot'])`

if (norm.includes(newStr)) {
  console.log('already applied')
} else {
  const idx = norm.indexOf(oldStr)
  if (idx === -1) {
    console.error('PATTERN NOT FOUND')
    process.exit(1)
  }
  const crBefore = isCrlf ? (norm.slice(0, idx).match(/\n/g) || []).length : 0
  const rawIdx = idx + crBefore
  const rawNew = isCrlf ? newStr.replace(/\n/g, '\r\n') : newStr
  const rawLen = isCrlf ? oldStr.replace(/\n/g, '\r\n').length : oldStr.length
  writeFileSync(APP, src.slice(0, rawIdx) + rawNew + src.slice(rawIdx + rawLen), 'utf8')
  console.log('patched PUBLIC_PATHS')
}
