"""
Build a chibi shark character IN BLENDER (bipedal cartoon shark with fins as arms).
Same armature + animation conventions as build_character.py so the procedural
animation system drives it automatically. Exports to public/models/avatars/shark.glb
"""
import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

print("=" * 60)
print("STARTING SHARK BUILD...")
print("=" * 60)

# ── Step 1: Clear scene ──────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 48
scene.render.fps = 24

# ── Step 2: Materials ─────────────────────────────────────────────────────────
def make_mat(name, color, roughness=0.7):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_body   = make_mat("SharkGrey",  (0.45, 0.52, 0.58, 1), 0.65)
mat_belly  = make_mat("SharkBelly", (0.95, 0.95, 0.93, 1), 0.7)
mat_eye    = make_mat("Eye",        (0.06, 0.06, 0.07, 1), 0.1)
mat_white  = make_mat("Tooth",      (0.98, 0.98, 0.96, 1), 0.3)
mat_mouth  = make_mat("Mouth",      (0.32, 0.10, 0.12, 1), 0.8)
mat_fin    = make_mat("Fin",        (0.38, 0.45, 0.52, 1), 0.7)

# ── Step 3: Body measurements (match build_character armature) ───────────────
hips_y = 0.88
spine_h = 0.2
chest_h = 0.26
neck_len = 0.07
head_r = 0.12
torso_bottom = hips_y - 0.06
chest_top = torso_bottom + spine_h + chest_h        # 1.28
neck_top = chest_top + neck_len                      # 1.35
head_mid = neck_top + head_r * 0.5
head_top = neck_top + head_r * 1.3                   # ~1.506
shoulder_y = chest_top - chest_h * 0.14             # ~1.244

# ── Step 4: Build mesh pieces (each assigned to a bone vertex group) ─────────
# We build each part as its own object, give it a vertex group named after the
# bone that should drive it, then join everything and bind to the armature with
# an Armature modifier (clean, no auto-weight needed).

parts = []  # list of bpy mesh objects

def new_part(name):
    mesh = bpy.data.meshes.new(name + "Mesh")
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    parts.append(obj)
    return obj

def bind_bone(obj, bone_name):
    vg = obj.vertex_groups.new(name=bone_name)
    with bpy.context.temp_override(object=obj):
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.object.vertex_group_assign()
        bpy.ops.object.mode_set(mode='OBJECT')

def ring(cx, cy, cz, rx, rz, n=32):
    verts = []
    for i in range(n):
        a = (i / n) * math.pi * 2
        verts.append((cx + rx * math.cos(a), cy, cz + rz * math.sin(a)))
    return verts

def lathe(points, n=32, twist=0.0):
    """Build a lathe/surface-of-revolution mesh from (y, rx, rz) profile rings."""
    bm = bmesh.new()
    all_rings = []
    for (y, rx, rz) in points:
        ringv = []
        for i in range(n):
            a = (i / n) * math.pi * 2
            x = rx * math.cos(a)
            z = rz * math.sin(a)
            ringv.append(bm.verts.new((x, y, z)))
        all_rings.append(ringv)
    bm.verts.ensure_lookup_table()
    for i in range(len(all_rings) - 1):
        r1, r2 = all_rings[i], all_rings[i + 1]
        for j in range(n):
            j2 = (j + 1) % n
            try:
                bm.faces.new([r1[j], r1[j2], r2[j2], r2[j]])
            except:
                pass
    return bm

# ── HEAD (big chibi shark head, snout forward +Z) ────────────────────────────
print("Building shark head...")
head = new_part("SharkHead")
bm = lathe([
    (neck_top + 0.01, 0.05, 0.05),
    (neck_top + 0.06, 0.13, 0.13),
    (head_mid - 0.02, 0.15, 0.15),
    (head_mid + 0.04, 0.16, 0.16),      # widest (cheeks)
    (head_top - 0.06, 0.13, 0.13),
    (head_top - 0.01, 0.07, 0.07),
    (head_top + 0.02, 0.02, 0.02),
], n=32)
# snout: extend a tapered block forward along +Z
snout = ring(0, head_mid + 0.02, 0.14, 0.10, 0.10, 24)
snout2 = ring(0, head_mid - 0.01, 0.20, 0.07, 0.07, 24)
for r1, r2 in [(snout, snout2)]:
    for j in range(24):
        j2 = (j + 1) % 24
        try:
            bm.faces.new([r1[j], r1[j2], r2[j2], r2[j]])
        except:
            pass
bm.to_mesh(head.data); bm.free()
head.data.materials.append(mat_body)
for poly in head.data.polygons:
    poly.use_smooth = True
bind_bone(head, "head")

# Belly patch on head (lighter underside)
belly = new_part("SharkHeadBelly")
bbm = lathe([
    (head_mid - 0.02, 0.14, 0.04),
    (head_mid + 0.02, 0.15, 0.05),
    (head_top - 0.04, 0.10, 0.04),
], n=24)
bbm.to_mesh(belly.data); bbm.free()
belly.data.materials.append(mat_belly)
belly.scale = (1, 1, 0.9)
bind_bone(belly, "head")

# Eyes
for side, sign in [("L", -1), ("R", 1)]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.026,
        location=(sign * 0.07, head_mid + 0.03, 0.12))
    eye = bpy.context.active_object
    eye.name = f"SharkEye{side}"
    eye.data.materials.append(mat_eye)
    bpy.ops.object.shade_smooth()
    # assign to head bone
    vg = eye.vertex_groups.new(name="head")
    with bpy.context.temp_override(object=eye):
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.object.vertex_group_assign()
        bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(eye)

# Mouth (dark slit) + teeth
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.028,
    location=(0, head_mid - 0.04, 0.14))
mouth = bpy.context.active_object
mouth.name = "SharkMouth"
mouth.scale = (1.1, 0.35, 0.6)
mouth.data.materials.append(mat_mouth)
bpy.ops.object.shade_smooth()
vg = mouth.vertex_groups.new(name="head")
with bpy.context.temp_override(object=mouth):
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.object.vertex_group_assign()
    bpy.ops.object.mode_set(mode='OBJECT')
parts.append(mouth)

for side, sign in [("L", -1), ("R", 1)]:
    for k in range(3):
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.012, radius2=0,
            depth=0.03, location=(sign * (0.03 + k * 0.02 * sign * -1 + 0.0),
            head_mid - 0.06, 0.16 - k * 0.0))
        tooth = bpy.context.active_object
        tooth.name = f"Tooth{side}{k}"
        tooth.scale = (1, 1, 0.6)
        tooth.data.materials.append(mat_white)
        vg = tooth.vertex_groups.new(name="head")
        with bpy.context.temp_override(object=tooth):
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.object.vertex_group_assign()
            bpy.ops.object.mode_set(mode='OBJECT')
        parts.append(tooth)

# Dorsal fin (on back, attaches to chest/spine)
fin = new_part("SharkDorsal")
fbm = bmesh.new()
# triangular fin pointing up and back (-Z is back)
base = ring(0, chest_top - 0.02, -0.04, 0.10, 0.02, 16)
tipv = fbm.verts.new((0, chest_top + 0.18, -0.14))
for v in base:
    fbm.verts.new(v)
fbm.verts.ensure_lookup_table()
for j in range(16):
    j2 = (j + 1) % 16
    try:
        fbm.faces.new([base[j], base[j2], tipv])
    except:
        pass
fbm.to_mesh(fin.data); fbm.free()
fin.data.materials.append(mat_fin)
bind_bone(fin, "chest")

# ── NECK ────────────────────────────────────────────────────────────────────
neck = new_part("SharkNeck")
nbm = lathe([(chest_top, 0.06, 0.06), (neck_top, 0.07, 0.07)], n=24)
nbm.to_mesh(neck.data); nbm.free()
neck.data.materials.append(mat_body)
bind_bone(neck, "neck")

# ── BODY (torso: grey back, white belly) ─────────────────────────────────────
torso = new_part("SharkTorso")
tbm = lathe([
    (torso_bottom, 0.13, 0.115),
    (torso_bottom + spine_h * 0.5, 0.125, 0.10),
    (torso_bottom + spine_h + chest_h * 0.38, 0.15, 0.115),
    (torso_bottom + spine_h + chest_h * 0.72, 0.18, 0.10),
    (chest_top, 0.10, 0.10),
], n=32)
tbm.to_mesh(torso.data); tbm.free()
torso.data.materials.append(mat_body)
bind_bone(torso, "chest")

torso_belly = new_part("SharkTorsoBelly")
tbbm = lathe([
    (torso_bottom, 0.11, 0.04),
    (torso_bottom + spine_h * 0.5, 0.10, 0.05),
    (chest_top - 0.02, 0.08, 0.05),
], n=24)
tbbm.to_mesh(torso_belly.data); tbbm.free()
torso_belly.data.materials.append(mat_belly)
torso_belly.scale = (1, 1, 0.9)
bind_bone(torso_belly, "chest")

# ── PELVIS / HIPS ─────────────────────────────────────────────────────────────
pelvis = new_part("SharkPelvis")
pbm = lathe([(torso_bottom - 0.04, 0.12, 0.10), (torso_bottom + 0.02, 0.13, 0.11)], n=24)
pbm.to_mesh(pelvis.data); pbm.free()
pelvis.data.materials.append(mat_body)
bind_bone(pelvis, "hips")

# ── ARMS (pectoral fins as arms) ──────────────────────────────────────────────
def make_limb(name, bone_up, bone_low, x_off, y_top, y_mid, y_end, r_up, r_low, forward=0.0):
    up = new_part(name + "Upper")
    ubm = bmesh.new()
    top = ring(x_off, y_top, forward, r_up, r_up, 20)
    mid = ring(x_off, y_mid, forward, r_up * 0.8, r_up * 0.8, 20)
    for i in range(20):
        i2 = (i + 1) % 20
        try:
            ubm.faces.new([top[i], top[i2], mid[i2], mid[i]])
        except:
            pass
    # joint sphere at elbow
    ubm.to_mesh(up.data); ubm.free()
    up.data.materials.append(mat_fin)
    bind_bone(up, bone_up)

    low = new_part(name + "Lower")
    lbm = bmesh.new()
    mid2 = ring(x_off, y_mid, forward, r_low, r_low, 18)
    end = ring(x_off, y_end, forward, r_low * 0.6, r_low * 0.6, 18)
    for i in range(18):
        i2 = (i + 1) % 18
        try:
            lbm.faces.new([mid2[i], mid2[i2], end[i2], end[i]])
        except:
            pass
    lbm.to_mesh(low.data); lbm.free()
    low.data.materials.append(mat_fin)
    bind_bone(low, bone_low)

# Arms: fins hanging from shoulders
make_limb("SharkArmL", "armUpperL", "armLowerL", -0.19, shoulder_y, shoulder_y - 0.28, shoulder_y - 0.50, 0.05, 0.04)
make_limb("SharkArmR", "armUpperR", "armLowerR",  0.19, shoulder_y, shoulder_y - 0.28, shoulder_y - 0.50, 0.05, 0.04)

# ── LEGS (tail as legs, fluke feet) ───────────────────────────────────────────
make_limb("SharkLegL", "legUpperL", "legLowerL", -0.095, torso_bottom - 0.06, torso_bottom - 0.46, torso_bottom - 0.84, 0.06, 0.05)
make_limb("SharkLegR", "legUpperR", "legLowerR",  0.095, torso_bottom - 0.06, torso_bottom - 0.46, torso_bottom - 0.84, 0.06, 0.05)

# Tail fluke "feet"
for side, sign in [("L", -1), ("R", 1)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sign * 0.095, torso_bottom - 0.88, 0.06))
    fluke = bpy.context.active_object
    fluke.name = f"SharkFluke{side}"
    fluke.scale = (0.05, 0.04, 0.10)
    fluke.data.materials.append(mat_fin)
    vg = fluke.vertex_groups.new(name=f"foot{side}")
    with bpy.context.temp_override(object=fluke):
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.object.vertex_group_assign()
        bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(fluke)

# ── Step 5: Join all parts into one mesh ──────────────────────────────────────
print("Joining mesh parts...")
main = parts[0]
bpy.context.view_layer.objects.active = main
main.select_set(True)
for o in parts[1:]:
    o.select_set(True)
bpy.ops.object.join()
shark_obj = bpy.context.active_object
shark_obj.name = "SharkCharacter"

# ── Step 6: Armature (identical to build_character.py) ────────────────────────
print("Creating armature...")
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm_obj = bpy.context.active_object
arm_obj.name = "Armature"
arm = arm_obj.data
arm.name = "Armature"
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

add_bone("root", (0, 0, 0), (0, 0.05, 0))
add_bone("hips", (0, torso_bottom, 0), (0, torso_bottom + 0.05, 0), "root")
add_bone("spine", (0, torso_bottom + 0.05, 0), (0, torso_bottom + spine_h, 0), "hips")
add_bone("chest", (0, torso_bottom + spine_h, 0), (0, chest_top, 0), "spine")
add_bone("neck", (0, chest_top, 0), (0, neck_top, 0), "chest")
add_bone("head", (0, neck_top, 0), (0, neck_top + head_r * 2, 0), "neck")

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

# Bind mesh to armature via Armature modifier (vertex groups already assigned)
mod = shark_obj.modifiers.new("Armature", 'ARMATURE')
mod.object = arm_obj
shark_obj.parent = arm_obj

# ── Step 7: Animations ────────────────────────────────────────────────────────
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
    ls = 0.45; kb = 0.7; aswing = 0.35; lean = 0.1
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
    s = math.sin(ph); c = math.cos(ph)
    ls = 0.75; kb = 1.1; aswing = 0.55; lean = 0.22
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

arm_obj.animation_data.action = actions["Idle"]
scene.frame_set(1)
print("Animations created: Idle, Walk, Run, Jump, Sit")

# ── Step 8: Export ────────────────────────────────────────────────────────────
export_dir = r"C:\Users\taksh\studyforest\public\models\avatars"
os.makedirs(export_dir, exist_ok=True)
export_path = os.path.join(export_dir, "shark.glb")
bpy.ops.object.select_all(action='DESELECT')
shark_obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.export_scene.gltf(
    filepath=export_path,
    use_selection=True,
    export_format='GLB',
    export_animations=True,
    export_yup=True,
)
print("=" * 60)
print("SHARK CHARACTER COMPLETE!")
print(f"Vertices: {len(shark_obj.data.vertices)}")
print(f"Bones: {len(arm.bones)}")
print(f"Exported to: {export_path}")
print(f"File size: {os.path.getsize(export_path) / 1024 / 1024:.1f} MB")
print("=" * 60)
