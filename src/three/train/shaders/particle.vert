// Point sprite particle vertex shader for dust motes.
// Passes lifetime alpha to fragment shader.

attribute float aAlpha;
attribute float aSize;

varying float vAlpha;

void main() {
  vAlpha = aAlpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
