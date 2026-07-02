// Optimized interior vertex shader.
// Transforms vertices and passes UV coordinates for the texture atlas + lightmap.

varying vec2 vUv;
varying vec2 vLightmapUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  // Lightmap UV: use second UV channel or derive from world position
  vLightmapUv = uv; // will be overridden by lightmap UV attribute if present

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
