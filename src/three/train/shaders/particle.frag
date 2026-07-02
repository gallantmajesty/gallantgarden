// Point sprite particle shader for dust motes.
// Renders as camera-facing quads with alpha fade based on lifetime.
// ~5 instructions per pixel — no lighting, no shadows.

precision highp float;

uniform float uSize;
uniform float uOpacity;
uniform sampler2D uTexture;

varying float vAlpha;

void main() {
  // Point sprite: gl_PointCoord gives [0,1] within the point
  vec4 texColor = texture2D(uTexture, gl_PointCoord);
  gl_FragColor = vec4(texColor.rgb, texColor.a * vAlpha * uOpacity);
}
