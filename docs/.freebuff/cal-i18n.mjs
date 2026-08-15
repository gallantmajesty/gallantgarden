import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/i18n/en.json'
let src = readFileSync(path, 'utf8')

const NL = src.includes('\r\n') ? '\r\n' : '\n'

const from = '"prev": "Previous",' + NL + '    "next": "Next"' + NL + '  },' + NL + '  "review": {'
const to =
  '"prev": "Previous",' +
  NL +
  '    "next": "Next",' +
  NL +
  '    "due": "due",' +
  NL +
  '    "done": "done",' +
  NL +
  '    "goals": "goals",' +
  NL +
  '    "moveTask": "Drag tasks to another day",' +
  NL +
  '    "undone": "Mark as not done"' +
  NL +
  '  },' +
  NL +
  '  "review": {'

if (!src.includes(from)) {
  console.error('NOT FOUND')
  process.exit(1)
}
src = src.replace(from, to)
writeFileSync(path, src, 'utf8')
console.log('Applied 1/1 edit')
