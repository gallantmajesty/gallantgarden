// Detached vite launcher for the studyforest parent project.
// Usage: node start-preview.mjs <port> <logFile> [pidFile]
// Spawns vite (cwd = parent project) with --strictPort, records the child's real
// Windows PID (child_process.pid on Windows is the actual OS pid), and stays
// alive until killed.
import { spawn } from 'node:child_process'
import { writeFileSync, appendFileSync } from 'node:fs'

const PORT = process.argv[2] || '5201'
const LOG = process.argv[3] || `C:/Users/taksh/studyforest/docs/_scripts/vite-preview-${PORT}.log`
const PIDFILE = process.argv[4] || `C:/Users/taksh/studyforest/docs/_scripts/vite-pid-${PORT}.txt`
const ROOT = 'C:/Users/taksh/studyforest'

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
