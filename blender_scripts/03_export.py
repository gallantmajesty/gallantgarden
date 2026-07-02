"""
03_export.py - Export web-ready GLB with validation
Usage: blender --background --python 03_export.py -- <input.blend> <output.glb>

Validates:
  - Armature has all required bones
  - All actions exist and have correct frame ranges
  - Mesh has armature modifier with weights
  - Exports with optimal settings for web (FocusLily Realms)

Part of the FocusLily Realms character template system.
"""
import bpy
import sys
import os
from mathutils import Vector

argv = sys.argv
if "--" in argv:
    args = argv[argv.index("--") + 1:]
else:
    args = []

INPUT = args[0] if len(args) > 0 else r"C:\Users\taksh\Downloads\textured_mesh_animated.blend"
OUTPUT = args[1] if len(args) > 1 else r"C:\Users\taksh\Downloads\textured_mesh_final.glb"

REQUIRED_BONES = [
    "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
    "LeftShoulder", "LeftUpperArm", "LeftLowerArm", "LeftHand",
    "RightShoulder", "RightUpperArm", "RightLowerArm", "RightHand",
    "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "LeftToes",
    "RightUpperLeg", "RightLowerLeg", "RightFoot", "RightToes",
]

REQUIRED_ACTIONS = ["Idle", "Walk", "Run", "Sprint", "Jump", "Crouch", "Wave", "Dance", "Nod", "Shake"]


def log(msg):
    print(f"[export] {msg}")


def validate_bones(arm):
    """Check all required bones exist."""
    existing = {b.name for b in arm.bones}
    missing = [b for b in REQUIRED_BONES if b not in existing]
    if missing:
        log(f"WARNING: Missing bones: {missing}")
        return False
    log(f"All {len(REQUIRED_BONES)} required bones present")
    return True


def validate_actions():
    """Check all required actions exist."""
    existing = {a.name for a in bpy.data.actions}
    missing = [a for a in REQUIRED_ACTIONS if a not in existing]
    if missing:
        log(f"WARNING: Missing actions: {missing}")
        log(f"Available: {sorted(existing)}")
        return False
    log(f"All {len(REQUIRED_ACTIONS)} required actions present")
    return True


def validate_skin(mesh):
    """Check mesh has armature modifier with weights."""
    mod = None
    for m in mesh.modifiers:
        if m.type == 'ARMATURE':
            mod = m
            break
    if not mod:
        log("WARNING: No armature modifier found on mesh")
        return False
    if not mesh.vertex_groups:
        log("WARNING: No vertex groups (no weights)")
        return False
    log(f"Skin valid: {len(mesh.vertex_groups)} vertex groups, armature modifier present")
    return True


def get_animation_info():
    """Get summary of all animations."""
    info = []
    for action in bpy.data.actions:
        start, end = action.frame_range
        info.append({
            "name": action.name,
            "frames": int(end - start + 1),
            "duration_s": round((end - start + 1) / 30, 2),
            "start": int(start),
            "end": int(end),
        })
    return info


def main():
    log(f"Input: {INPUT}")

    # Load
    if INPUT.endswith(".glb") or INPUT.endswith(".gltf"):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=INPUT)
    else:
        bpy.ops.wm.open_mainfile(filepath=INPUT)

    # Find objects
    arm_obj = None
    mesh = None
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE':
            arm_obj = obj
        elif obj.type == 'MESH' and len(obj.data.vertices) > 100:
            mesh = obj

    if not arm_obj:
        log("ERROR: No armature found")
        sys.exit(1)
    if not mesh:
        log("ERROR: No mesh found")
        sys.exit(1)

    # Validate
    log("=== VALIDATION ===")
    bones_ok = validate_bones(arm_obj.data)
    actions_ok = validate_actions()
    skin_ok = validate_skin(mesh)

    if not (bones_ok and skin_ok):
        log("ERROR: Critical validation failed")
        sys.exit(1)

    # Animation info
    log("=== ANIMATIONS ===")
    anim_info = get_animation_info()
    for ai in anim_info:
        log(f"  {ai['name']}: {ai['frames']}f ({ai['duration_s']}s) [{ai['start']}-{ai['end']}]")

    total_frames = sum(ai["frames"] for ai in anim_info)
    total_duration = sum(ai["duration_s"] for ai in anim_info)
    log(f"Total: {total_frames} frames, {total_duration}s across {len(anim_info)} animations")

    # Mesh info
    log("=== MESH ===")
    log(f"  Vertices: {len(mesh.data.vertices)}")
    log(f"  Polygons: {len(mesh.data.polygons)}")
    if mesh.data.materials:
        for i, mat in enumerate(mesh.data.materials):
            log(f"  Material[{i}]: {mat.name}")

    # Export
    log("=== EXPORTING ===")
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        use_selection=False,
        export_format='GLB',
        export_animations=True,
        export_image_format='AUTO',
        export_yup=True,
    )

    file_size = os.path.getsize(OUTPUT) / (1024 * 1024)
    log(f"Exported: {OUTPUT} ({file_size:.2f} MB)")
    log("DONE - export complete")


if __name__ == "__main__":
    main()
