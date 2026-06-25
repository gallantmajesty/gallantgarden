// TEMP perf profiler for Forest Hall. Run: node profile-forest.cjs [port]
// Loads /__perf (no auth, 1 player, environment only), scrapes the scene's
// [FocusLily perf] console reports, and also pulls renderer.info directly from
// the live three.js renderer for ground-truth draw/triangle/light stats.
// Delete with PerfHarness when the perf pass is done.
const { chromium } = require('playwright')
const PORT = process.argv[2] || '5175'
const URL = `http://localhost:${PORT}/__perf`

;(async () => {
  const browser = await chromium.launch({
    // SwiftShader gives deterministic, GPU-independent geometry/light/drawcall
    // numbers (the structural audit). FPS under it is CPU-bound and not the real
    // GPU figure — we read draws/tris/lights/shadow-casters, which are exact.
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const perfLines = []
  page.on('console', (m) => {
    const t = m.text()
    if (t.includes('[FocusLily perf]')) { perfLines.push(t); console.log('  ' + t.replace(/\n/g, '\n  ')) }
  })
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

  console.log('→ loading', URL)
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#perf-ready', { timeout: 30000 })

  // Let the scene warm up (Suspense, shader compile, governor warm-up is 5 s),
  // then run a measured window.
  await page.waitForTimeout(14000)

  // Ground-truth pull straight from the live renderer.info via the R3F root.
  const info = await page.evaluate(() => {
    // find the canvas' three renderer through the R3F internal store
    const cv = document.querySelector('canvas')
    // @ts-ignore
    const store = cv && (cv.__r3f?.root?.getState?.() || cv.__r3f?.store?.getState?.())
    if (!store) return { error: 'no r3f store' }
    const gl = store.gl, scene = store.scene
    let pt = 0, dir = 0, spot = 0, hemi = 0, amb = 0, casters = 0, meshes = 0, instanced = 0, transp = 0
    scene.traverse((o) => {
      const ty = o.type
      if (ty === 'PointLight') pt++
      else if (ty === 'DirectionalLight') dir++
      else if (ty === 'SpotLight') spot++
      else if (ty === 'HemisphereLight') hemi++
      else if (ty === 'AmbientLight') amb++
      if (o.castShadow && (o.isMesh || o.isInstancedMesh)) casters++
      if (o.isInstancedMesh) instanced++
      else if (o.isMesh) meshes++
      const mat = o.material
      if (mat && (Array.isArray(mat) ? mat.some((x) => x.transparent) : mat.transparent)) transp++
    })
    return {
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      programs: gl.info.programs?.length ?? 0,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      lights: { point: pt, dir, spot, hemi, ambient: amb },
      shadowCasters: casters,
      singleMeshes: meshes,
      instancedMeshes: instanced,
      transparentObjects: transp,
      shadowMapEnabled: gl.shadowMap.enabled,
      pixelRatio: gl.getPixelRatio(),
    }
  })

  console.log('\n===== RENDERER.INFO (ground truth) =====')
  console.log(JSON.stringify(info, null, 2))
  await page.screenshot({ path: 'perf-forest.png' })
  console.log('\nsaved perf-forest.png')
  await browser.close()
})().catch((e) => { console.error('PROFILE_ERROR', e); process.exit(1) })
