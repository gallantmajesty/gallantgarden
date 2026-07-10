# 2D Paper Character System — Master Specification

## Overview

All characters in FocusLily use a **2D skeletal paper-cutout** style. Every character shares the **exact same skeleton, height, and bone structure**. Only the texture (the artwork) changes per character. This ensures consistent animation, proportions, and behavior across all characters — James, Lily, Wizard (Merlin), and any future characters.

---

## 1. Standard Dimensions

| Property | Value | Notes |
|----------|-------|-------|
| Total height | 100 units | Sole to top of head (no hat) |
| Body width | 40 units | Max width at shoulders |
| Body depth | 8 units | Flat plane thickness |
| Head width | 32 units | Beveled square |
| Head height | 30 units | 30% of total height |
| Torso height | 25 units | Shoulder to waist |
| Leg height | 30 units | Waist to sole |
| Arm length | 22 units | Shoulder to wrist |
| Hand radius | 4 units | Block sphere, no fingers |

All characters render on a **PlaneGeometry(40, 100)** with a transparent PNG texture. The texture contains the full character artwork at a resolution of **200x500 pixels** (4:1 width:height ratio, allowing for outstretched arms).

---

## 2. Skeleton / Bone Structure

### Bone Hierarchy

```
root (0, 0, 0)
├── hips (0, 30, 0)
│   ├── spine (0, 42, 0)
│   │   ├── chest (0, 55, 0)
│   │   │   ├── neck (0, 62, 0)
│   │   │   │   └── head (0, 79, 0)
│   │   │   ├── shoulderL (-14, 55, 0)
│   │   │   │   └── armUpperL (-14, 43, 0)
│   │   │   │       └── armLowerL (-14, 33, 0)
│   │   │   └── shoulderR (14, 55, 0)
│   │   │       └── armUpperR (14, 43, 0)
│   │   │           └── armLowerR (14, 33, 0)
│   ├── legUpperL (-6, 30, 0)
│   │   └── legLowerL (-6, 15, 0)
│   │       └── footL (-6, 5, 0)
│   └── legUpperR (6, 30, 0)
│       └── legLowerR (6, 15, 0)
│           └── footR (6, 5, 0)
```

### Bone Count: 17 bones total

| # | Bone Name | Parent | Position (Y) | Purpose |
|---|-----------|--------|---------------|---------|
| 1 | root | — | 0 | World anchor |
| 2 | hips | root | 30 | Pelvis, center of gravity |
| 3 | spine | hips | 42 | Lower torso bend |
| 4 | chest | spine | 55 | Upper torso, shoulder anchor |
| 5 | neck | chest | 62 | Head connection |
| 6 | head | neck | 79 | Head rotation |
| 7 | shoulderL | chest | 55 | Left arm pivot |
| 8 | armUpperL | shoulderL | 43 | Left upper arm |
| 9 | armLowerL | armUpperL | 33 | Left forearm |
| 10 | shoulderR | chest | 55 | Right arm pivot |
| 11 | armUpperR | shoulderR | 43 | Right upper arm |
| 12 | armLowerR | armUpperR | 33 | Right forearm |
| 13 | legUpperL | hips | 30 | Left thigh |
| 14 | legLowerL | legUpperL | 15 | Left shin |
| 15 | footL | legLowerL | 5 | Left foot |
| 16 | legUpperR | hips | 30 | Right thigh |
| 17 | legLowerR | legUpperR | 15 | Right shin |
| 18 | footR | legLowerR | 5 | Right foot |

**Total: 18 bones** (1 root + 17 articulated)

---

## 3. Texture Layout (UV Mapping)

The character texture is a single PNG with transparent background. The UV map divides the texture into **sprite regions** that map to bone-driven quads:

```
┌──────────────────────────────────────┐
│           HEAD REGION                │  Y: 0-30% of texture
│     (face, hair, hat if any)         │
├──────────┬───────────┬───────────────┤
│ LEFT ARM │   TORSO   │  RIGHT ARM    │  Y: 30-65%
│          │ (robe,    │               │
│          │  shirt,   │               │
│          │  belt)    │               │
├──────────┼───────────┼───────────────┤
│ LEFT LEG │  (skirt)  │  RIGHT LEG    │  Y: 65-95%
│          │           │               │
├──────────┴───────────┴───────────────┤
│           FEET / SHOES               │  Y: 95-100%
└──────────────────────────────────────┘
```

Each character provides **one PNG file** (200x500px recommended) containing their unique artwork in these regions. The bone rig automatically maps the correct texture region to each body part.

---

## 4. Animation System

### Shared Animations (same for ALL characters)

Since every character uses the same skeleton, animations are **universal**:

| Animation | Bones Used | Duration | Description |
|-----------|-----------|----------|-------------|
| idle | head, chest, armL, armR | 2s loop | Slight bob, arm sway |
| walk | hips, legs, arms, chest | 0.8s loop | Step cycle, arm swing |
| sit | hips, spine, legs | instant | Legs bend 90°, torso upright |
| wave | armUpperR, armLowerR | 1.5s once | Right hand wave |
| study | head, chest, arms | 3s loop | Leaning forward, reading |
| celebrate | arms, head, hips | 1s once | Arms up, jump |

### Animation Data Format

```json
{
  "name": "walk",
  "duration": 0.8,
  "fps": 12,
  "tracks": [
    {
      "bone": "legUpperL",
      "property": "rotation",
      "keyframes": [
        { "time": 0, "value": 0 },
        { "time": 0.2, "value": -0.4 },
        { "time": 0.5, "value": 0.3 },
        { "time": 0.8, "value": 0 }
      ]
    }
  ]
}
```

---

## 5. Character Roster

All characters use the **same 18-bone rig, same 100-unit height, same texture layout**. Only the artwork changes.

| Character | Texture File | Distinguishing Features |
|-----------|-------------|------------------------|
| James | james.png | Short brown hair, black jacket, sneakers |
| Lily | lily.png | Chestnut twin-tails, blazer, boots |
| Merlin (Wizard) | wizard.png | Navy pointed hat, starry robe, gold belt |
| Samurai | samurai.png | Armor, katana (cosmetic only) |
| [Future] | [name].png | Any 2D art in the same layout |

---

## 6. Integration with Library Camera

### Camera Behavior
- **First person**: Player sees through character's eyes. 2D character not visible.
- **Third person**: Camera behind character. 2D character faces forward (billboard toward camera).
- **Free orbit**: Character billboard-rotates to always face camera. Never shows thin edge.

### Billboard Implementation
```
character.lookAt(camera.position)  // Always face camera
character.rotation.y = 0           // Lock Y rotation (no tilt)
```

### Depth Handling
The 2D plane renders at `z = 0` in character-local space. For correct depth sorting in the library:
- Use `renderOrder` on the character mesh
- Set `depthTest: true, depthWrite: true` on materials
- Characters further from camera naturally sort behind furniture

---

## 7. Technical Implementation

### Three.js Setup

```typescript
// Skeleton (shared across ALL characters)
const bones: Bone[] = []
const bonePositions = [
  { name: 'root', parent: null, y: 0 },
  { name: 'hips', parent: 'root', y: 30 },
  // ... all 18 bones
]

// One geometry, one skeleton, many textures
const geometry = new PlaneGeometry(40, 100)
const skeleton = new Skeleton(bones)
const material = new SkinnedMeshStandardMaterial({
  map: characterTexture,  // Swap this per character
  side: DoubleSide,
  transparent: true,
  alphaTest: 0.1,
})

const mesh = new SkinnedMesh(geometry, material)
mesh.add(bones[0])  // Add root bone
mesh.bind(skeleton)
```

### Texture Swapping

```typescript
function setCharacter(characterId: string) {
  const texture = textureLoader.load(`/textures/characters/${characterId}.png`)
  mesh.material.map = texture
  mesh.material.needsUpdate = true
}
```

---

## 8. Asset Checklist

For each new character, the artist provides:

- [ ] **One PNG** (200x500px, transparent background)
- [ ] Character artwork laid out in the standard UV regions
- [ ] No 3D geometry needed — flat 2D art only
- [ ] Consistent proportions: head 30%, torso 25%, legs 30%, arms 15%

The code team handles:
- [ ] Bone rigging (same 18 bones for every character)
- [ ] Animation playback (same animations for every character)
- [ ] Billboard facing (same logic for every character)
- [ ] Camera integration (same behavior for every character)

---

## 9. Why This Works

- **One rig, many characters**: Change texture = new character. Zero code changes.
- **Consistent height**: All 100 units. No scaling differences. Same hitbox, same camera distance.
- **Same animations**: Walk, idle, study — every character moves identically. No per-character animation work.
- **Easy to extend**: New character = one PNG file. No 3D modeling, no Blender, no GLB baking.
- **Paper aesthetic IS the style**: Flat, charming, simple. Not a limitation — a design choice.
