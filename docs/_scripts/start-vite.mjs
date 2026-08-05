// Spawns vite for the studyforest parent project and records the child's real
// OS PID (child_process.pid on Windows is the actual Windows process id).
import { spawn } from 'node:child_process'
import { writeFileSync, appendFileSync } from 'node:fs'

const PORT = process.argv[2] || '5201'
const ROOT = 'C:/Users/taksh/studyforest'
const LOG = `C:/Users/taksh/studyforest/docs/_scripts/vite-preview-${PORT}.log`
const PIDFILE = `C:/Users/taksh/studyforest/docs/_scripts/vite-pid-${PORT}.txt`

const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})

child.stdout.on('data', (d) => appendFileSync(LOG, d))
child.stderr.on('data', (d) => appendFileSync(LOG, d))
child.on('exit', (code) => appendFileSync(LOG, `\n[vite exited ${code}]\n`))
child.on('error', (e) => appendFileSync(LOG, `\n[spawn error ${e.message}]\n`))

writeFileSync(PIDFILE, String(child.pid))
appendFileSync(LOG, `\n[wrapper pid ${process.pid}, child pid ${child.pid}]\n`)

// keep the wrapper alive until killed
const keep = setInterval(() => {}, 1 << 30)
process.on('SIGTERM', () => { clearInterval(keep); child.kill() })
process.on('SIGINT', () => { clearInterval(keep); child.kill() })
