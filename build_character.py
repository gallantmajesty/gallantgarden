"""
Build a realistic male character IN BLENDER - step by step, visible in the viewport.
Run this from Blender's Text Editor (paste & click Run Script) or via command line.
"""
import bpy
import bmesh
import math
from mathutils import Vector, Euler

print("=" * 60)
print("STARTING CHARACTER BUILD...")
print("=" * 60)

# ── Step 1: Clear scene ──────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 48
scene.render.fps = 24

print("Scene cleared")

# ── Step 2: Create Materials ─────────────────────────────────────────────────
def make_mat(name, color, roughness=0.7):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_skin = make_mat("Skin", (0.88, 0.78, 0.7, 1), 0.65)
mat_hair = make_mat("Hair", (0.13, 0.1, 0.09, 1), 0.55)
mat_eye_white = make_mat("EyeWhite", (0.96, 0.95, 0.93, 1), 0.15)
mat_iris = make_mat("Iris", (0.35, 0.22, 0.13, 1), 0.12)
mat_pupil = make_mat("Pupil", (0.06, 0.04, 0.03, 1), 0.05)
mat_shirt = make_mat("Shirt", (0.2, 0.32, 0.48, 1), 0.82)
mat_pants = make_mat("Pants", (0.22, 0.26, 0.35, 1), 0.82)
mat_shoes = make_mat("Shoes", (0.9, 0.88, 0.84, 1), 0.5)
mat_shoe_sole = make_mat("ShoeSole", (0.15, 0.15, 0.15, 1), 0.9)
mat_lips = make_mat("Lips", (0.76, 0.44, 0.4, 1), 0.6)

print("Materials created")

# ── Step 3: Build Body Mesh ──────────────────────────────────────────────────
print("Building body mesh...")

# Body measurements (realistic 170cm male)
hips_y = 0.88
spine_h = 0.2
chest_h = 0.26
neck_len = 0.07
head_r = 0.12
neck_r = 0.062
torso_bottom = hips_y - 0.06
segments = 48  # high polygon count

mesh = bpy.data.meshes.new("BodyMesh")
obj = bpy.data.objects.new("MaleBody", mesh)
scene.collection.objects.link(obj)

bm = bmesh.new()

def ring(cx, cy, cz, rx, rz, n=segments):
    verts = []
    for i in range(n):
        angle = (i / n) * math.pi * 2
        x = cx + rx * math.cos(angle)
        z = cz + rz * math.sin(angle)
        verts.append(bm.verts.new((x, cy, z)))
    return verts

# Body profile - from feet to crown
chest_top = torso_bottom + spine_h + chest_h
neck_top = chest_top + neck_len
head_mid = neck_top + head_r * 0.5
head_top = neck_top + head_r * 1.3

rings_data = [
    (0.05, 0.048, 0.048),       # ankle
    (0.25, 0.055, 0.055),       # calf
    (0.46, 0.058, 0.058),       # knee
    (0.65, 0.078, 0.078),       # thigh
    (torso_bottom, 0.13, 0.115), # hips
    (torso_bottom + spine_h * 0.5, 0.125, 0.1), # waist
    (torso_bottom + spine_h + chest_h * 0.38, 0.15, 0.115), # chest
    (torso_bottom + spine_h + chest_h * 0.72, 0.19, 0.097), # shoulders
    (chest_top, 0.1, 0.1),       # neck base
    (chest_top + neck_len * 0.5, neck_r, neck_r), # neck mid
    (neck_top, head_r * 0.85, head_r * 0.8), # head base
    (head_mid, head_r, head_r * 0.95), # head widest
    (neck_top + head_r, head_r * 0.7, head_r * 0.65), # head top
    (head_top, head_r * 0.25, head_r * 0.25), # crown
]

all_rings = []
for (y, rx, rz) in rings_data:
    all_rings.append(ring(0, y, 0, rx, rz))

bm.verts.ensure_lookup_table()

# Connect rings with quad faces
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

# Subdivision surface for smoothness
mod = obj.modifiers.new("Subsurf", 'SUBSURF')
mod.levels = 2
mod.render_levels = 3

for poly in mesh.polygons:
    poly.use_smooth = True

obj.data.materials.append(mat_skin)
print(f"Body mesh: {len(mesh.vertices)} vertices")

# ── Step 4: Face Features ────────────────────────────────────────────────────
print("Adding face features...")

eye_y = neck_top + head_r * 0.48
eye_z = head_r * 0.6
eye_x = head_r * 0.36

for side in [-1, 1]:
    label = 'L' if side < 0 else 'R'
    
    # Eye white
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.018,
        location=(side * eye_x, eye_y, eye_z))
    ew = bpy.context.active_object
    ew.name = f"EyeWhite{label}"
    ew.scale = (1, 0.7, 1.2)
    ew.data.materials.append(mat_eye_white)
    bpy.ops.object.shade_smooth()
    
    # Iris
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.012,
        location=(side * eye_x, eye_y + 0.008, eye_z))
    iris = bpy.context.active_object
    iris.name = f"Iris{label}"
    iris.scale = (1, 0.6, 1)
    iris.data.materials.append(mat_iris)
    bpy.ops.object.shade_smooth()
    
    # Pupil
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.006,
        location=(side * eye_x, eye_y + 0.014, eye_z))
    pup = bpy.context.active_object
    pup.name = f"Pupil{label}"
    pup.scale = (1, 0.5, 1)
    pup.data.materials.append(mat_pupil)
    bpy.ops.object.shade_smooth()
    
    # Eyebrow
    bpy.ops.mesh.primitive_cube_add(size=1, location=(side * eye_x, eye_y - 0.005, eye_z + head_r * 0.2))
    brow = bpy.context.active_object
    brow.name = f"Eyebrow{label}"
    brow.scale = (0.02, 0.003, 0.003)
    brow.data.materials.append(mat_hair)
    
    # Ear
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.02,
        location=(side * head_r * 0.82, eye_y, eye_z - head_r * 0.05))
    ear = bpy.context.active_object
    ear.name = f"Ear{label}"
    ear.scale = (0.3, 0.7, 1)
    ear.data.materials.append(mat_skin)
    bpy.ops.object.shade_smooth()

# Nose
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.012,
    location=(0, eye_y - head_r * 0.22, eye_z + head_r * 0.12))
nose = bpy.context.active_object
nose.name = "Nose"
nose.scale = (0.8, 1.2, 0.7)
nose.data.materials.append(mat_skin)
bpy.ops.object.shade_smooth()

# Mouth
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.015,
    location=(0, eye_y - head_r * 0.35, eye_z + head_r * 0.03))
mouth = bpy.context.active_object
mouth.name = "Mouth"
mouth.scale = (1.2, 0.4, 0.5)
mouth.data.materials.append(mat_lips)
bpy.ops.object.shade_smooth()

# Hair
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=head_r * 1.05,
    location=(0, eye_y + head_r * 0.15, eye_z + head_r * 0.35))
scalp = bpy.context.active_object
scalp.name = "Hair"
scalp.scale = (1, 0.95, 0.9)
scalp.data.materials.append(mat_hair)
bpy.ops.object.shade_smooth()

print("Face features added")

# ── Step 5: Clothing ─────────────────────────────────────────────────────────
print("Adding clothing...")

# T-shirt
shirt_mesh = bpy.data.meshes.new("TshirtMesh")
shirt_obj = bpy.data.objects.new("Tshirt", shirt_mesh)
scene.collection.objects.link(shirt_obj)

sbm = bmesh.new()
shirt_rings_data = [
    (torso_bottom + 0.02, 0.135, 0.12),
    (torso_bottom + spine_h * 0.5, 0.13, 0.105),
    (torso_bottom + spine_h + chest_h * 0.38, 0.155, 0.12),
    (torso_bottom + spine_h + chest_h * 0.72, 0.195, 0.102),
    (chest_top, 0.105, 0.105),
]
shirt_rings = []
for (y, rx, rz) in shirt_rings_data:
    shirt_rings.append(ring(0, y, 0, rx, rz, segments))

sbm.verts.ensure_lookup_table()
for i in range(len(shirt_rings) - 1):
    r1 = shirt_rings[i]
    r2 = shirt_rings[i + 1]
    for j in range(segments):
        j2 = (j + 1) % segments
        try:
            sbm.faces.new([r1[j], r1[j2], r2[j2], r2[j]])
        except:
            pass

sbm.to_mesh(shirt_mesh)
sbm.free()
shirt_mesh.update()
shirt_obj.data.materials.append(mat_shirt)
mod = shirt_obj.modifiers.new("Subsurf", 'SUBSURF')
mod.levels = 1
mod.render_levels = 2
for poly in shirt_mesh.polygons:
    poly.use_smooth = True

# Pants legs
for side_label, x_off in [("L", -0.095), ("R", 0.095)]:
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.08, radius2=0.05,
        depth=0.82, location=(x_off, torso_bottom - 0.41, 0))
    leg = bpy.context.active_object
    leg.name = f"PantLeg{side_label}"
    leg.data.materials.append(mat_pants)
    bpy.ops.object.shade_smooth()

# Shoes
for side_label, x_off in [("L", -0.095), ("R", 0.095)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x_off, 0.12, 0.015))
    shoe = bpy.context.active_object
    shoe.name = f"Shoe{side_label}"
    shoe.scale = (0.055, 0.12, 0.035)
    shoe.data.materials.append(mat_shoes)
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x_off, 0.12, -0.005))
    sole = bpy.context.active_object
    sole.name = f"Sole{side_label}"
    sole.scale = (0.058, 0.125, 0.012)
    sole.data.materials.append(mat_shoe_sole)

print("Clothing added")

# ── Step 6: Join all meshes ──────────────────────────────────────────────────
print("Joining meshes...")
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name != "MaleBody":
        o.select_set(True)
bpy.ops.object.join()
body_obj = bpy.context.active_object
body_obj.name = "MaleCharacter"

# Apply modifiers
for mod in body_obj.modifiers:
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
    except:
        pass

print(f"Character mesh: {len(body_obj.data.vertices)} vertices")

# ── Step 7: Armature ─────────────────────────────────────────────────────────
print("Creating armature...")

bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm_obj = bpy.context.active_object
arm_obj.name = "Armature"
arm = arm_obj.data
arm.name = "Armature"

# Remove default bone
bpy.ops.armature.select_all(action='SELECT')
bpy.ops.armature.delete()

def add_bone(name, head, tail, parent=None, connect=False):
    bone = arm.edit_bones.new(name)
    bone.head = Vector(head)
    bone.tail = Vector(tail)
    if parent:
        bone.parent = arm.edit_bones[parent]
        bone.use_connect = connect
    return bone

# Build skeleton
add_bone("root", (0, 0, 0), (0, 0.05, 0))
add_bone("hips", (0, torso_bottom, 0), (0, torso_bottom + 0.05, 0), "root")
add_bone("spine", (0, torso_bottom + 0.05, 0), (0, torso_bottom + spine_h, 0), "hips")
add_bone("chest", (0, torso_bottom + spine_h, 0), (0, chest_top, 0), "spine")
add_bone("neck", (0, chest_top, 0), (0, neck_top, 0), "chest")
add_bone("head", (0, neck_top, 0), (0, neck_top + head_r * 2, 0), "neck")

shoulder_y = chest_top - chest_h * 0.14
for side, sign in [("L", -1), ("R", 1)]:
    sx = sign * 0.19
    add_bone(f"armUpper{side}", (sx, shoulder_y, 0), (sx, shoulder_y - 0.28, 0), "chest")
    add_bone(f"armLower{side}", (sx, shoulder_y - 0.28, 0), (sx, shoulder_y - 0.53, 0), f"armUpper{side}", True)

for side, sign in [("L", -1), ("R", 1)]:
    lx = sign * 0.095
    add_bone(f"legUpper{side}", (lx, torso_bottom - 0.06, 0), (lx, torso_bottom - 0.46, 0), "hips")
    add_bone(f"legLower{side}", (lx, torso_bottom - 0.46, 0), (lx, torso_bottom - 0.86, 0), f"legUpper{side}", True)
    add_bone(f"foot{side}", (lx, torso_bottom - 0.86, 0), (lx, torso_bottom - 0.84, 0.12), f"legLower{side}", True)

bpy.ops.object.mode_set(mode='OBJECT')
print(f"Armature: {len(arm.bones)} bones")

# ── Step 8: Parent mesh to armature ──────────────────────────────────────────
print("Binding mesh to armature...")
bpy.ops.object.select_all(action='DESELECT')
body_obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = body_obj
body_obj.parent = None
try:
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    print("Auto-weights applied successfully!")
except Exception as e:
    print(f"Auto-weights failed: {e}")
    mod = body_obj.modifiers.new("Armature", 'ARMATURE')
    mod.object = arm_obj
    bpy.ops.object.parent_set(type='OBJECT')

# ── Step 9: Animations ───────────────────────────────────────────────────────
print("Creating animations...")

if not arm_obj.animation_data:
    arm_obj.animation_data_create()

actions = {}
for name in ["Idle", "Walk", "Run", "Jump", "Sit"]:
    actions[name] = bpy.data.actions.new(name)

def key_bone(bone_name, frame, loc=None, rot=None):
    pb = arm_obj.pose.bones.get(bone_name)
    if not pb:
        return
    if loc:
        pb.location = Vector(loc)
        pb.keyframe_insert(data_path="location", frame=frame)
    if rot:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = Euler(rot)
        pb.keyframe_insert(data_path="rotation_euler", frame=frame)

# IDLE
arm_obj.animation_data.action = actions["Idle"]
for f in range(1, 49):
    t = f / 24
    b = math.sin(t * 1.4) * 0.015
    s = math.sin(t * 0.55) * 0.012
    h = math.sin(t * 0.4 + 1) * 0.05
    key_bone("chest", f, rot=(0.03 + b, 0, 0))
    key_bone("spine", f, rot=(0, 0, s))
    key_bone("hips", f, rot=(0, s * 0.018, -s * 0.018))
    key_bone("neck", f, rot=(-0.02, h, 0))
    key_bone("head", f, rot=(b, h * 0.9, 0))
    key_bone("armUpperL", f, rot=(0.08 + b * 0.5, 0, -0.06))
    key_bone("armUpperR", f, rot=(0.08 + b * 0.5, 0, 0.06))
    key_bone("armLowerL", f, rot=(0.15, 0, -0.04))
    key_bone("armLowerR", f, rot=(0.15, 0, 0.04))

# WALK
arm_obj.animation_data.action = actions["Walk"]
for f in range(1, 49):
    t = f / 24
    ph = t * 4.5
    s = math.sin(ph)
    c = math.cos(ph)
    ls = 0.45
    kb = 0.7
    aswing = 0.35
    lean = 0.1
    
    key_bone("hips", f, rot=(lean * 0.4, 0, 0))
    key_bone("spine", f, rot=(lean * 0.5, 0, 0))
    key_bone("chest", f, rot=(lean * 0.3, -s * 0.05, 0))
    key_bone("head", f, rot=(-lean * 0.2, s * 0.025, 0))
    key_bone("legUpperL", f, rot=(s * ls, 0, 0))
    key_bone("legUpperR", f, rot=(-s * ls, 0, 0))
    key_bone("legLowerL", f, rot=(max(0, -c) * kb, 0, 0))
    key_bone("legLowerR", f, rot=(max(0, c) * kb, 0, 0))
    key_bone("footL", f, rot=(-s * ls * 0.4, 0, 0))
    key_bone("footR", f, rot=(s * ls * 0.4, 0, 0))
    key_bone("armUpperL", f, rot=(-s * aswing, 0, 0.07))
    key_bone("armUpperR", f, rot=(s * aswing, 0, -0.07))
    key_bone("armLowerL", f, rot=(0.25 + max(0, -s) * 0.18, 0, 0.05))
    key_bone("armLowerR", f, rot=(0.25 + max(0, s) * 0.18, 0, -0.05))

# RUN
arm_obj.animation_data.action = actions["Run"]
for f in range(1, 49):
    t = f / 24
    ph = t * 7
    s = math.sin(ph)
    c = math.cos(ph)
    ls = 0.75
    kb = 1.1
    aswing = 0.55
    lean = 0.22
    
    key_bone("hips", f, rot=(lean * 0.4, 0, 0))
    key_bone("spine", f, rot=(lean * 0.5, 0, 0))
    key_bone("chest", f, rot=(lean * 0.3, -s * 0.06, 0))
    key_bone("head", f, rot=(-lean * 0.2, s * 0.03, 0))
    key_bone("legUpperL", f, rot=(s * ls, 0, 0))
    key_bone("legUpperR", f, rot=(-s * ls, 0, 0))
    key_bone("legLowerL", f, rot=(max(0, -c) * kb, 0, 0))
    key_bone("legLowerR", f, rot=(max(0, c) * kb, 0, 0))
    key_bone("footL", f, rot=(-s * ls * 0.4, 0, 0))
    key_bone("footR", f, rot=(s * ls * 0.4, 0, 0))
    key_bone("armUpperL", f, rot=(-s * aswing, 0, 0.1))
    key_bone("armUpperR", f, rot=(s * aswing, 0, -0.1))
    key_bone("armLowerL", f, rot=(0.35 + max(0, -s) * 0.22, 0, 0.06))
    key_bone("armLowerR", f, rot=(0.35 + max(0, s) * 0.22, 0, -0.06))

# JUMP
arm_obj.animation_data.action = actions["Jump"]
for f in range(1, 49):
    if f <= 16:
        p = f / 16
        key_bone("hips", f, loc=(0, -0.06 * p, 0))
        key_bone("legUpperL", f, rot=(0.3 * p, 0, 0))
        key_bone("legUpperR", f, rot=(0.3 * p, 0, 0))
        key_bone("legLowerL", f, rot=(0.6 * p, 0, 0))
        key_bone("legLowerR", f, rot=(0.6 * p, 0, 0))
        key_bone("armUpperL", f, rot=(0.3 * p, 0, -0.1))
        key_bone("armUpperR", f, rot=(0.3 * p, 0, 0.1))
    elif f <= 32:
        p = (f - 16) / 16
        up = math.sin(p * math.pi)
        key_bone("hips", f, loc=(0, up * 0.3, 0))
        key_bone("legUpperL", f, rot=(-0.5 * up, 0, 0))
        key_bone("legUpperR", f, rot=(-0.3 * up, 0, 0))
        key_bone("legLowerL", f, rot=(0.6 * up, 0, 0))
        key_bone("legLowerR", f, rot=(0.4 * up, 0, 0))
        key_bone("armUpperL", f, rot=(-1.0 * up, 0, 0.15))
        key_bone("armUpperR", f, rot=(-1.0 * up, 0, -0.15))
        key_bone("armLowerL", f, rot=(0.6 * up, 0, 0))
        key_bone("armLowerR", f, rot=(0.6 * up, 0, 0))
    else:
        p = (f - 32) / 16
        sq = (1 - p) * 0.8
        key_bone("hips", f, loc=(0, sq * 0.05, 0))
        key_bone("legUpperL", f, rot=(0.4 * sq, 0, 0))
        key_bone("legUpperR", f, rot=(0.4 * sq, 0, 0))
        key_bone("legLowerL", f, rot=(0.8 * sq, 0, 0))
        key_bone("legLowerR", f, rot=(0.8 * sq, 0, 0))

# SIT
arm_obj.animation_data.action = actions["Sit"]
for f in range(1, 49):
    t = f / 24
    b = math.sin(t * 1.2) * 0.015
    key_bone("hips", f, loc=(0, -0.26, 0), rot=(0.06, 0, 0))
    key_bone("spine", f, rot=(0.03, 0, 0))
    key_bone("chest", f, rot=(0.03 + b, 0, 0))
    key_bone("head", f, rot=(-0.06, b * 2, 0))
    key_bone("legUpperL", f, rot=(-1.48, 0, 0.05))
    key_bone("legUpperR", f, rot=(-1.48, 0, -0.05))
    key_bone("legLowerL", f, rot=(1.55, 0, 0))
    key_bone("legLowerR", f, rot=(1.55, 0, 0))
    key_bone("footL", f, rot=(0.18, 0, 0))
    key_bone("footR", f, rot=(0.18, 0, 0))
    key_bone("armUpperL", f, rot=(0.15, 0, -0.08))
    key_bone("armUpperR", f, rot=(0.15, 0, 0.08))
    key_bone("armLowerL", f, rot=(1.1, 0, 0.1))
    key_bone("armLowerR", f, rot=(1.1, 0, -0.1))

# Set idle as default
arm_obj.animation_data.action = actions["Idle"]
scene.frame_set(1)

print("Animations created: Idle, Walk, Run, Jump, Sit")

# ── Step 10: Final Export ────────────────────────────────────────────────────
import os
export_dir = r"C:\Users\taksh\studyforest\public\models\avatars"
os.makedirs(export_dir, exist_ok=True)
export_path = os.path.join(export_dir, "base.glb")

bpy.ops.object.select_all(action='DESELECT')
body_obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj

bpy.ops.export_scene.gltf(
    filepath=export_path,
    use_selection=True,
    export_format='GLB',
    export_animations=True,
    export_nla_strips=False,
    export_yup=True,
)

print("=" * 60)
print(f"CHARACTER COMPLETE!")
print(f"Vertices: {len(body_obj.data.vertices)}")
print(f"Bones: {len(arm.bones)}")
print(f"Exported to: {export_path}")
print(f"File size: {os.path.getsize(export_path) / 1024 / 1024:.1f} MB")
print("=" * 60)
