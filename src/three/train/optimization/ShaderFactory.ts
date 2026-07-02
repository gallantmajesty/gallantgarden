// ShaderMaterial factory for the optimized interior.
// Creates a single ShaderMaterial that samples the texture atlas + lightmap,
// replacing ~80 MeshStandardMaterial instances with 1 shader (~20 instructions
// per pixel vs ~80 for full PBR).

import {
  ShaderMaterial,
  Texture,
  Vector3,
  Color,
  FrontSide,
} from 'three'

import interiorVert from '../shaders/interior.vert?raw'
import interiorFrag from '../shaders/interior.frag?raw'

export function createInteriorShaderMaterial(
  atlas: Texture,
  lightmap: Texture,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: interiorVert,
    fragmentShader: interiorFrag,
    uniforms: {
      uAtlas: { value: atlas },
      uLightmap: { value: lightmap },
      uSunDirection: { value: new Vector3(0, 1, 0.3).normalize() },
      uSunColor: { value: new Color('#fff5e0') },
      uAmbientColor: { value: new Color('#b0a090') },
      uAmbientIntensity: { value: 0.4 },
    },
    transparent: false,
    side: FrontSide,
    depthWrite: true,
  })
}
