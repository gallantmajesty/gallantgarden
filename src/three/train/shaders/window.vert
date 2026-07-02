// Parallax landscape vertex shader for carriage windows.
// Scrolls 3 layers of countryside at different speeds to fake depth.
// ~10 instructions per pixel — no lighting needed.

varying vec2 vUv;
varying float vLayer; // 0=far, 1=mid, 2=near

void main() {
  vUv = uv;
  vLayer = 0.0; // set per-instance via attribute or uniform
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
