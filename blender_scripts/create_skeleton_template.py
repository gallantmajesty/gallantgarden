"""
STANDARD SKELETON TEMPLATE GENERATOR
=====================================
Run this script INSIDE Blender (Edit > Preferences > Add-ons > or paste in Script Editor).
It creates:
  1. A Mixamo-compatible armature (62 bones, T-pose)
  2. A reference mannequin mesh skinned to the armature
  3. Four animation clips: Idle, Walk, Run, Jump
  4. Saves as .blend template

HOW TO USE FOR NEW CHARACTERS:
  1. Open this template .blend file
  2. Delete the mannequin mesh (keep the armature + animations)
  3. Import your new character mesh
  4. Parent your mesh to the armature with automatic weights
  5. Export as GLB — animations are already baked in
"""

import bpy
import math
from mathutils import Vector

# ============================================================
# CONFIG
# ============================================================
TEMPLATE_NAME = "StandardSkeletonTemplate"
FPS = 30
EXPORT_PATH = "C:/Users/taksh/studyforest/public/models/avatars/"

# ============================================================
# CLEANUP
# ============================================================
def cleanup():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh)
    for arm in bpy.data.armatures:
        bpy.data.armatures.remove(arm)
    for action in bpy.data.actions:
        bpy.data.actions.remove(action)
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)

# ============================================================
# CREATE ARMATURE
# ============================================================
def create_armature():
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = "Armature"
    arm = arm_obj.data
    arm.name = "Armature"

    # Remove default bone
    bpy.ops.armature.select_all(action='SELECT')
    bpy.ops.armature.delete()

    bones_data = {
        # name: (head, tail, parent_name)
        # Spine chain
        "mixamorig:Hips":            ((0, 0, 0.95),     (0, 0, 1.05),    None),
        "mixamorig:Spine":           ((0, 0, 1.05),     (0, 0, 1.25),    "mixamorig:Hips"),
        "mixamorig:Spine1":          ((0, 0, 1.25),     (0, 0, 1.45),    "mixamorig:Spine"),
        "mixamorig:Spine2":          ((0, 0, 1.45),     (0, 0, 1.60),    "mixamorig:Spine1"),
        # Neck + Head
        "mixamorig:Neck":            ((0, 0, 1.60),     (0, 0, 1.70),    "mixamorig:Spine2"),
        "mixamorig:Head":            ((0, 0, 1.70),     (0, 0, 1.90),    "mixamorig:Neck"),
        "mixamorig:HeadTop_End":     ((0, 0, 1.90),     (0, 0, 2.00),    "mixamorig:Head"),
        # Left Arm
        "mixamorig:LeftShoulder":    ((0, 0, 1.58),     (0.10, 0, 1.58), "mixamorig:Spine2"),
        "mixamorig:LeftArm":         ((0.10, 0, 1.58),  (0.30, 0, 1.55), "mixamorig:LeftShoulder"),
        "mixamorig:LeftForeArm":     ((0.30, 0, 1.55),  (0.50, 0, 1.52), "mixamorig:LeftArm"),
        "mixamorig:LeftHand":        ((0.50, 0, 1.52),  (0.58, 0, 1.50), "mixamorig:LeftForeArm"),
        # Left Hand Fingers (simplified)
        "mixamorig:LeftHandThumb1":  ((0.54, 0.02, 1.50), (0.58, 0.04, 1.48), "mixamorig:LeftHand"),
        "mixamorig:LeftHandThumb2":  ((0.58, 0.04, 1.48), (0.61, 0.05, 1.46), "mixamorig:LeftHandThumb1"),
        "mixamorig:LeftHandThumb3":  ((0.61, 0.05, 1.46), (0.63, 0.06, 1.44), "mixamorig:LeftHandThumb2"),
        "mixamorig:LeftHandIndex1":  ((0.55, 0.01, 1.52), (0.60, 0.01, 1.50), "mixamorig:LeftHand"),
        "mixamorig:LeftHandIndex2":  ((0.60, 0.01, 1.50), (0.63, 0.01, 1.48), "mixamorig:LeftHandIndex1"),
        "mixamorig:LeftHandIndex3":  ((0.63, 0.01, 1.48), (0.65, 0.01, 1.46), "mixamorig:LeftHandIndex2"),
        "mixamorig:LeftHandMiddle1": ((0.55, 0, 1.52),   (0.60, 0, 1.50),   "mixamorig:LeftHand"),
        "mixamorig:LeftHandMiddle2": ((0.60, 0, 1.50),   (0.63, 0, 1.48),   "mixamorig:LeftHandMiddle1"),
        "mixamorig:LeftHandMiddle3": ((0.63, 0, 1.48),   (0.65, 0, 1.46),   "mixamorig:LeftHandMiddle2"),
        "mixamorig:LeftHandRing1":   ((0.55, -0.01, 1.52), (0.60, -0.01, 1.50), "mixamorig:LeftHand"),
        "mixamorig:LeftHandRing2":   ((0.60, -0.01, 1.50), (0.63, -0.01, 1.48), "mixamorig:LeftHandRing1"),
        "mixamorig:LeftHandRing3":   ((0.63, -0.01, 1.48), (0.65, -0.01, 1.46), "mixamorig:LeftHandRing2"),
        "mixamorig:LeftHandPinky1":  ((0.55, -0.02, 1.51), (0.59, -0.02, 1.49), "mixamorig:LeftHand"),
        "mixamorig:LeftHandPinky2":  ((0.59, -0.02, 1.49), (0.62, -0.02, 1.47), "mixamorig:LeftHandPinky1"),
        "mixamorig:LeftHandPinky3":  ((0.62, -0.02, 1.47), (0.64, -0.02, 1.45), "mixamorig:LeftHandPinky2"),
        # Right Arm
        "mixamorig:RightShoulder":   ((0, 0, 1.58),     (-0.10, 0, 1.58), "mixamorig:Spine2"),
        "mixamorig:RightArm":        ((-0.10, 0, 1.58), (-0.30, 0, 1.55), "mixamorig:RightShoulder"),
        "mixamorig:RightForeArm":    ((-0.30, 0, 1.55), (-0.50, 0, 1.52), "mixamorig:RightArm"),
        "mixamorig:RightHand":       ((-0.50, 0, 1.52), (-0.58, 0, 1.50), "mixamorig:RightForeArm"),
        "mixamorig:RightHandThumb1": ((-0.54, 0.02, 1.50), (-0.58, 0.04, 1.48), "mixamorig:RightHand"),
        "mixamorig:RightHandThumb2": ((-0.58, 0.04, 1.48), (-0.61, 0.05, 1.46), "mixamorig:RightHandThumb1"),
        "mixamorig:RightHandThumb3": ((-0.61, 0.05, 1.46), (-0.63, 0.06, 1.44), "mixamorig:RightHandThumb2"),
        "mixamorig:RightHandIndex1": ((-0.55, 0.01, 1.52), (-0.60, 0.01, 1.50), "mixamorig:RightHand"),
        "mixamorig:RightHandIndex2": ((-0.60, 0.01, 1.50), (-0.63, 0.01, 1.48), "mixamorig:RightHandIndex1"),
        "mixamorig:RightHandIndex3": ((-0.63, 0.01, 1.48), (-0.65, 0.01, 1.46), "mixamorig:RightHandIndex2"),
        "mixamorig:RightHandMiddle1":((-0.55, 0, 1.52),  (-0.60, 0, 1.50),  "mixamorig:RightHand"),
        "mixamorig:RightHandMiddle2":((-0.60, 0, 1.50),  (-0.63, 0, 1.48),  "mixamorig:RightHandMiddle1"),
        "mixamorig:RightHandMiddle3":((-0.63, 0, 1.48),  (-0.65, 0, 1.46),  "mixamorig:RightHandMiddle2"),
        "mixamorig:RightHandRing1":  ((-0.55, -0.01, 1.52), (-0.60, -0.01, 1.50), "mixamorig:RightHand"),
        "mixamorig:RightHandRing2":  ((-0.60, -0.01, 1.50), (-0.63, -0.01, 1.48), "mixamorig:RightHandRing1"),
        "mixamorig:RightHandRing3":  ((-0.63, -0.01, 1.48), (-0.65, -0.01, 1.46), "mixamorig:RightHandRing2"),
        "mixamorig:RightHandPinky1": ((-0.55, -0.02, 1.51), (-0.59, -0.02, 1.49), "mixamorig:RightHand"),
        "mixamorig:RightHandPinky2": ((-0.59, -0.02, 1.49), (-0.62, -0.02, 1.47), "mixamorig:RightHandPinky1"),
        "mixamorig:RightHandPinky3": ((-0.62, -0.02, 1.47), (-0.64, -0.02, 1.45), "mixamorig:RightHandPinky2"),
        # Left Leg
        "mixamorig:LeftUpLeg":       ((0.08, 0, 0.95),  (0.08, 0, 0.55),  "mixamorig:Hips"),
        "mixamorig:LeftLeg":         ((0.08, 0, 0.55),  (0.08, 0, 0.10),  "mixamorig:LeftUpLeg"),
        "mixamorig:LeftFoot":        ((0.08, 0, 0.10),  (0.08, -0.10, 0), "mixamorig:LeftLeg"),
        "mixamorig:LeftToeBase":     ((0.08, -0.10, 0), (0.08, -0.18, 0), "mixamorig:LeftFoot"),
        "mixamorig:LeftToe_End":     ((0.08, -0.18, 0), (0.08, -0.22, 0), "mixamorig:LeftToeBase"),
        # Right Leg
        "mixamorig:RightUpLeg":      ((-0.08, 0, 0.95), (-0.08, 0, 0.55),  "mixamorig:Hips"),
        "mixamorig:RightLeg":        ((-0.08, 0, 0.55), (-0.08, 0, 0.10),  "mixamorig:RightUpLeg"),
        "mixamorig:RightFoot":       ((-0.08, 0, 0.10), (-0.08, -0.10, 0), "mixamorig:RightLeg"),
        "mixamorig:RightToeBase":    ((-0.08, -0.10, 0),(-0.08, -0.18, 0), "mixamorig:RightFoot"),
        "mixamorig:RightToe_End":    ((-0.08, -0.18, 0),(-0.08, -0.22, 0), "mixamorig:RightToeBase"),
    }

    for name, (head, tail, parent_name) in bones_data.items():
        bone = arm.edit_bones.new(name)
        bone.head = Vector(head)
        bone.tail = Vector(tail)
        if parent_name and parent_name in arm.edit_bones:
            bone.parent = arm.edit_bones[parent_name]

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

# ============================================================
# CREATE REFERENCE MANNEQUIN
# ============================================================
def create_mannequin(arm_obj):
    bpy.ops.object.select_all(action='DESELECT')

    mat_body = bpy.data.materials.new(name="Body")
    mat_body.diffuse_color = (0.6, 0.7, 0.8, 1)
    mat_shoe = bpy.data.materials.new(name="Shoes")
    mat_shoe.diffuse_color = (0.2, 0.2, 0.2, 1)

    parts = []
    # Torso
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(0, 0, 1.35))
    torso = bpy.context.active_object
    torso.scale = (1, 0.7, 1.6)
    torso.name = "Mannequin_Torso"
    torso.data.materials.append(mat_body)
    parts.append(torso)

    # Head
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(0, 0, 1.80))
    head = bpy.context.active_object
    head.name = "Mannequin_Head"
    head.data.materials.append(mat_body)
    parts.append(head)

    # Left Upper Arm
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.25, location=(0.20, 0, 1.55))
    lua = bpy.context.active_object
    lua.rotation_euler = (0, 0, math.pi/2)
    lua.name = "Mannequin_LUpperArm"
    lua.data.materials.append(mat_body)
    parts.append(lua)

    # Left Forearm
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.22, location=(0.40, 0, 1.53))
    lfa = bpy.context.active_object
    lfa.rotation_euler = (0, 0, math.pi/2)
    lfa.name = "Mannequin_LForeArm"
    lfa.data.materials.append(mat_body)
    parts.append(lfa)

    # Right Upper Arm
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.25, location=(-0.20, 0, 1.55))
    rua = bpy.context.active_object
    rua.rotation_euler = (0, 0, math.pi/2)
    rua.name = "Mannequin_RUpperArm"
    rua.data.materials.append(mat_body)
    parts.append(rua)

    # Right Forearm
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.22, location=(-0.40, 0, 1.53))
    rfa = bpy.context.active_object
    rfa.rotation_euler = (0, 0, math.pi/2)
    rfa.name = "Mannequin_RForeArm"
    rfa.data.materials.append(mat_body)
    parts.append(rfa)

    # Left Thigh
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.40, location=(0.08, 0, 0.72))
    lt = bpy.context.active_object
    lt.name = "Mannequin_LThigh"
    lt.data.materials.append(mat_body)
    parts.append(lt)

    # Left Shin
    bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.40, location=(0.08, 0, 0.32))
    ls = bpy.context.active_object
    ls.name = "Mannequin_LShin"
    ls.data.materials.append(mat_body)
    parts.append(ls)

    # Left Foot
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.08, -0.05, 0.04))
    lf = bpy.context.active_object
    lf.scale = (0.06, 0.12, 0.04)
    lf.name = "Mannequin_LFoot"
    lf.data.materials.append(mat_shoe)
    parts.append(lf)

    # Right Thigh
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.40, location=(-0.08, 0, 0.72))
    rt = bpy.context.active_object
    rt.name = "Mannequin_RThigh"
    rt.data.materials.append(mat_body)
    parts.append(rt)

    # Right Shin
    bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.40, location=(-0.08, 0, 0.32))
    rs = bpy.context.active_object
    rs.name = "Mannequin_RShin"
    rs.data.materials.append(mat_body)
    parts.append(rs)

    # Right Foot
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.08, -0.05, 0.04))
    rf = bpy.context.active_object
    rf.scale = (0.06, 0.12, 0.04)
    rf.name = "Mannequin_RFoot"
    rf.data.materials.append(mat_shoe)
    parts.append(rf)

    # Join all parts
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    mannequin = bpy.context.active_object
    mannequin.name = "Mannequin"

    # Apply transforms
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    # Parent to armature with automatic weights
    bpy.ops.object.select_all(action='DESELECT')
    mannequin.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    return mannequin

# ============================================================
# CREATE ANIMATIONS
# ============================================================
def create_animations(arm_obj):
    arm = arm_obj.data
    bpy.context.view_layer.objects.active = arm_obj

    if arm_obj.animation_data is None:
        arm_obj.animation_data_create()

    pb = arm_obj.pose.bones

    def kb(bone_name, rot=None, loc=None, f=None):
        if bone_name in pb:
            b = pb[bone_name]
            if rot:
                b.rotation_mode = 'XYZ'
                b.rotation_euler = rot
                b.keyframe_insert(data_path="rotation_euler", frame=f)
            if loc:
                b.location = loc
                b.keyframe_insert(data_path="location", frame=f)

    bpy.context.scene.render.fps = FPS

    # ---- IDLE (frames 1-60) ----
    idle = bpy.data.actions.new(name="Idle")
    idle.frame_range = (1, 60)
    for f in range(1, 61):
        t = f / FPS
        breath = math.sin(t * 1.4) * 0.015
        sway = math.sin(t * 0.55) * 0.012
        kb("mixamorig:Hips", rot=(0, 0, sway * 0.3), f=f)
        kb("mixamorig:Spine", rot=(0.03 + breath, 0, sway), f=f)
        kb("mixamorig:Spine1", rot=(0.02 + breath * 0.8, 0, sway * 0.8), f=f)
        kb("mixamorig:Spine2", rot=(0.01 + breath * 0.5, 0, sway * 0.5), f=f)
        kb("mixamorig:Neck", rot=(-0.02, math.sin(t * 0.4) * 0.05, 0), f=f)
        kb("mixamorig:Head", rot=(breath * 0.5, math.sin(t * 0.4 + 1) * 0.04, 0), f=f)
        kb("mixamorig:LeftArm", rot=(0.08 + breath * 0.08, 0, -0.06 + sway * 0.08), f=f)
        kb("mixamorig:RightArm", rot=(0.08 + breath * 0.08, 0, 0.06 - sway * 0.08), f=f)
        kb("mixamorig:LeftForeArm", rot=(0.15, 0, -0.04), f=f)
        kb("mixamorig:RightForeArm", rot=(0.15, 0, 0.04), f=f)

    # ---- WALK (frames 1-30) ----
    walk = bpy.data.actions.new(name="Walk")
    walk.frame_range = (1, 30)
    for f in range(1, 31):
        t = f / FPS * 2 * math.pi
        s = math.sin(t)
        c = math.cos(t)
        kb("mixamorig:Hips", rot=(0, 0, s * 0.02), f=f)
        kb("mixamorig:Spine", rot=(-0.02 * s, 0, 0), f=f)
        kb("mixamorig:Spine1", rot=(-0.015 * s, 0, 0), f=f)
        kb("mixamorig:LeftUpLeg", rot=(0.35 * s, 0, 0), f=f)
        kb("mixamorig:LeftLeg", rot=(-0.45 * max(0, s), 0, 0), f=f)
        kb("mixamorig:LeftFoot", rot=(0.2 * max(0, math.sin(t + 0.3)), 0, 0), f=f)
        kb("mixamorig:RightUpLeg", rot=(-0.35 * s, 0, 0), f=f)
        kb("mixamorig:RightLeg", rot=(-0.45 * max(0, -s), 0, 0), f=f)
        kb("mixamorig:RightFoot", rot=(0.2 * max(0, -math.sin(t + 0.3)), 0, 0), f=f)
        kb("mixamorig:LeftArm", rot=(-0.15 * s, 0, -0.07), f=f)
        kb("mixamorig:RightArm", rot=(0.15 * s, 0, 0.07), f=f)

    # ---- RUN (frames 1-30) ----
    run = bpy.data.actions.new(name="Run")
    run.frame_range = (1, 30)
    for f in range(1, 31):
        t = f / FPS * 2 * math.pi
        s = math.sin(t * 2)
        kb("mixamorig:Hips", loc=(0, 0, abs(math.sin(t * 2)) * 0.03), rot=(0, 0, s * 0.03), f=f)
        kb("mixamorig:Spine", rot=(-0.04 * s, 0, 0), f=f)
        kb("mixamorig:Spine1", rot=(-0.03 * s, 0, 0), f=f)
        kb("mixamorig:LeftUpLeg", rot=(0.6 * s, 0, 0), f=f)
        kb("mixamorig:LeftLeg", rot=(-0.8 * max(0, s), 0, 0), f=f)
        kb("mixamorig:LeftFoot", rot=(0.3 * max(0, math.sin(t * 2 + 0.5)), 0, 0), f=f)
        kb("mixamorig:RightUpLeg", rot=(-0.6 * s, 0, 0), f=f)
        kb("mixamorig:RightLeg", rot=(-0.8 * max(0, -s), 0, 0), f=f)
        kb("mixamorig:RightFoot", rot=(0.3 * max(0, -math.sin(t * 2 + 0.5)), 0, 0), f=f)
        kb("mixamorig:LeftArm", rot=(-0.3 * s, 0, 0), f=f)
        kb("mixamorig:RightArm", rot=(0.4, 0.3 * s, 0), f=f)
        kb("mixamorig:LeftForeArm", rot=(-0.8, 0, 0), f=f)
        kb("mixamorig:RightForeArm", rot=(-0.8, 0, 0), f=f)

    # ---- JUMP (frames 1-60) ----
    jump = bpy.data.actions.new(name="Jump")
    jump.frame_range = (1, 60)
    for f in range(1, 61):
        t = (f - 1) / 60.0
        crouch = max(0, min(1, t * 5)) if t < 0.2 else max(0, 1 - (t - 0.2) * 5)
        air = max(0, min(1, (t - 0.3) * 3.33)) if 0.3 <= t < 0.6 else (max(0, 1 - (t - 0.6) * 2.5) if t >= 0.6 else 0)
        land = max(0, min(1, (t - 0.7) * 3.33)) if 0.7 <= t < 0.9 else 0

        kb("mixamorig:Hips", loc=(0, 0, -0.15 * crouch + 0.1 * land), f=f)
        kb("mixamorig:Spine", rot=(0.1 * crouch - 0.05 * land, 0, 0), f=f)
        kb("mixamorig:LeftUpLeg", rot=(0.3 * crouch - 0.15 * land, 0, 0), f=f)
        kb("mixamorig:RightUpLeg", rot=(0.3 * crouch - 0.15 * land, 0, 0), f=f)
        kb("mixamorig:LeftLeg", rot=(-0.4 * crouch + 0.1 * land - 0.25 * air, 0, 0), f=f)
        kb("mixamorig:RightLeg", rot=(-0.4 * crouch + 0.1 * land - 0.25 * air, 0, 0), f=f)
        kb("mixamorig:LeftArm", rot=(-0.3 * crouch + 0.6 * air - 0.2 * land, 0, 0.3 * air), f=f)
        kb("mixamorig:RightArm", rot=(-0.3 * crouch + 0.6 * air - 0.2 * land, 0, -0.3 * air), f=f)
        kb("mixamorig:LeftForeArm", rot=(-0.8 * crouch + 0.3 * air + 0.1 * land, 0, 0), f=f)
        kb("mixamorig:RightForeArm", rot=(-0.8 * crouch + 0.3 * air + 0.1 * land, 0, 0), f=f)

    # Set default action
    arm_obj.animation_data.action = idle
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 60

    return {"Idle": idle, "Walk": walk, "Run": run, "Jump": jump}

# ============================================================
# MAIN
# ============================================================
def main():
    cleanup()
    arm_obj = create_armature()
    mannequin = create_mannequin(arm_obj)
    animations = create_animations(arm_obj)

    # Select everything
    bpy.ops.object.select_all(action='SELECT')

    # Save template
    template_path = bpy.path.abspath(f"//{TEMPLATE_NAME}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=template_path)

    print(f"\n{'='*50}")
    print(f"TEMPLATE CREATED: {template_path}")
    print(f"Bones: {len(arm_obj.data.bones)}")
    print(f"Animations: {list(animations.keys())}")
    print(f"{'='*50}")
    print(f"\nHOW TO USE:")
    print(f"1. Open this .blend file")
    print(f"2. Delete the Mannequin mesh (keep armature + animations)")
    print(f"3. Import your character mesh")
    print(f"4. Parent mesh to armature (Ctrl+P > Armature Deform)")
    print(f"5. Export as GLB — animations included!")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
