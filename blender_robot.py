"""
Blender Python script: Create a Sci-Fi Robot character with a black outfit
and glowing blue sci-fi accent lines on the suit.
Run: blender.exe --background --python blender_robot.py
"""
import bpy
import bmesh
import math
from mathutils import Vector, Euler

# ── Reset scene ──────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 240
scene.render.fps = 24

# ── Materials ────────────────────────────────────────────────────────────────
def make_mat(name, color, roughness=0.7, metalness=0.0, emissive=(0, 0, 0), emissive_strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metalness
    if emissive != (0, 0, 0):
        bsdf.inputs["Emission"].default_value = emissive
        bsdf.inputs["Emission Strength"].default_value = emissive_strength
    return mat

# Robot materials
mat_robot_dark = make_mat("RobotDark", (0.03, 0.03, 0.045, 1), roughness=0.35, metalness=0.9)
mat_robot_metal = make_mat("RobotMetal", (0.18, 0.19, 0.22, 1), roughness=0.25, metalness=0.95)
mat_robot_joint = make_mat("RobotJoint", (0.30, 0.31, 0.34, 1), roughness=0.15, metalness=1.0)
mat_robot_black = make_mat("RobotBlack", (0.02, 0.02, 0.03, 1), roughness=0.5, metalness=0.6)
# Glowing blue sci-fi accents
mat_blue_glow = make_mat("RobotBlueGlow", (0.05, 0.25, 0.9, 1), roughness=0.2,
                         metalness=0.0, emissive=(0.15, 0.55, 1.0), emissive_strength=3.5)
mat_blue_core = make_mat("RobotBlueCore", (0.6, 0.85, 1.0, 1), roughness=0.1,
                         metalness=0.0, emissive=(0.4, 0.85, 1.0), emissive_strength=5.0)
mat_eye_glow = make_mat("RobotEyeGlow", (0.7, 0.9, 1.0, 1), roughness=0.1,
                        metalness=0.0, emissive=(0.5, 0.9, 1.0), emissive_strength=6.0)

# ── Helper functions ──────────────────────────────────────────────────────────
def add_sphere(name, location, radius, segments=48, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=segments // 2,
        radius=radius, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def add_cylinder(name, location, radius_top, radius_bottom, depth, vertices=32, mat=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=radius_top, radius2=radius_bottom,
        depth=depth, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def add_cube(name, location, scale, mat=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    if mat:
        obj.data.materials.append(mat)
    return obj

# ── Body dimensions (realistic proportions, ~170cm) ──────────────────────────
head_r = 0.12
neck_r = 0.06
neck_len = 0.07
chest_w = 0.15
chest_d = 0.115
chest_h = 0.26
waist_w = 0.125
hip_w = 0.13
hip_d = 0.115
shoulder_w = 0.19
spine_h = 0.2
hips_y = 0.88
torso_bottom = hips_y - 0.06

# ── Build body mesh (single joined mesh for the whole body) ──────────────────
def create_body_mesh():
    mesh = bpy.data.meshes.new("BodyMesh")
    obj = bpy.data.objects.new("Body", mesh)
    scene.collection.objects.link(obj)

    bm = bmesh.new()
    segments = 32

    def ring(cx, cy, cz, rx, ry, rz, n=segments):
        verts = []
        for i in range(n):
            angle = (i / n) * math.pi * 2
            x = cx + rx * math.cos(angle)
            y = cy
            z = cz + rz * math.sin(angle)
            verts.append(bm.verts.new((x, y, z)))
        return verts

    rings_data = [
        (0.046, 0.048, 0.048),
        (0.25, 0.055, 0.055),
        (0.46, 0.058, 0.058),
        (0.65, 0.078, 0.078),
        (torso_bottom, hip_w, hip_d),
        (torso_bottom + spine_h * 0.5, waist_w, hip_d * 0.86),
        (torso_bottom + spine_h + chest_h * 0.38, chest_w, chest_d),
        (torso_bottom + spine_h + chest_h * 0.72, shoulder_w, chest_d * 0.84),
        (torso_bottom + spine_h + chest_h * 0.84, neck_r * 1.6, neck_r * 1.6),
        (hips_y + spine_h + chest_h + neck_len * 0.5, neck_r, neck_r),
        (hips_y + spine_h + chest_h + neck_len, head_r * 0.85, head_r * 0.8),
        (hips_y + spine_h + chest_h + neck_len + head_r * 0.5, head_r, head_r * 0.95),
        (hips_y + spine_h + chest_h + neck_len + head_r, head_r * 0.7, head_r * 0.65),
        (hips_y + spine_h + chest_h + neck_len + head_r * 1.3, head_r * 0.3, head_r * 0.3),
    ]

    all_rings = []
    for (y, rx, rz) in rings_data:
        r = ring(0, y, 0, rx, rz, rx)
        all_rings.append(r)

    bm.verts.ensure_lookup_table()

    for i in range(len(all_rings) - 1):
        r1 = all_rings[i]
        r2 = all_rings[i + 1]
        n = len(r1)
        for j in range(n):
            j2 = (j + 1) % n
            try:
                bm.faces.new([r1[j], r1[j2], r2[j2], r2[j]])
            except:
                pass

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    mod = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod.levels = 2
    mod.render_levels = 3

    for poly in mesh.polygons:
        poly.use_smooth = True

    return obj

body = create_body_mesh()
body.data.materials.append(mat_robot_dark)
body.name = "RobotBody"

# ── Robot Head / Visor ───────────────────────────────────────────────────────
head_y = hips_y + spine_h + chest_h + neck_len + head_r * 0.5
head_z = head_r * 0.6

# Black metal helmet shell (covers the head sphere)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=head_r * 1.12,
    location=(0, head_y, head_z))
helmet = bpy.context.active_object
helmet.name = "RobotHelmet"
helmet.scale = (1, 1.02, 0.95)
helmet.data.materials.append(mat_robot_metal)
bpy.ops.object.shade_smooth()

# Glowing blue visor band across the eyes
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=head_r * 1.0,
    location=(0, head_y + head_r * 0.02, head_z + head_r * 0.05))
visor = bpy.context.active_object
visor.name = "RobotVisor"
visor.scale = (1.05, 0.32, 0.78)
visor.data.materials.append(mat_eye_glow)
bpy.ops.object.shade_smooth()

# Two bright eye dots inside the visor
for side in [-1, 1]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.022,
        location=(side * head_r * 0.42, head_y + head_r * 0.02, head_z + head_r * 0.62))
    eye = bpy.context.active_object
    eye.name = f"RobotEye{'L' if side < 0 else 'R'}"
    eye.data.materials.append(mat_eye_glow)
    bpy.ops.object.shade_smooth()

# Antenna with glowing tip — sits on top of the head, pointing up (Z axis)
antenna_base_z = head_z + head_r * 1.0
antenna_len = 0.10
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.006, depth=antenna_len,
    location=(0, head_y, antenna_base_z + antenna_len / 2))
antenna = bpy.context.active_object
antenna.name = "RobotAntenna"
antenna.data.materials.append(mat_robot_joint)

bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.018,
    location=(0, head_y, antenna_base_z + antenna_len + 0.018))
antenna_tip = bpy.context.active_object
antenna_tip.name = "RobotAntennaTip"
antenna_tip.data.materials.append(mat_blue_glow)
bpy.ops.object.shade_smooth()

# Neck collar (metal ring)
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=head_r * 0.75, depth=0.06,
    location=(0, head_y - head_r * 0.85, head_z * 0.2))
collar = bpy.context.active_object
collar.name = "RobotCollar"
collar.rotation_euler = (math.pi / 2, 0, 0)
collar.data.materials.append(mat_robot_joint)

# ── Robot Torso Suit ─────────────────────────────────────────────────────────
def create_torso_suit():
    mesh = bpy.data.meshes.new("TorsoSuitMesh")
    obj = bpy.data.objects.new("TorsoSuit", mesh)
    scene.collection.objects.link(obj)

    bm = bmesh.new()
    segments = 32

    def ring(cx, cy, cz, rx, ry, rz, n=segments):
        verts = []
        for i in range(n):
            angle = (i / n) * math.pi * 2
            x = cx + rx * math.cos(angle)
            y = cy
            z = cz + rz * math.sin(angle)
            verts.append(bm.verts.new((x, y, z)))
        return verts

    suit_bottom = torso_bottom + 0.02
    suit_top = torso_bottom + spine_h + chest_h * 0.82

    rings_data = [
        (suit_bottom, hip_w + 0.012, hip_d + 0.012),
        (suit_bottom + spine_h * 0.3, waist_w + 0.012, hip_d * 0.86 + 0.012),
        (suit_bottom + spine_h + chest_h * 0.2, chest_w + 0.012, chest_d + 0.012),
        (suit_bottom + spine_h + chest_h * 0.6, shoulder_w + 0.012, chest_d * 0.84 + 0.012),
        (suit_top, neck_r * 1.6 + 0.012, neck_r * 1.6 + 0.012),
    ]

    all_rings = []
    for (y, rx, rz) in rings_data:
        r = ring(0, y, 0, rx, rz, rx)
        all_rings.append(r)

    bm.verts.ensure_lookup_table()

    for i in range(len(all_rings) - 1):
        r1 = all_rings[i]
        r2 = all_rings[i + 1]
        n = len(r1)
        for j in range(n):
            j2 = (j + 1) % n
            try:
                bm.faces.new([r1[j], r1[j2], r2[j2], r2[j]])
            except:
                pass

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    mod = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod.levels = 1
    mod.render_levels = 2

    for poly in mesh.polygons:
        poly.use_smooth = True

    return obj

suit = create_torso_suit()
suit.data.materials.append(mat_robot_black)
suit.name = "RobotTorsoSuit"

# Glowing blue chest core (reactor)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.045, depth=0.03,
    location=(0, torso_bottom + spine_h + chest_h * 0.55, chest_d + 0.02))
core = bpy.context.active_object
core.name = "RobotChestCore"
core.rotation_euler = (math.pi / 2, 0, 0)
core.data.materials.append(mat_blue_core)

# Inner bright core disc
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.022, depth=0.035,
    location=(0, torso_bottom + spine_h + chest_h * 0.55, chest_d + 0.03))
core_inner = bpy.context.active_object
core_inner.name = "RobotChestCoreInner"
core_inner.rotation_euler = (math.pi / 2, 0, 0)
core_inner.data.materials.append(mat_eye_glow)

# Blue sci-fi accent lines on the torso (thin vertical + diagonal strips)
def add_torso_line(loc, scale, rot=(0, 0, 0), mat=mat_blue_glow):
    return add_cube("RobotTorsoLine", loc, scale, mat, rot)

# Central vertical line (between core and waist)
add_torso_line((0, torso_bottom + spine_h * 0.5, chest_d + 0.022), (0.008, 0.06, 0.012))
# Diagonal shoulder lines
add_torso_line((0.05, torso_bottom + spine_h + chest_h * 0.7, chest_d * 0.6), (0.07, 0.01, 0.012), (0, 0, -0.6))
add_torso_line((-0.05, torso_bottom + spine_h + chest_h * 0.7, chest_d * 0.6), (0.07, 0.01, 0.012), (0, 0, 0.6))

# ── Shoulder pauldrons (metal, blue trim) ────────────────────────────────────
for side, x_sign in [("L", -1), ("R", 1)]:
    shoulder_x = x_sign * shoulder_w * 0.95
    shoulder_y = torso_bottom + spine_h + chest_h * 0.72

    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.085, radius2=0.05,
        depth=0.14, location=(shoulder_x, shoulder_y, 0))
    pauldron = bpy.context.active_object
    pauldron.name = f"RobotPauldron{side}"
    pauldron.scale = (1, 1, 1.1)
    pauldron.data.materials.append(mat_robot_metal)
    bpy.ops.object.shade_smooth()

    # Blue trim ring around the pauldron
    bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.01,
        location=(shoulder_x, shoulder_y - 0.06, 0))
    trim = bpy.context.active_object
    trim.name = f"RobotPauldronTrim{side}"
    trim.rotation_euler = (math.pi / 2, 0, 0)
    trim.scale = (1, 1, 1.1)
    trim.data.materials.append(mat_blue_glow)

# ── Arms (black suit, blue forearm line) ─────────────────────────────────────
shoulder_y = torso_bottom + spine_h + chest_h * 0.86
arm_len = 0.28
forearm_len = 0.25

for side, x_sign in [("L", -1), ("R", 1)]:
    sx = x_sign * shoulder_w * 0.95
    # Upper arm (black suit)
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.05, radius2=0.043,
        depth=arm_len, location=(sx, shoulder_y - arm_len / 2, 0))
    upper = bpy.context.active_object
    upper.name = f"RobotArmUpper{side}"
    upper.data.materials.append(mat_robot_black)
    bpy.ops.object.shade_smooth()

    # Elbow joint
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.04, depth=0.05,
        location=(sx, shoulder_y - arm_len, 0))
    elbow = bpy.context.active_object
    elbow.name = f"RobotElbow{side}"
    elbow.rotation_euler = (math.pi / 2, 0, 0)
    elbow.data.materials.append(mat_robot_joint)

    # Forearm (black suit) with a glowing blue line
    forearm_y = shoulder_y - arm_len - forearm_len / 2
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.043, radius2=0.035,
        depth=forearm_len, location=(sx, forearm_y, 0))
    lower = bpy.context.active_object
    lower.name = f"RobotArmLower{side}"
    lower.data.materials.append(mat_robot_black)
    bpy.ops.object.shade_smooth()

    # Blue line running along the forearm
    bpy.ops.mesh.primitive_cube_add(size=1,
        location=(sx, forearm_y, 0.04),
        rotation=(0, 0, 0))
    arm_line = bpy.context.active_object
    arm_line.name = f"RobotArmLine{side}"
    arm_line.scale = (0.01, forearm_len * 0.8, 0.01)
    arm_line.data.materials.append(mat_blue_glow)

    # Block hand (no fingers)
    hand_y = shoulder_y - arm_len - forearm_len
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, hand_y, 0))
    hand = bpy.context.active_object
    hand.name = f"RobotHand{side}"
    hand.scale = (0.05, 0.06, 0.05)
    hand.data.materials.append(mat_robot_metal)

# ── Legs (black suit, glowing knee joints, blue calf line) ───────────────────
for side, x_off in [("L", -hip_w), ("R", hip_w)]:
    # Upper leg
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.08, radius2=0.065,
        depth=0.40, location=(x_off, torso_bottom - 0.26, 0))
    leg_upper = bpy.context.active_object
    leg_upper.name = f"RobotLegUpper{side}"
    leg_upper.data.materials.append(mat_robot_black)
    bpy.ops.object.shade_smooth()

    # Knee joint (glowing)
    knee_y = torso_bottom - 0.46
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.055, depth=0.06,
        location=(x_off, knee_y, 0))
    knee = bpy.context.active_object
    knee.name = f"RobotKnee{side}"
    knee.rotation_euler = (math.pi / 2, 0, 0)
    knee.data.materials.append(mat_blue_glow)

    # Lower leg
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.065, radius2=0.05,
        depth=0.40, location=(x_off, torso_bottom - 0.66, 0))
    leg_lower = bpy.context.active_object
    leg_lower.name = f"RobotLegLower{side}"
    leg_lower.data.materials.append(mat_robot_black)
    bpy.ops.object.shade_smooth()

    # Blue line on the calf
    bpy.ops.mesh.primitive_cube_add(size=1,
        location=(x_off, torso_bottom - 0.66, 0.055))
    calf_line = bpy.context.active_object
    calf_line.name = f"RobotCalfLine{side}"
    calf_line.scale = (0.012, 0.3, 0.012)
    calf_line.data.materials.append(mat_blue_glow)

    # Foot / boot (black metal) with glowing blue sole
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x_off, 0.1, 0.02))
    boot = bpy.context.active_object
    boot.name = f"RobotBoot{side}"
    boot.scale = (0.07, 0.11, 0.13)
    boot.data.materials.append(mat_robot_metal)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(x_off, 0.05, 0.02))
    sole = bpy.context.active_object
    sole.name = f"RobotBootSole{side}"
    sole.scale = (0.075, 0.02, 0.14)
    sole.data.materials.append(mat_blue_glow)

# ── Join all mesh parts into one object ──────────────────────────────────────
body_obj = bpy.data.objects["RobotBody"]
bpy.context.view_layer.objects.active = body_obj
body_obj.select_set(True)

for obj in bpy.data.objects:
    if obj.type == 'MESH' and obj.name != "RobotBody":
        obj.select_set(True)

bpy.ops.object.join()
body_obj = bpy.context.active_object
body_obj.name = "RobotCharacter"

# Apply all modifiers
bpy.context.view_layer.objects.active = body_obj
for mod in body_obj.modifiers:
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
    except:
        pass

# ── Armature (same as base model) ────────────────────────────────────────────
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
armature_obj = bpy.context.active_object
armature_obj.name = "Armature"
armature = armature_obj.data
armature.name = "Armature"

bpy.ops.armature.select_all(action='SELECT')
bpy.ops.armature.delete()

def add_bone(name, head, tail, parent=None, connect=False):
    bone = armature.edit_bones.new(name)
    bone.head = Vector(head)
    bone.tail = Vector(tail)
    if parent:
        bone.parent = armature.edit_bones[parent]
        bone.use_connect = connect
    return bone

add_bone("root", (0, 0, 0), (0, 0.05, 0))

add_bone("hips", (0, torso_bottom, 0), (0, torso_bottom + 0.05, 0), "root")

add_bone("spine", (0, torso_bottom + 0.05, 0), (0, torso_bottom + spine_h, 0), "hips")

chest_top = torso_bottom + spine_h + chest_h
add_bone("chest", (0, torso_bottom + spine_h, 0), (0, chest_top, 0), "spine")

neck_top = chest_top + neck_len
add_bone("neck", (0, chest_top, 0), (0, neck_top, 0), "chest")

head_top = neck_top + head_r * 2
add_bone("head", (0, neck_top, 0), (0, head_top, 0), "neck")

shoulder_y = chest_top - chest_h * 0.14
arm_len = 0.28
forearm_len = 0.25
hand_len = 0.14

for side, x_sign in [("L", -1), ("R", 1)]:
    sx = x_sign * shoulder_w
    add_bone(f"armUpper{side}", (sx, shoulder_y, 0), (sx, shoulder_y - arm_len, 0), "chest")
    add_bone(f"armLower{side}", (sx, shoulder_y - arm_len, 0), (sx, shoulder_y - arm_len - forearm_len, 0), f"armUpper{side}", True)

for side, x_sign in [("L", -1), ("R", 1)]:
    lx = x_sign * hip_w
    upper_leg = 0.40
    lower_leg = 0.40
    add_bone(f"legUpper{side}", (lx, torso_bottom - 0.06, 0), (lx, torso_bottom - 0.06 - upper_leg, 0), "hips")
    knee_y = torso_bottom - 0.06 - upper_leg
    add_bone(f"legLower{side}", (lx, knee_y, 0), (lx, knee_y - lower_leg, 0), f"legUpper{side}", True)
    foot_y = knee_y - lower_leg
    add_bone(f"foot{side}", (lx, foot_y, 0), (lx, foot_y + 0.02, 0.12), f"legLower{side}", True)

bpy.ops.object.mode_set(mode='OBJECT')

# ── Parent mesh to armature with armature modifier ───────────────────────────
body_obj.select_set(True)
armature_obj.select_set(True)
bpy.context.view_layer.objects.active = armature_obj

bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
body_obj.select_set(True)
armature_obj.select_set(True)
bpy.context.view_layer.objects.active = body_obj

body_obj.parent = None

try:
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    print("Successfully parented with auto weights")
except Exception as e:
    print(f"Auto weights failed: {e}, trying empty groups")
    body_obj.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = body_obj
    mod = body_obj.modifiers.new("Armature", 'ARMATURE')
    mod.object = armature_obj
    bpy.ops.object.parent_set(type='OBJECT')

# ── Export as GLB ────────────────────────────────────────────────────────────
import os
export_path = os.path.join(os.path.dirname(bpy.data.filepath) or r"C:\Users\taksh\studyforest\public\models", "avatars", "robot.glb")

os.makedirs(os.path.dirname(export_path), exist_ok=True)

bpy.ops.object.select_all(action='DESELECT')
body_obj.select_set(True)
armature_obj.select_set(True)
bpy.context.view_layer.objects.active = armature_obj

bpy.ops.export_scene.gltf(
    filepath=export_path,
    use_selection=True,
    export_format='GLB',
    export_animations=True,
    export_nla_strips=False,
    export_yup=True,
)

print(f"\n=== EXPORTED to {export_path} ===")
print(f"Body vertices: {len(body_obj.data.vertices)}")
print(f"Armature bones: {len(armature.bones)}")
if armature_obj.animation_data:
    print(f"Animation action: {armature_obj.animation_data.action.name if armature_obj.animation_data.action else 'none'}")
print("=== ROBOT CHARACTER CREATED SUCCESSFULLY ===")
