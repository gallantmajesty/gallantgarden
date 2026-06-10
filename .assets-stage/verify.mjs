import { NodeIO } from '@gltf-transform/core'
const io = new NodeIO()
for (const f of process.argv.slice(2)) {
  try {
    const doc = await io.read(f)
    const root = doc.getRoot()
    const meshes = root.listMeshes().length
    const mats = root.listMaterials()
    const tex = root.listTextures().length
    // bounding box
    let min=[1e9,1e9,1e9], max=[-1e9,-1e9,-1e9]
    for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
      const pos = p.getAttribute('POSITION'); if(!pos) continue
      for (let i=0;i<pos.getCount();i++){const v=[0,0,0];pos.getElement(i,v);for(let k=0;k<3;k++){min[k]=Math.min(min[k],v[k]);max[k]=Math.max(max[k],v[k])}}
    }
    const size = max.map((v,i)=>(v-min[i]).toFixed(1))
    console.log(`${f.split('/').pop()}: meshes=${meshes} mats=${mats.length} tex=${tex} size=[${size}] mats=[${mats.map(m=>m.getName()).join(',')}]`)
  } catch(e){ console.log(f, 'ERR', e.message) }
}
