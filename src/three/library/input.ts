// Shared movement input written by the on-screen touch controls (DOM elements in
// Explore.tsx) and read by the in-canvas PlayerController each frame.
// x = strafe (-1 left … 1 right), y = forward (-1 back … 1 forward), jump = held.
export const joystick = { x: 0, y: 0, jump: false }
