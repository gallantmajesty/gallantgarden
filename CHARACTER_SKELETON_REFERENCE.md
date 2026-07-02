# Character Model Reference

## Current Model: base.glb (Harry Potter Chibi)

| Property | Value |
|----------|-------|
| File | `public/models/avatars/base.glb` |
| Size | 4,547 KB |
| Format | glTF 2.0 Binary (GLB) |
| Source | `C:\Users\taksh\Downloads\Harry potter.glb` |
| Vertices | 35,026 |
| Triangles | 40,000 |

## Skeleton

| Property | Value |
|----------|-------|
| Bone count | 23 |
| Naming convention | Plain Blender export (`Hips`, `Spine`, `LeftUpperArm`, etc.) |
| Armature | Single root armature |
| Animations | None (procedural system drives all movement) |

### Bone Hierarchy

```
Hips (root)
├── Spine
│   └── Spine1
│       └── Spine2
│           ├── Neck
│           │   └── Head
│           ├── LeftShoulder
│           │   └── LeftUpperArm
│           │       └── LeftLowerArm
│           │           └── LeftHand
│           └── RightShoulder
│               └── RightUpperArm
│                   └── RightLowerArm
│                       └── RightHand
├── LeftUpperLeg
│   └── LeftLowerLeg
│       └── LeftFoot
│           └── LeftToes
└── RightUpperLeg
    └── RightLowerLeg
        └── RightFoot
            └── RightToes
```

### Bone Name Mapping (Blender → Procedural)

| Blender Name | Procedural Name |
|-------------|-----------------|
| Hips | `hips` |
| Spine | `spine` |
| Spine1 | `spine` |
| Spine2 | `chest` |
| Neck | `neck` |
| Head | `head` |
| LeftUpperArm | `armUpperL` |
| LeftLowerArm | `armLowerL` |
| RightUpperArm | `armUpperR` |
| RightLowerArm | `armLowerR` |
| LeftUpperLeg | `legUpperL` |
| LeftLowerLeg | `legLowerL` |
| LeftFoot | `footL` |
| RightUpperLeg | `legUpperR` |
| RightLowerLeg | `legLowerR` |
| RightFoot | `footR` |

## Materials

| Material | Texture | Notes |
|----------|---------|-------|
| Material_0 | 1 PNG texture atlas | All colors baked in (robe, skin, hair, glasses, etc.) |

- Single material, single texture — no runtime material swaps needed
- Roughness: 0.9 (matte finish)
- Colors are NOT customizable at runtime (baked into texture)

## Appearance

| Feature | Description |
|---------|-------------|
| Style | Chibi (big head, small body) |
| Outfit | Hogwarts-style robe (black with orange/gold trim) |
| Accessories | Round glasses, Hogwarts emblem on chest |
| Hair | Messy black hair |
| Skin | Light-medium tone (baked) |

## Animation System

Animations are **procedural** (driven by math functions in `animation.ts`), NOT baked into the GLB.

| State | Function | Description |
|-------|----------|-------------|
| Idle | `idlePose(t)` | Breathing, weight shift, head drift |
| Walk | `locomotionPose(phase, 1)` | Stride, arm swing, forward lean |
| Run | `locomotionPose(phase, 1.8)` | Faster stride, bigger arm swing |
| Jump | `airPose(vy)` | Rise: arms up, legs tuck; Fall: arms out, legs extend |
| Land | `landPose(k)` | Squash on impact, decays to idle |

### How It Works

1. `CharacterAvatar.tsx` loads `base.glb`
2. `SkeletonUtils.clone()` creates an independent copy per player
3. Bones are mapped from Blender names → procedural names via `BONE_TO_PROCEDURAL`
4. Every frame, `useFrame` reads locomotion data (speed, grounded, vy)
5. Target pose is computed from `animation.ts` functions
6. Bone rotations are eased toward targets each frame

## Creating New Characters

1. Create mesh in Blender (chibi proportions recommended)
2. Rig with 23-bone armature using **plain Blender naming** (`Hips`, `Spine`, `LeftUpperArm`, etc.)
3. Export as GLB — **no animations**
4. Place in `public/models/avatars/`
5. The procedural animation system handles all movement automatically

### Required Bones (minimum for animation)

```
Hips, Spine, Spine1, Spine2, Neck, Head,
LeftShoulder, LeftUpperArm, LeftLowerArm, LeftHand,
RightShoulder, RightUpperArm, RightLowerArm, RightHand,
LeftUpperLeg, LeftLowerLeg, LeftFoot, LeftToes,
RightUpperLeg, RightLowerLeg, RightFoot, RightToes
```

## Loading Pipeline

```
CharacterAvatar.tsx
  └── GLBCharacter
        ├── useGLTF('/models/avatars/base.glb')  ← loads model
        ├── SkeletonUtils.clone(scene)           ← independent copy
        ├── BONE_TO_PROCEDURAL mapping           ← bone name lookup
        └── useFrame → animation.ts              ← drives bones each frame
```

## Fallback

If `base.glb` fails to load (network error, corrupt file), `ModelBoundary` error boundary renders the **procedural AvatarRig** (`AvatarRig.tsx`) — a full humanoid built from Three.js primitives with the same animation system.
