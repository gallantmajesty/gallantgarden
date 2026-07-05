# Samurai Avatar Integration Guide

This guide shows how to integrate the samurai avatar into your Focus Lily project using Three.js + React Fiber + Babylon.js.

## Files Created

### 1. `SamuraiAvatarCreator.jsx`
- Basic samurai avatar with Three.js + React Fiber
- Animation controls (idle, walk, run)
- Simple geometry and materials

### 2. `SamuraiAvatarApp.jsx`
- Advanced samurai with detailed features
- Dual framework support (Three.js + Babylon.js)
- Professional UI with animations
- Export functionality

### 3. `FocusLilySamuraiIntegration.jsx`
- **Main integration file** for Focus Lily
- Compatible with existing animation system
- 23-bone structure matching base.glb
- Real-time state synchronization

## Integration Steps

### 1. Add to Your Focus Lily Project

```jsx
// Replace or augment your CharacterAvatar component
import FocusLilySamuraiIntegration from './FocusLilySamuraiIntegration'

// In your main app or character selection screen
function App() {
  return (
    <div>
      <FocusLilySamuraiIntegration />
    </div>
  )
}
```

### 2. Update CharacterAvatar.tsx

```tsx
// Add samurai option to character selection
const CHARACTER_MODELS = {
  base: '/models/avatars/base.glb',
  samurai: '/models/avatars/samurai.glb', // Will be created later
  // ... other characters
}

function CharacterAvatar({ characterType = 'base' }) {
  return (
    <CharacterAvatar3D 
      model={CHARACTER_MODELS[characterType]} 
      characterType={characterType}
    />
  )
}
```

### 3. Animation System Compatibility

The samurai avatar uses the same animation states as your existing system:

```javascript
// Animation states match your locomotion system
- 'idle' → idlePose(t)
- 'walk' → locomotionPose(phase, 1)
- 'run' → locomotionPose(phase, 1.8)
- 'jump' → airPose(vy)
- 'land' → landPose(k)
```

### 4. Babylon.js Integration

For Babylon.js users, the component includes:

```jsx
<BabylonSamurai animation={characterState} />
```

## Key Features

### Visual Design
- **Blue armor** with metallic finish
- **Red accents** on shoulders and helmet
- **White belt** detail
- **Black face mask** with eye holes
- **Detailed katana** sword with guard and handle

### Technical Features
- **23-bone skeleton** compatible with base.glb
- **Procedural geometry** generation
- **Real-time animations** synchronized with Focus Lily
- **PBR materials** with proper lighting
- **Shadow mapping** for depth
- **Interactive camera** controls

### Animation States
- **Idle**: Breathing, subtle movement, gentle sword sway
- **Walk**: Stride motion, arm swing, dynamic sword movement
- **Run**: Fast movement, exaggerated animations
- **Jump**: Crouch → rise → peak → land cycle

## Export Options

### 1. GLB Export (Recommended)
```javascript
// Export for Focus Lily compatibility
const exportGLB = () => {
  // Creates samurai.glb in public/models/avatars/
  // Compatible with existing loading system
}
```

### 2. OBJ Export
```javascript
// For external 3D editing
const exportOBJ = () => {
  // Creates samurai.obj + materials
}
```

### 3. React Component Export
```javascript
// Save as reusable component
const exportComponent = () => {
  // Downloads Samurai.jsx file
}
```

## Usage Examples

### Basic Usage
```jsx
import FocusLilySamuraiIntegration from './FocusLilySamuraiIntegration'

function MyStudyApp() {
  return (
    <div className="study-environment">
      <FocusLilySamuraiIntegration />
      {/* Your other Focus Lily components */}
    </div>
  )
}
```

### Character Selection
```jsx
function CharacterSelection() {
  const [selectedCharacter, setSelectedCharacter] = useState('samurai')
  
  return (
    <div>
      <button onClick={() => setSelectedCharacter('samurai')}>
        Select Samurai
      </button>
      <FocusLilySamuraiIntegration characterType={selectedCharacter} />
    </div>
  )
}
```

### Custom Animation Control
```jsx
function CustomAnimationDemo() {
  const [animation, setAnimation] = useState('idle')
  
  return (
    <div>
      <button onClick={() => setAnimation('walk')}>Walk</button>
      <button onClick={() => setAnimation('run')}>Run</button>
      <FocusLilySamuraiIntegration animation={animation} />
    </div>
  )
}
```

## Performance Optimization

### 1. Level of Detail (LOD)
```jsx
// Add LOD for performance
<FocusLilySamuraiIntegration lod={distance} />
```

### 2. Instancing
```jsx
// For multiple samurai characters
<InstancedSamurai count={10} />
```

### 3. GPU Instancing
```jsx
// For better performance with many characters
<InstancedMesh instances={50} />
```

## Troubleshooting

### Common Issues

1. **Animation not working**
   - Check character state synchronization
   - Verify animation state names match

2. **Materials not displaying**
   - Ensure PBR materials are supported
   - Check lighting setup

3. **Performance issues**
   - Reduce geometry complexity
   - Use instancing for multiple characters

4. **Camera controls**
   - Verify OrbitControls are properly attached
   - Check camera constraints

### Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Good support
- **Mobile**: Limited support (experimental)

## Next Steps

1. **Create GLB file** using the Blender script
2. **Integrate with existing** character system
3. **Add sound effects** for sword movements
4. **Particle effects** for combat
5. **Custom animations** for special moves

## Support

For issues or questions:
- Check the Focus Lily documentation
- Review the React Three Fiber examples
- Consult Babylon.js documentation
- Open an issue in the GitHub repository