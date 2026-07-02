"""
01_base_rig.py - Create humanoid armature and skin mesh
Usage: blender --background --python 01_base_rig.py -- <input.glb> <output.blend>

Part of the FocusLily Realms character template system.
"""
import bpy
import sys
import os
from mathutils import Vector

# ── PARSE ARGS ────────────────────────────────────────────────────
argv = sys.argv
if "--" in argv:
    args = argv[argv.index("--") + 1:]
else:
    args = []

INPUT = args[0] if len(args) > 0 else r"C:\Users\taksh\Downloads\textured_mesh (1).glb"
OUTPUT = args[1] if len(args) > 1 else r"C:\Users\taksh\Downloads\textured_mesh_rigged.blend"
TARGET_HEIGHT = float(args[2]) if len(args) > 2 else 1.8

# ── BONE TEMPLATE ─────────────────────────────────────────────────
# Standard humanoid skeleton - positions are relative to Hips at (0,0,0.94)
# Adjust these for different body proportions
BONE_TEMPLATE = [
    # (name, head_xyz, tail_xyz, parent, connect)
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


def log(msg):
    print(f"[base_rig] {msg}")


def clean_scene():
    """Remove all objects except meshes."""
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)


def find_main_mesh():
    """Find the largest mesh in the scene."""
    best = None
    best_verts = 0
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and len(obj.data.vertices) > best_verts:
            best = obj
            best_verts = len(obj.data.vertices)
    return best


def prepare_mesh(mesh, target_height):
    """Center, scale, and ground the mesh."""
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    bbox = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
    min_z = min(v.z for v in bbox)
    max_z = max(v.z for v in bbox)
    height = max_z - min_z
    sf = target_height / height
    mesh.scale = (sf, sf, sf)
    mesh.location.z -= min_z * sf
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bbox = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
    mesh.location.x -= sum(v.x for v in bbox) / 8
    mesh.location.y -= sum(v.y for v in bbox) / 8
    mesh.location.z = 0
    mesh.name = "Character"
    log(f"Mesh prepared: height={height * sf:.2f}m")


def create_armature(bone_template):
    """Create humanoid armature from bone template."""
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm_obj = bpy.context.object
    arm_obj.name = "Armature"
    arm = arm_obj.data
    arm.name = "Armature"

    bpy.ops.armature.select_all(action='SELECT')
    bpy.ops.armature.delete()

    for bname, head, tail, parent, connect in bone_template:
        b = arm.edit_bones.new(bname)
        b.head = Vector(head)
        b.tail = Vector(tail)
        b.use_connect = connect
        if parent:
            b.parent = arm.edit_bones[parent]

    bpy.ops.object.mode_set(mode='OBJECT')
    log(f"Armature created: {len(arm.bones)} bones")
    return arm_obj


def skin_mesh(mesh, arm_obj):
    """Parent mesh to armature with envelope weights."""
    arm_obj.location = mesh.location.copy()
    mesh.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')

    has_mod = any(m.type == 'ARMATURE' for m in mesh.modifiers)
    log(f"Mesh skinned (armature modifier: {has_mod})")
    return has_mod


def save_blend(filepath):
    """Save as .blend file."""
    bpy.ops.wm.save_as_mainfile(filepath=filepath)
    log(f"Saved: {filepath}")


# ── MAIN ──────────────────────────────────────────────────────────
def main():
    log(f"Input: {INPUT}")
    log(f"Output: {OUTPUT}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=INPUT)

    clean_scene()
    mesh = find_main_mesh()
    if not mesh:
        raise RuntimeError("No mesh found in file")

    prepare_mesh(mesh, TARGET_HEIGHT)
    arm_obj = create_armature(BONE_TEMPLATE)
    skin_mesh(mesh, arm_obj)

    # Save as .blend for further editing
    if OUTPUT.endswith(".blend"):
        save_blend(OUTPUT)
    else:
        # Export as GLB
        bpy.ops.export_scene.gltf(
            filepath=OUTPUT,
            use_selection=False,
            export_format='GLB',
            export_animations=True,
            export_image_format='AUTO',
            export_yup=True,
        )
        log(f"Exported: {OUTPUT}")

    log("DONE - base rig complete")


if __name__ == "__main__":
    main()
