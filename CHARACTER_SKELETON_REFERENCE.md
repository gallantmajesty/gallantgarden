# Standard Character Skeleton Reference

## Skeleton Type
**Mixamo-Compatible Humanoid Rig** (62 bones)

## Architecture

**Key Insight:** Animations are **procedural** (driven by math functions in `animation.ts`), NOT baked into the GLB files. This means:
- All 50+ characters share the same animation system
- Animations are smooth and consistent across all characters
- No need to bake animations into each GLB

## Bone Hierarchy (Mixamo Naming)

```
mixamorig:Hips (root)
├── mixamorig:Spine
│   ├── mixamorig:Spine1
│   │   ├── mixamorig:Spine2
│   │   │   ├── mixamorig:Neck
│   │   │   │   └── mixamorig:Head
│   │   │   │       └── mixamorig:HeadTop_End
│   │   │   ├── mixamorig:LeftShoulder
│   │   │   │   └── mixamorig:LeftArm
│   │   │   │       └── mixamorig:LeftForeArm
│   │   │   │           └── mixamorig:LeftHand
│   │   │   │               ├── mixamorig:LeftHandThumb1-3
│   │   │   │               ├── mixamorig:LeftHandIndex1-3
│   │   │   │               ├── mixamorig:LeftHandMiddle1-3
│   │   │   │               ├── mixamorig:LeftHandRing1-3
│   │   │   │               └── mixamorig:LeftHandPinky1-3
│   │   │   └── mixamorig:RightShoulder
│   │   │       └── mixamorig:RightArm
│   │   │           └── mixamorig:RightForeArm
│   │   │               └── mixamorig:RightHand
│   │   │                   ├── mixamorig:RightHandThumb1-3
│   │   │                   ├── mixamorig:RightHandIndex1-3
│   │   │                   ├── mixamorig:RightHandMiddle1-3
│   │   │                   ├── mixamorig:RightHandRing1-3
│   │   │                   └── mixamorig:RightHandPinky1-3
│   └── (extra spine bones)
├── mixamorig:LeftLeg
│   └── mixamorig:LeftFoot
│       └── mixamorig:LeftToeBase
└── mixamorig:RightLeg
    └── mixamorig:RightFoot
        └── mixamorig:RightToeBase
```

## Bone Name Mapping

The frontend maps Mixamo bones to procedural animation names:

| Mixamo Bone | Procedural Name |
|-------------|-----------------|
| mixamorig:Hips | hips |
| mixamorig:Spine | spine |
| mixamorig:Spine1 | spine |
| mixamorig:Spine2 | chest |
| mixamorig:Neck | neck |
| mixamorig:Head | head |
| mixamorig:LeftShoulder | armUpperL |
| mixamorig:LeftArm | armUpperL |
| mixamorig:LeftForeArm | armLowerL |
| mixamorig:RightShoulder | armUpperR |
| mixamorig:RightArm | armUpperR |
| mixamorig:RightForeArm | armLowerR |
| mixamorig:LeftLeg | legUpperL |
| mixamorig:LeftFoot | footL |
| mixamorig:RightLeg | legUpperR |
| mixamorig:RightFoot | footR |

## Export Requirements

Each character GLB must include:
1. **Armature** with all 62 bones named as above (Mixamo naming)
2. **Mesh(es)** with Armature modifier pointing to the armature
3. **Vertex groups** binding mesh vertices to bones
4. **NO animations** - animations are procedural

## File Naming
- Characters: `public/models/avatars/{character_id}.glb`
- Standard skeleton reference: `public/models/avatars/base.glb`

## Frontend Loading

The `CharacterAvatar.tsx` component:
1. Loads the GLB file
2. Clones the scene (SkeletonUtils.clone for separate skeletons)
3. Maps Mixamo bones to procedural names
4. Drives bones procedurally via `animation.ts` functions:
   - `idlePose(t)` - breathing, weight shift, head drift
   - `locomotionPose(phase, g)` - walk/run gait
   - `airPose(vy)` - jump rise/fall
   - `landPose(k)` - landing squash

## Animation States

| State | Function | Description |
|-------|----------|-------------|
| Idle | `idlePose(t)` | Subtle breathing, weight shift, head drift |
| Walk | `locomotionPose(phase, 1)` | Stride, arm swing, forward lean |
| Run | `locomotionPose(phase, 1.8)` | Faster stride, bigger arm swing |
| Jump | `airPose(vy)` | Rise: arms up, legs tuck; Fall: arms out, legs extend |
| Land | `landPose(k)` | Squash on impact, decays to idle |

## Creating New Characters

For each new character:
1. Create mesh in Blender
2. Rig with Mixamo-compatible armature (62 bones)
3. Name bones exactly as shown above
4. Export as GLB (no animations)
5. Place in `public/models/avatars/`
6. The procedural animation system handles all movement automatically
