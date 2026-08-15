// ShotHarness: optional `zoom` and `camY` query params so captures can frame
// the character the way the existing thumbnails do (full body, filling frame).
import { readFileSync, writeFileSync } from 'node:fs'

const p = 'src/screens/ShotHarness.tsx'
let s = readFileSync(p, 'utf8')
const eol = s.includes('\r\n') ? '\r\n' : '\n'
let text = s.replace(/\r\n/g, '\n')

const pairs = [
  ["function CameraRig({ view }: { view: View }) {\n  const camera = useThree((s) => s.camera)\n  useEffect(() => {\n    camera.position.set(...CAM[view])\n    camera.lookAt(0, 0.1, 0)\n  }, [camera, view])\n  return null\n}",
   "function CameraRig({ view }: { view: View }) {\n  const camera = useThree((s) => s.camera)\n  const [params] = useSearchParams()\n  const zoom = Math.max(0.4, Number(params.get('zoom') || '1'))\n  const camY = Number(params.get('camY') || '1')\n  useEffect(() => {\n    const [x, , z] = CAM[view]\n    camera.position.set(x, camY, z / zoom)\n    camera.lookAt(0, 0.1, 0)\n  }, [camera, view, zoom, camY])\n  return null\n}"],
]

for (const [from, to] of pairs) {
  if (!text.includes(from)) {
    console.error('MISS:', JSON.stringify(from.slice(0, 80)))
    process.exit(1)
  }
  text = text.split(from).join(to)
}

writeFileSync(p, text.split('\n').join(eol))
console.log('patched ShotHarness.tsx (zoom/camY)')
