"""
run_all.py - Master pipeline: rig + locomotion + export
Usage: blender --background --python run_all.py -- <input.glb> <output.glb> [height]

This single script runs the entire character template pipeline:
  1. Clean scene, import GLB
  2. Create humanoid armature (22 bones)
  3. Skin mesh with envelope weights
  4. Create 10 locomotion animations
  5. Validate and export web-ready GLB

Examples:
  blender --background --python run_all.py -- character.glb character_rigged.glb
  blender --background --python run_all.py -- character.glb character_rigged.glb 1.6

Part of the FocusLily Realms character template system.
"""
import bpy
import sys
import os
import math
from mathutils import Vector

# ── PARSE ARGS ────────────────────────────────────────────────────
argv = sys.argv
if "--" in argv:
    args = argv[argv.index("--") + 1:]
else:
    args = []

INPUT = args[0] if len(args) > 0 else r"C:\Users\taksh\Downloads\textured_mesh (1).glb"
OUTPUT = args[1] if len(args) > 1 else r"C:\Users\taksh\Downloads\textured_mesh_final.glb"
TARGET_HEIGHT = float(args[2]) if len(args) > 2 else 1.8
FPS = 30


def log(msg):
    print(f"[pipeline] {msg}")


# ══════════════════════════════════════════════════════════════════
# STEP 1: BASE RIG
# ══════════════════════════════════════════════════════════════════

BONE_TEMPLATE = [
    ("Hips",          (0, 0, 0.94),    (0, 0, 1.04),    None,             False),
    ("Spine",         (0, 0, 1.04),    (0, 0, 1.16),    "Hips",           True),
    ("Spine1",        (0, 0, 1.16),    (0, 0, 1.28),    "Spine",          True),
    ("Spine2",        (0, 0, 1.28),    (0, 0, 1.40),    "Spine1",         True),
    ("Neck",          (0, 0, 1.40),    (0, 0, 1.50),    "Spine2",         True),
    ("Head",          (0, 0, 1.50),    (0, 0, 1.72),    "Neck",           True),
    ("LeftShoulder",  (0.06, 0, 1.40), (0.16, 0, 1.40), "Spine2",         False),
    ("LeftUpperArm",  (0.16, 0, 1.40), (0.16, 0, 1.16), "LeftShoulder",   True),
    ("LeftLowerArm",  (0.16, 0, 1.16), (0.16, 0, 0.94), "LeftUpperArm",   True),
    ("LeftHand",      (0.16, 0, 0.94), (0.16, 0, 0.84), "LeftLowerArm",   True),
    ("RightShoulder", (-0.06, 0, 1.40),(-0.16, 0, 1.40),"Spine2",         False),
    ("RightUpperArm", (-0.16, 0, 1.40),(-0.16, 0, 1.16),"RightShoulder",  True),
    ("RightLowerArm", (-0.16, 0, 1.16),(-0.16, 0, 0.94),"RightUpperArm",  True),
    ("RightHand",     (-0.16, 0, 0.94),(-0.16, 0, 0.84),"RightLowerArm",  True),
    ("LeftUpperLeg",  (0.10, 0, 0.94), (0.10, 0, 0.52), "Hips",           False),
    ("LeftLowerLeg",  (0.10, 0, 0.52), (0.10, 0, 0.08), "LeftUpperLeg",   True),
    ("LeftFoot",      (0.10, 0, 0.08), (0.10, -0.12, 0),"LeftLowerLeg",   True),
    ("LeftToes",      (0.10, -0.12, 0),(0.10, -0.20, 0),"LeftFoot",       True),
    ("RightUpperLeg", (-0.10, 0, 0.94),(-0.10, 0, 0.52),"Hips",           False),
    ("RightLowerLeg", (-0.10, 0, 0.52),(-0.10, 0, 0.08),"RightUpperLeg",  True),
    ("RightFoot",     (-0.10, 0, 0.08),(-0.10, -0.12, 0),"RightLowerLeg", True),
    ("RightToes",     (-0.10, -0.12, 0),(-0.10, -0.20, 0),"RightFoot",    True),
]


def step_rig():
    log("STEP 1: Creating armature and skinning mesh...")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=INPUT)

    # Remove non-mesh objects
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)

    # Find main mesh
    mesh = None
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and len(obj.data.vertices) > 100:
            mesh = obj
            break
    if not mesh:
        raise RuntimeError("No mesh found")

    log(f"  Mesh: {mesh.name} ({len(mesh.data.vertices)} verts)")

    # Center, scale, ground
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    bbox = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
    min_z = min(v.z for v in bbox)
    max_z = max(v.z for v in bbox)
    height = max_z - min_z
    sf = TARGET_HEIGHT / height
    mesh.scale = (sf, sf, sf)
    mesh.location.z -= min_z * sf
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bbox = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
    mesh.location.x -= sum(v.x for v in bbox) / 8
    mesh.location.y -= sum(v.y for v in bbox) / 8
    mesh.location.z = 0
    mesh.name = "Character"

    # Create armature
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm_obj = bpy.context.object
    arm_obj.name = "Armature"
    arm = arm_obj.data
    arm.name = "Armature"

    bpy.ops.armature.select_all(action='SELECT')
    bpy.ops.armature.delete()

    for bname, head, tail, parent, connect in BONE_TEMPLATE:
        b = arm.edit_bones.new(bname)
        b.head = Vector(head)
        b.tail = Vector(tail)
        b.use_connect = connect
        if parent:
            b.parent = arm.edit_bones[parent]

    bpy.ops.object.mode_set(mode='OBJECT')
    log(f"  Armature: {len(arm.bones)} bones")

    # Skin
    arm_obj.location = mesh.location.copy()
    mesh.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')

    has_mod = any(m.type == 'ARMATURE' for m in mesh.modifiers)
    log(f"  Skinned: armature modifier={has_mod}")

    return arm_obj, mesh


# ══════════════════════════════════════════════════════════════════
# STEP 2: LOCOMOTION ANIMATIONS
# ══════════════════════════════════════════════════════════════════

def kf(action, arm_obj, bone_name, frame, rot_xyz, loc_xyz=None):
    pb = arm_obj.pose.bones.get(bone_name)
    if not pb:
        return
    pb.rotation_mode = 'XYZ'
    orig_rot = pb.rotation_euler.copy()
    orig_loc = pb.location.copy()
    pb.rotation_euler = Vector(rot_xyz)
    if loc_xyz:
        pb.location = Vector(loc_xyz)
    pb.keyframe_insert(data_path="rotation_euler", frame=frame, group=action.name)
    if loc_xyz:
        pb.keyframe_insert(data_path="location", frame=frame, group=action.name)
    pb.rotation_euler = orig_rot
    pb.location = orig_loc


def step_locomotion(arm_obj):
    log("STEP 2: Creating locomotion animations...")
    arm_obj.animation_data_create()
    frame = 1
    actions = []

    # IDLE
    a = bpy.data.actions.new("Idle")
    a.frame_range = (frame, frame + 29)
    for f in range(frame, frame + 30):
        t = (f - frame) / 30.0
        br = math.sin(t * math.pi * 2) * 0.02
        kf(a, arm_obj, "Spine", f, (br * 0.5, 0, 0))
        kf(a, arm_obj, "Spine1", f, (br * 0.8, 0, 0))
        kf(a, arm_obj, "Spine2", f, (br, 0, 0))
        kf(a, arm_obj, "Head", f, (math.sin(t * math.pi * 2) * 0.01, 0, 0))
        kf(a, arm_obj, "LeftUpperArm", f, (0, 0, math.sin(t * math.pi * 2) * 0.02))
        kf(a, arm_obj, "RightUpperArm", f, (0, 0, -math.sin(t * math.pi * 2) * 0.02))
    actions.append(a); frame += 30
    log("  Idle: 30f")

    # WALK
    a = bpy.data.actions.new("Walk")
    a.frame_range = (frame, frame + 29)
    for f in range(frame, frame + 30):
        t = (f - frame) / 30.0
        ang = t * math.pi * 2
        hip_y = math.sin(ang * 2) * 0.015
        kf(a, arm_obj, "Hips", f, (0, 0, -hip_y), (0, 0, hip_y))
        kf(a, arm_obj, "Spine", f, (math.sin(ang) * 0.05, 0, 0))
        kf(a, arm_obj, "Spine2", f, (-math.sin(ang) * 0.03, 0, 0))
        ll, rl = math.sin(ang), math.sin(ang + math.pi)
        kf(a, arm_obj, "LeftUpperLeg", f, (ll * 0.5, 0, 0))
        kf(a, arm_obj, "LeftLowerLeg", f, (max(0, -ll) * 0.8, 0, 0))
        kf(a, arm_obj, "LeftFoot", f, (ll * 0.2, 0, 0))
        kf(a, arm_obj, "RightUpperLeg", f, (rl * 0.5, 0, 0))
        kf(a, arm_obj, "RightLowerLeg", f, (max(0, -rl) * 0.8, 0, 0))
        kf(a, arm_obj, "RightFoot", f, (rl * 0.2, 0, 0))
        kf(a, arm_obj, "LeftUpperArm", f, (-ll * 0.4, 0, 0))
        kf(a, arm_obj, "LeftLowerArm", f, (max(0, ll) * 0.3, 0, 0))
        kf(a, arm_obj, "RightUpperArm", f, (-rl * 0.4, 0, 0))
        kf(a, arm_obj, "RightLowerArm", f, (max(0, rl) * 0.3, 0, 0))
        kf(a, arm_obj, "Head", f, (-abs(math.sin(ang)) * 0.03, 0, 0))
    actions.append(a); frame += 30
    log("  Walk: 30f")

    # RUN
    a = bpy.data.actions.new("Run")
    a.frame_range = (frame, frame + 23)
    for f in range(frame, frame + 24):
        t = (f - frame) / 24.0
        ang = t * math.pi * 2
        hip_y = math.sin(ang * 2) * 0.04
        kf(a, arm_obj, "Hips", f, (0, 0, -hip_y * 0.5), (0, 0, hip_y))
        kf(a, arm_obj, "Spine", f, (0.1 + math.sin(ang) * 0.08, 0, 0))
        kf(a, arm_obj, "Spine2", f, (-math.sin(ang) * 0.05, 0, 0))
        ll, rl = math.sin(ang), math.sin(ang + math.pi)
        kf(a, arm_obj, "LeftUpperLeg", f, (ll * 0.8, 0, 0))
        kf(a, arm_obj, "LeftLowerLeg", f, (max(0, -ll) * 1.2, 0, 0))
        kf(a, arm_obj, "LeftFoot", f, (ll * 0.3, 0, 0))
        kf(a, arm_obj, "RightUpperLeg", f, (rl * 0.8, 0, 0))
        kf(a, arm_obj, "RightLowerLeg", f, (max(0, -rl) * 1.2, 0, 0))
        kf(a, arm_obj, "RightFoot", f, (rl * 0.3, 0, 0))
        kf(a, arm_obj, "LeftUpperArm", f, (-ll * 0.7, 0, 0))
        kf(a, arm_obj, "LeftLowerArm", f, (max(0, ll) * 0.5 + 0.3, 0, 0))
        kf(a, arm_obj, "RightUpperArm", f, (-rl * 0.7, 0, 0))
        kf(a, arm_obj, "RightLowerArm", f, (max(0, rl) * 0.5 + 0.3, 0, 0))
        kf(a, arm_obj, "Head", f, (-abs(math.sin(ang)) * 0.06, 0, 0))
    actions.append(a); frame += 24
    log("  Run: 24f")

    # SPRINT
    a = bpy.data.actions.new("Sprint")
    a.frame_range = (frame, frame + 19)
    for f in range(frame, frame + 20):
        t = (f - frame) / 20.0
        ang = t * math.pi * 2
        hip_y = math.sin(ang * 2) * 0.06
        kf(a, arm_obj, "Hips", f, (0.15, 0, -hip_y * 0.3), (0, 0, hip_y))
        kf(a, arm_obj, "Spine", f, (0.18 + math.sin(ang) * 0.12, 0, 0))
        ll, rl = math.sin(ang), math.sin(ang + math.pi)
        kf(a, arm_obj, "LeftUpperLeg", f, (ll * 1.1, 0, 0))
        kf(a, arm_obj, "LeftLowerLeg", f, (max(0, -ll) * 1.6, 0, 0))
        kf(a, arm_obj, "LeftFoot", f, (ll * 0.4, 0, 0))
        kf(a, arm_obj, "RightUpperLeg", f, (rl * 1.1, 0, 0))
        kf(a, arm_obj, "RightLowerLeg", f, (max(0, -rl) * 1.6, 0, 0))
        kf(a, arm_obj, "RightFoot", f, (rl * 0.4, 0, 0))
        kf(a, arm_obj, "LeftUpperArm", f, (-ll * 1.0, 0, 0))
        kf(a, arm_obj, "LeftLowerArm", f, (max(0, ll) * 0.6 + 0.5, 0, 0))
        kf(a, arm_obj, "RightUpperArm", f, (-rl * 1.0, 0, 0))
        kf(a, arm_obj, "RightLowerArm", f, (max(0, rl) * 0.6 + 0.5, 0, 0))
        kf(a, arm_obj, "Head", f, (-abs(math.sin(ang)) * 0.09, 0, 0))
    actions.append(a); frame += 20
    log("  Sprint: 20f")

    # JUMP
    a = bpy.data.actions.new("Jump")
    a.frame_range = (frame, frame + 29)
    for f in range(frame, frame + 30):
        t = (f - frame) / 30.0
        if t < 0.2:
            c = t / 0.2
            kf(a, arm_obj, "Hips", f, (0, 0, 0), (0, 0, -c * 0.15))
            kf(a, arm_obj, "LeftUpperLeg", f, (c * 0.5, 0, 0))
            kf(a, arm_obj, "RightUpperLeg", f, (c * 0.5, 0, 0))
            kf(a, arm_obj, "LeftLowerLeg", f, (c * 0.6, 0, 0))
            kf(a, arm_obj, "RightLowerLeg", f, (c * 0.6, 0, 0))
            kf(a, arm_obj, "Spine", f, (-c * 0.1, 0, 0))
        elif t < 0.35:
            l = (t - 0.2) / 0.15
            kf(a, arm_obj, "Hips", f, (0, 0, 0), (0, 0, l * 0.5))
            kf(a, arm_obj, "LeftUpperArm", f, (0, 0, -l * 0.8))
            kf(a, arm_obj, "RightUpperArm", f, (0, 0, l * 0.8))
            kf(a, arm_obj, "LeftUpperLeg", f, (-l * 0.3, 0, 0))
            kf(a, arm_obj, "RightUpperLeg", f, (-l * 0.3, 0, 0))
        elif t < 0.65:
            air = (t - 0.35) / 0.3
            p = math.sin(air * math.pi)
            kf(a, arm_obj, "Hips", f, (0, 0, 0), (0, 0, 0.5 * p))
            kf(a, arm_obj, "LeftUpperLeg", f, (-0.3 * p, 0, 0))
            kf(a, arm_obj, "RightUpperLeg", f, (-0.3 * p, 0, 0))
            kf(a, arm_obj, "LeftUpperArm", f, (0, 0, -0.5 * p))
            kf(a, arm_obj, "RightUpperArm", f, (0, 0, 0.5 * p))
            kf(a, arm_obj, "LeftLowerLeg", f, (0.4 * p, 0, 0))
            kf(a, arm_obj, "RightLowerLeg", f, (0.4 * p, 0, 0))
        else:
            land = (t - 0.65) / 0.35
            d = 1 - land
            kf(a, arm_obj, "Hips", f, (0, 0, 0), (0, 0, d * 0.05))
            kf(a, arm_obj, "Spine", f, (d * 0.1, 0, 0))
            kf(a, arm_obj, "LeftUpperLeg", f, (d * 0.3, 0, 0))
            kf(a, arm_obj, "RightUpperLeg", f, (d * 0.3, 0, 0))
    actions.append(a); frame += 30
    log("  Jump: 30f")

    # CROUCH
    a = bpy.data.actions.new("Crouch")
    a.frame_range = (frame, frame + 19)
    for f in range(frame, frame + 20):
        t = (f - frame) / 20.0
        kf(a, arm_obj, "Hips", f, (0, 0, 0), (0, 0, -0.15))
        kf(a, arm_obj, "Spine", f, (-0.1, 0, 0))
        kf(a, arm_obj, "LeftUpperLeg", f, (0.5, 0, 0))
        kf(a, arm_obj, "RightUpperLeg", f, (0.5, 0, 0))
        kf(a, arm_obj, "LeftLowerLeg", f, (0.6, 0, 0))
        kf(a, arm_obj, "RightLowerLeg", f, (0.6, 0, 0))
        kf(a, arm_obj, "LeftUpperArm", f, (0.3, 0, 0))
        kf(a, arm_obj, "RightUpperArm", f, (0.3, 0, 0))
        kf(a, arm_obj, "LeftLowerArm", f, (-0.3, 0, 0))
        kf(a, arm_obj, "RightLowerArm", f, (-0.3, 0, 0))
    actions.append(a); frame += 20
    log("  Crouch: 20f")

    # WAVE
    a = bpy.data.actions.new("Wave")
    a.frame_range = (frame, frame + 39)
    for f in range(frame, frame + 40):
        t = (f - frame) / 40.0
        if t < 0.15:
            r = t / 0.15
            kf(a, arm_obj, "RightUpperArm", f, (0, 0, -r * 1.2))
            kf(a, arm_obj, "RightLowerArm", f, (-r * 0.8, 0, 0))
        elif t < 0.85:
            wt = (t - 0.15) / 0.7
            wave = math.sin(wt * math.pi * 4) * 0.3
            kf(a, arm_obj, "RightUpperArm", f, (0, 0, -1.2))
            kf(a, arm_obj, "RightLowerArm", f, (-0.8 + wave, 0, 0))
        else:
            r = (t - 0.85) / 0.15
            kf(a, arm_obj, "RightUpperArm", f, (0, 0, -1.2 * (1 - r)))
            kf(a, arm_obj, "RightLowerArm", f, (-0.8 * (1 - r), 0, 0))
    actions.append(a); frame += 40
    log("  Wave: 40f")

    # DANCE
    a = bpy.data.actions.new("Dance")
    a.frame_range = (frame, frame + 59)
    for f in range(frame, frame + 60):
        t = (f - frame) / 60.0
        ang = t * math.pi * 2
        bounce = abs(math.sin(ang * 4)) * 0.05
        sway = math.sin(ang * 4) * 0.08
        kf(a, arm_obj, "Hips", f, (0, 0, 0), (0, 0, -bounce))
        kf(a, arm_obj, "Spine", f, (0, 0, sway))
        kf(a, arm_obj, "Spine2", f, (0, 0, -sway * 0.5))
        arm1 = math.sin(ang * 4) * 0.6
        arm2 = math.sin(ang * 4 + math.pi) * 0.6
        kf(a, arm_obj, "LeftUpperArm", f, (0, 0, arm1))
        kf(a, arm_obj, "LeftLowerArm", f, (abs(arm1) * 0.3, 0, 0))
        kf(a, arm_obj, "RightUpperArm", f, (0, 0, arm2))
        kf(a, arm_obj, "RightLowerArm", f, (abs(arm2) * 0.3, 0, 0))
        kf(a, arm_obj, "LeftUpperLeg", f, (bounce * 2, 0, 0))
        kf(a, arm_obj, "RightUpperLeg", f, (bounce * 2, 0, 0))
        kf(a, arm_obj, "Head", f, (0, 0, sway * 0.3))
    actions.append(a); frame += 60
    log("  Dance: 60f")

    # NOD
    a = bpy.data.actions.new("Nod")
    a.frame_range = (frame, frame + 19)
    for f in range(frame, frame + 20):
        t = (f - frame) / 20.0
        if t < 0.3:
            n = t / 0.3
        elif t < 0.5:
            n = 1 - (t - 0.3) / 0.2
        elif t < 0.7:
            n = (t - 0.5) / 0.2
        else:
            n = 1 - (t - 0.7) / 0.3
        kf(a, arm_obj, "Head", f, (n * 0.15, 0, 0))
        kf(a, arm_obj, "Neck", f, (n * 0.08, 0, 0))
    actions.append(a); frame += 20
    log("  Nod: 20f")

    # SHAKE
    a = bpy.data.actions.new("Shake")
    a.frame_range = (frame, frame + 23)
    for f in range(frame, frame + 24):
        t = (f - frame) / 24.0
        shake = math.sin(t * math.pi * 6) * 0.12
        kf(a, arm_obj, "Head", f, (0, 0, shake))
        kf(a, arm_obj, "Neck", f, (0, 0, shake * 0.5))
    actions.append(a); frame += 24
    log("  Shake: 24f")

    arm_obj.animation_data.action = actions[0]
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = frame - 1
    bpy.context.scene.render.fps = FPS

    log(f"  Total: {frame - 1} frames, {len(actions)} animations")
    return actions


# ══════════════════════════════════════════════════════════════════
# STEP 3: EXPORT
# ══════════════════════════════════════════════════════════════════

def step_export(arm_obj, mesh):
    log("STEP 3: Validating and exporting...")

    # Validate
    required_bones = {"Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
                      "LeftUpperArm", "LeftLowerArm", "RightUpperArm", "RightLowerArm",
                      "LeftUpperLeg", "LeftLowerLeg", "RightUpperLeg", "RightLowerLeg"}
    existing = {b.name for b in arm_obj.data.bones}
    missing = required_bones - existing
    if missing:
        log(f"  WARNING: Missing bones: {missing}")

    has_mod = any(m.type == 'ARMATURE' for m in mesh.modifiers)
    log(f"  Armature modifier: {has_mod}")
    log(f"  Vertex groups: {len(mesh.vertex_groups)}")
    log(f"  Actions: {[a.name for a in bpy.data.actions]}")

    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        use_selection=False,
        export_format='GLB',
        export_animations=True,
        export_image_format='AUTO',
        export_yup=True,
    )

    file_size = os.path.getsize(OUTPUT) / (1024 * 1024)
    log(f"  Exported: {OUTPUT} ({file_size:.2f} MB)")


# ══════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════

def main():
    log("=" * 60)
    log("FocusLily Realms - Character Template Pipeline")
    log("=" * 60)
    log(f"Input:  {INPUT}")
    log(f"Output: {OUTPUT}")
    log(f"Height: {TARGET_HEIGHT}m")
    log(f"FPS:    {FPS}")
    log("")

    arm_obj, mesh = step_rig()
    log("")
    actions = step_locomotion(arm_obj)
    log("")
    step_export(arm_obj, mesh)

    log("")
    log("=" * 60)
    log("PIPELINE COMPLETE")
    log("=" * 60)
    log("Animations available:")
    for a in bpy.data.actions:
        log(f"  {a.name}: frames {int(a.frame_range[0])}-{int(a.frame_range[1])}")
    log("")
    log("To use in web FocusLily Realms:")
    log("  Load the GLB, play animations by name:")
    log("  Idle, Walk, Run, Sprint, Jump, Crouch, Wave, Dance, Nod, Shake")


if __name__ == "__main__":
    main()
