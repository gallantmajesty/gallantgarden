// Re-splice only the ElephantHead block from newElephantHead.txt.
import { readFileSync, writeFileSync } from 'node:fs'

const RIG = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const NEW_HEAD = 'C:/Users/taksh/studyforest/docs/_scripts/newElephantHead.txt'

const src = readFileSync(RIG, 'utf8')
const isCrlf = src.includes('\r\n')
const norm = src.replace(/\r\n/g, '\n')

const startMarker = '/* ================================================ ELEPHANT HEAD'
const endMarker = '/* ================================================ MONKEY HEAD'
const s = norm.indexOf(startMarker)
const e = norm.indexOf(endMarker)
if (s === -1 || e === -1 || e <= s) { console.error('head markers missing'); process.exit(1) }

const newHead = readFileSync(NEW_HEAD, 'utf8').replace(/\r\n/g, '\n').trimEnd()
const rawIdx = (i) => i + (isCrlf ? (norm.slice(0, i).match(/\n/g) || []).length : 0)
const toRaw = (str) => (isCrlf ? str.replace(/\n/g, '\r\n') : str)

const out = src.slice(0, rawIdx(s)) + toRaw(newHead + '\n\n') + src.slice(rawIdx(e))
writeFileSync(RIG, out, 'utf8')
console.log('head re-spliced')
