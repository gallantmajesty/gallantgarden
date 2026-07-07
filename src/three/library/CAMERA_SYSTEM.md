# Multiplayer Camera System Documentation

## Overview

The multiplayer camera system for the library realm has been completely redesigned to eliminate blinking/flickering issues and provide a smooth, stable camera experience. The new system implements both personal and universal camera modes with simple, predictable positioning.

## Features

### 1. Personal Camera Modes (1-4)
- **Mode 1**: Front-right view of your seat
- **Mode 2**: Front-left view of your seat  
- **Mode 3**: Overhead view of your seat
- **Mode 4**: Side view of your seat

Each personal camera mode follows your seated position with a fixed offset and angle. Users remain seated in chairs at all times.

### 2. Universal Camera Mode (5)
- **Automatic cinematic camera** that shows all users in the library
- **Smooth transitions** between predefined camera positions:
  - Library overview positions (wide shots of the entire hall)
  - Staircase positions (showing the grand staircases)
  - Person-to-person positions (following between different users)
  - Close-up positions (detailed views of specific areas)

### 3. Seat Changes
- Users can only change seats via the seat panel interface
- Teleportation between seats with immediate camera follow
- Camera smoothly transitions to new seat position

### 4. Technical Improvements
- **Removed complex physics calculations** that caused blinking
- **Simple, stable camera positioning** using linear interpolation
- **No first/third person modes** or free orbit controls
- **Users are always seated** in library chairs

## Controls

### Keyboard Controls
- **Keys 1-4**: Switch between personal camera modes
- **Key 5**: Activate universal camera mode
- **Mouse**: Use seat selection panel interface

### Seat Selection
- Click on available seats in the seat selection overlay
- Camera automatically follows when you change seats
- Only available seats can be selected (occupied seats are disabled)

## Implementation Details

### Camera System Architecture

```typescript
// Camera modes
interface CameraMode {
  type: 'personal' | 'universal'
  preset?: number // 1-4 for personal, undefined for universal
}

// Personal camera presets
const PERSONAL_CAMERA_PRESETS = [
  { offset: [2, 1, 2], angle: Math.PI / 4 },      // Front-right
  { offset: [-2, 1, 2], angle: -Math.PI / 4 },     // Front-left  
  { offset: [0, 2, 3], angle: 0 },                // Overhead
  { offset: [3, 1, 0], angle: Math.PI / 2 },     // Side view
]

// Universal camera paths
const UNIVERSAL_CAMERA_PATHS = [
  { pos: [0, 12, -25], target: [0, 0, 0], mode: 'library-overview' },
  { pos: [20, 10, -10], target: [0, 0, 0], mode: 'library-overview' },
  // ... more cinematic positions
]
```

### Key Components

1. **LibraryCamera.tsx**: Main camera component handling all camera modes
2. **PlayerController.tsx**: Updated to work with new camera system
3. **LibraryScene.tsx**: Updated to use new camera component
4. **CameraStatusIndicator.tsx**: Shows current camera mode to users
5. **SeatSelectionOverlay.tsx**: Enhanced with camera control information

### Multiplayer Synchronization

- All players see the same universal camera movement when mode 5 is active
- Personal camera modes are individual per user
- Player positions are synced via Supabase real-time presence
- Camera follows seat positions seamlessly

## Testing

### Automated Tests
Run the test suite to verify camera functionality:
```typescript
import { runCameraTests } from './cameraTests'
runCameraTests()
```

### Manual Testing Checklist
1. ✓ Press keys 1-4 to switch personal camera modes
2. ✓ Press key 5 to activate universal camera
3. ✓ Camera should follow seat position changes
4. ✓ Universal camera should move cinematically
5. ✓ No blinking or flickering should occur
6. ✓ Seat changes should teleport camera smoothly

### Performance Considerations
- Simple interpolation prevents performance issues
- No complex collision detection or raycasting
- Minimal camera calculations for smooth 60fps performance
- Efficient multiplayer state synchronization

## Troubleshooting

### Camera Blinking Issues
- **Problem**: Camera flickers or vibrates
- **Solution**: The new system eliminates complex physics calculations that caused blinking
- **Fix**: Restart the application if issues persist

### Camera Not Following Seat
- **Problem**: Camera doesn't move when changing seats
- **Solution**: Ensure seat selection is complete and player is seated
- **Fix**: Try selecting a different seat and wait for camera to follow

### Universal Camera Not Moving
- **Problem**: Universal camera stays in one position
- **Solution**: Press key 5 to activate universal mode
- **Fix**: Check that multiplayer is connected and other players are present

## File Structure

```
src/
├── three/library/
│   ├── LibraryCamera.tsx          # Main camera component
│   ├── PlayerController.tsx       # Updated player controller
│   ├── LibraryScene.tsx           # Updated scene setup
│   └── cameraTests.ts             # Test suite
├── components/library/
│   ├── CameraStatusIndicator.tsx  # Camera mode display
│   └── SeatSelectionOverlay.tsx   # Enhanced seat selection
└── store/
    ├── world.ts                   # World state management
    ├── seatFlow.ts                # Seat flow management
    └── multiplayer/net.ts         # Multiplayer networking
```

## Future Enhancements

1. **Additional Camera Presets**: More personal camera angles
2. **Custom Camera Paths**: User-defined universal camera routes
3. **Camera Effects**: Subtle cinematic effects (depth of field, etc.)
4. **Sound Integration**: Camera movement audio feedback

## Conclusion

The new multiplayer camera system provides a stable, flicker-free experience with both personal and universal camera modes. The simple implementation ensures smooth performance while maintaining the cinematic feel of the library environment.