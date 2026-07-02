// Optimized interior fragment shader.
// Single texture atlas sample + lightmap = ~20 instructions per pixel.
// Replaces full PBR pipeline (~80 instructions) with simplified lighting.

precision highp float;

uniform sampler2D uAtlas;       // 1024x1024 material atlas
uniform sampler2D uLightmap;    // 1024x1024 baked lightmap
uniform vec3 uSunDirection;     // directional light direction
uniform vec3 uSunColor;         // directional light color
uniform vec3 uAmbientColor;     // ambient/hemisphere color
uniform float uAmbientIntensity;

varying vec2 vUv;
varying vec2 vLightmapUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  // Sample the material atlas (all surfaces in one texture)
  vec4 atlasColor = texture2D(uAtlas, vUv);
  vec3 albedo = atlasColor.rgb;

  // Simple directional lighting (1 light only)
  float NdotL = max(dot(vNormal, normalize(uSunDirection)), 0.0);
  vec3 diffuse = uSunColor * NdotL;

  // Ambient hemisphere
  vec3 ambient = uAmbientColor * uAmbientIntensity;

  // Sample baked lightmap (pre-computed shadows + AO)
  vec4 lightmap = texture2D(uLightmap, vLightmapUv);

  // Combine: albedo * (direct + ambient + lightmap)
  vec3 lighting = diffuse + ambient + lightmap.rgb;
  vec3 finalColor = albedo * lighting;

  // Simple tone mapping (ACES approx)
  finalColor = finalColor / (finalColor + vec3(1.0));

  gl_FragColor = vec4(finalColor, atlasColor.a);
}
