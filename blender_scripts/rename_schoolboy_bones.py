"""
Rename schoolboy.glb bones from Nick naming to Mixamo naming.

Usage:
  1. Open Blender
  2. Go to Scripting tab
  3. Open this file
  4. Click Run Script
  5. The re-rigged model exports to public/models/avatars/schoolboy_rigged.glb
"""

import bpy
import os

# ── Clear scene ──────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# ── Import schoolboy.glb ─────────────────────────────────────────────────────
project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import_path = os.path.join(project_dir, "public", "models", "avatars", "schoolboy.glb")
bpy.ops.import_scene.gltf(filepath=import_path)

# ── Bone rename map: Nick name → Mixamo name ─────────────────────────────────
BONE_MAP = {
    # Spine chain
    "Nick:Root_M_01":           "mixamorig:Hips",
    "Nick:Spine1_M_09":         "mixamorig:Spine",
    "Nick:Spine2_M_010":        "mixamorig:Spine1",
    "Nick:Chest_M_011":         "mixamorig:Spine2",
    "Nick:Neck_M_012":          "mixamorig:Neck",
    "Nick:Head_M_013":          "mixamorig:Head",
    "Nick:HeadEnd_M_014":       "mixamorig:HeadTop_End",

    # Left leg
    "Nick:Hip_L_02":            "mixamorig:LeftUpLeg",
    "Nick:Knee_L_00":           "mixamorig:LeftLeg",
    "Nick:Ankle_L_03":          "mixamorig:LeftFoot",
    "Nick:Toes_L_04":           "mixamorig:LeftToeBase",
    "Nick:ToesEnd_L":           "mixamorig:LeftToe_End",

    # Right leg
    "Nick:Hip_R_05":            "mixamorig:RightUpLeg",
    "Nick:Knee_R_06":           "mixamorig:RightLeg",
    "Nick:Ankle_R_07":          "mixamorig:RightFoot",
    "Nick:Toes_R_08":           "mixamorig:RightToeBase",
    "Nick:ToesEnd_R":           "mixamorig:RightToe_End",

    # Left arm
    "Nick:Scapula_L_015":       "mixamorig:LeftShoulder",
    "Nick:Shoulder_L_016":      "mixamorig:LeftArm",
    "Nick:Elbow_L_017":         "mixamorig:LeftForeArm",
    "Nick:Wrist_L_018":         "mixamorig:LeftHand",

    # Left fingers
    "Nick:ThumbFinger1_L_031":  "mixamorig:LeftHandThumb1",
    "Nick:ThumbFinger2_L_032":  "mixamorig:LeftHandThumb2",
    "Nick:ThumbFinger3_L_033":  "mixamorig:LeftHandThumb3",
    "Nick:ThumbFinger4_L":      "mixamorig:LeftHandThumb4",
    "Nick:IndexFinger1_L_019":  "mixamorig:LeftHandIndex1",
    "Nick:IndexFinger2_L_020":  "mixamorig:LeftHandIndex2",
    "Nick:IndexFinger3_L_021":  "mixamorig:LeftHandIndex3",
    "Nick:IndexFinger4_L":      "mixamorig:LeftHandIndex4",
    "Nick:MiddleFinger1_L_022": "mixamorig:LeftHandMiddle1",
    "Nick:MiddleFinger2_L_023": "mixamorig:LeftHandMiddle2",
    "Nick:MiddleFinger3_L_024": "mixamorig:LeftHandMiddle3",
    "Nick:MiddleFinger4_L":     "mixamorig:LeftHandMiddle4",
    "Nick:RingFinger1_L_028":   "mixamorig:LeftHandRing1",
    "Nick:RingFinger2_L_029":   "mixamorig:LeftHandRing2",
    "Nick:RingFinger3_L_030":   "mixamorig:LeftHandRing3",
    "Nick:RingFinger4_L":       "mixamorig:LeftHandRing4",
    "Nick:PinkyFinger1_L_025":  "mixamorig:LeftHandPinky1",
    "Nick:PinkyFinger2_L_026":  "mixamorig:LeftHandPinky2",
    "Nick:PinkyFinger3_L_027":  "mixamorig:LeftHandPinky3",
    "Nick:PinkyFinger4_L":      "mixamorig:LeftHandPinky4",

    # Right arm
    "Nick:Scapula_R_034":       "mixamorig:RightShoulder",
    "Nick:Shoulder_R_035":      "mixamorig:RightArm",
    "Nick:Elbow_R_036":         "mixamorig:RightForeArm",
    "Nick:Wrist_R_037":         "mixamorig:RightHand",

    # Right fingers
    "Nick:ThumbFinger1_R_050":  "mixamorig:RightHandThumb1",
    "Nick:ThumbFinger2_R_051":  "mixamorig:RightHandThumb2",
    "Nick:ThumbFinger3_R_052":  "mixamorig:RightHandThumb3",
    "Nick:ThumbFinger4_R":      "mixamorig:RightHandThumb4",
    "Nick:IndexFinger1_R_038":  "mixamorig:RightHandIndex1",
    "Nick:IndexFinger2_R_039":  "mixamorig:RightHandIndex2",
    "Nick:IndexFinger3_R_040":  "mixamorig:RightHandIndex3",
    "Nick:IndexFinger4_R":      "mixamorig:RightHandIndex4",
    "Nick:MiddleFinger1_R_041": "mixamorig:RightHandMiddle1",
    "Nick:MiddleFinger2_R_042": "mixamorig:RightHandMiddle2",
    "Nick:MiddleFinger3_R_043": "mixamorig:RightHandMiddle3",
    "Nick:MiddleFinger4_R":     "mixamorig:RightHandMiddle4",
    "Nick:RingFinger1_R_047":   "mixamorig:RightHandRing1",
    "Nick:RingFinger2_R_048":   "mixamorig:RightHandRing2",
    "Nick:RingFinger3_R_049":   "mixamorig:RightHandRing3",
    "Nick:RingFinger4_R":       "mixamorig:RightHandRing4",
    "Nick:PinkyFinger1_R_044":  "mixamorig:RightHandPinky1",
    "Nick:PinkyFinger2_R_045":  "mixamorig:RightHandPinky2",
    "Nick:PinkyFinger3_R_046":  "mixamorig:RightHandPinky3",
    "Nick:PinkyFinger4_R":      "mixamorig:RightHandPinky4",
}

# ── Rename bones in edit mode ────────────────────────────────────────────────
# Find the armature
armature_obj = None
for obj in bpy.data.objects:
    if obj.type == 'ARMATURE':
        armature_obj = obj
        break

if armature_obj is None:
    raise RuntimeError("No armature found in the imported GLB")

bpy.context.view_layer.objects.active = armature_obj
bpy.ops.object.mode_set(mode='EDIT')

renamed = 0
missing = 0
for bone in armature_obj.data.edit_bones:
    if bone.name in BONE_MAP:
        old_name = bone.name
        bone.name = BONE_MAP[old_name]
        renamed += 1
        print(f"  Renamed: {old_name} -> {bone.name}")
    else:
        missing += 1
        print(f"  Skipped (no mapping): {bone.name}")

bpy.ops.object.mode_set(mode='OBJECT')
print(f"\nRenamed {renamed} bones, skipped {missing}")

# ── Delete extra empty nodes that glTF importer creates ──────────────────────
# These are the _0, _1 suffix nodes that are empty transform nodes
for obj in list(bpy.data.objects):
    if obj.type == 'EMPTY' and obj.name.startswith('_rootJoint'):
        bpy.data.objects.remove(obj, do_unlink=True)

# ── Export ───────────────────────────────────────────────────────────────────
export_path = os.path.join(project_dir, "public", "models", "avatars", "schoolboy_rigged.glb")
bpy.ops.export_scene.gltf(
    filepath=export_path,
    export_format='GLB',
    export_animations=False,
    export_image_format='AUTO',
    export_texcoords=True,
    export_normals=True,
    export_draco_mesh_compression_enable=False,
)
print(f"\nExported to: {export_path}")
