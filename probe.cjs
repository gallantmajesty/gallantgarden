const { chromium } = require('playwright')
const URL = 'http://localhost:5173/__perf'
;(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] })
  const page = await browser.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:1 }).then(c=>c.newPage())
  page.on('pageerror', e => console.log('PAGEERR', e.message))
  await page.goto(URL, { waitUntil:'domcontentloaded' })
  await page.waitForSelector('#perf-ready', { timeout:30000 })
  await page.waitForTimeout(13000)
  const probe = await page.evaluate(() => {
    const s = window.__perfStore
    if (!s) return { error: 'no __perfStore' }
    const { gl, scene } = s
    let tris=0, instTris=0, instanced=0, meshes=0, casters=0, transp=0
    const lights={point:0,dir:0,spot:0,hemi:0,amb:0}
    const heavy=[]
    scene.traverse(o=>{
      const t=o.type
      if(t==='PointLight')lights.point++; else if(t==='DirectionalLight')lights.dir++; else if(t==='SpotLight')lights.spot++; else if(t==='HemisphereLight')lights.hemi++; else if(t==='AmbientLight')lights.amb++
      if(o.castShadow && (o.isMesh||o.isInstancedMesh)) casters++
      const g=o.geometry
      if(g){
        const idx=g.index?g.index.count:(g.attributes.position?g.attributes.position.count:0)
        const tcount=idx/3
        if(o.isInstancedMesh){ instanced++; const tt=tcount*o.count; instTris+=tt; heavy.push({n:o.name||'(inst)',type:'inst',count:o.count,tris:Math.round(tt)}) }
        else if(o.isMesh){ meshes++; tris+=tcount; if(tcount>2000) heavy.push({n:o.name||'(mesh)',type:'mesh',tris:Math.round(tcount)}) }
      }
      const mat=o.material, mats=Array.isArray(mat)?mat:(mat?[mat]:[])
      for(const m of mats){ if(m.transparent) transp++ }
    })
    heavy.sort((a,b)=>b.tris-a.tris)
    let dirShadow=null
    scene.traverse(o=>{ if(o.type==='DirectionalLight'){ dirShadow=[o.shadow.mapSize.x,o.shadow.mapSize.y]; } })
    return {
      drawCallsApprox: meshes+instanced, singleMeshes: meshes, instancedMeshes: instanced,
      trianglesSingle: Math.round(tris), trianglesInstanced: Math.round(instTris), trianglesTotal: Math.round(tris+instTris),
      lights, totalRealtimeLights: lights.point+lights.dir+lights.spot,
      shadowCasters: casters, transparentMaterials: transp,
      shadowMapEnabled: gl.shadowMap.enabled, shadowAutoUpdate: gl.shadowMap.autoUpdate, dirShadowMapSize: dirShadow,
      geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length??0,
      pixelRatio: gl.getPixelRatio(),
      heavyTop: heavy.slice(0,15),
    }
  })
  console.log(JSON.stringify(probe,null,2))
  await browser.close()
})().catch(e=>{console.error('ERR',e.message);process.exit(1)})
