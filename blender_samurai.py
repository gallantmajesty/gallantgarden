"""
Blender Python script: Create a Samurai character with blue+red+white clothes and black face.
Run: blender.exe --background --python blender_samurai.py
"""
import bpy
import bmesh
import math
from mathutils import Vector, Euler, Quaternion

# ── Reset scene ──────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 240
scene.render.fps = 24

# ── Materials ────────────────────────────────────────────────────────────────
def make_mat(name, color, roughness=0.7):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

# Samurai materials
mat_skin = make_mat("Skin", (0.88, 0.78, 0.7, 1), 0.65)
mat_hair = make_mat("Hair", (0.1, 0.1, 0.1, 1), 0.55)
mat_eye_white = make_mat("EyeWhite", (0.96, 0.95, 0.93, 1), 0.15)
mat_iris = make_mat("Iris", (0.35, 0.22, 0.13, 1), 0.12)
mat_pupil = make_mat("Pupil", (0.06, 0.04, 0.03, 1), 0.05)
mat_lips = make_mat("Lips", (0.76, 0.44, 0.4, 1), 0.6)

# Samurai outfit colors - Blue + Red + White
mat_samurai_blue = make_mat("SamuraiBlue", (0.1, 0.2, 0.4, 1), 0.8)
mat_samurai_red = make_mat("SamuraiRed", (0.6, 0.1, 0.1, 1), 0.7)
mat_samurai_white = make_mat("SamuraiWhite", (0.95, 0.95, 0.95, 1), 0.9)
mat_samurai_black = make_mat("SamuraiBlack", (0.05, 0.05, 0.05, 1), 0.9)
mat_samurai_metal = make_mat("SamuraiMetal", (0.7, 0.7, 0.8, 1), 0.2)

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

def add_cube(name, location, scale, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    if mat:
        obj.data.materials.append(mat)
    return obj

# ── Create body mesh (single joined mesh for the whole body) ────────────────
# Body dimensions (realistic proportions, ~170cm)
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

# ── Build body using metaballs for organic shape, then convert ───────────────
def create_body_mesh():
    mesh = bpy.data.meshes.new("BodyMesh")
    obj = bpy.data.objects.new("Body", mesh)
    scene.collection.objects.link(obj)
    
    bm = bmesh.new()
    
    segments = 32  # radial segments around the body
    
    def ring(cx, cy, cz, rx, ry, rz, n=segments):
        """Create a ring of vertices at position (cx,cy,cz) with radii (rx,ry,rz)"""
        verts = []
        for i in range(n):
            angle = (i / n) * math.pi * 2
            x = cx + rx * math.cos(angle)
            y = cy
            z = cz + rz * math.sin(angle)
            verts.append(bm.verts.new((x, y, z)))
        return verts
    
    # Body rings from bottom to top
    rings_data = [
        # Ankles
        (0.046, 0.048, 0.048),
        # Calves
        (0.25, 0.055, 0.055),
        # Knees
        (0.46, 0.058, 0.058),
        # Thighs
        (0.65, 0.078, 0.078),
        # Hips
        (torso_bottom, hip_w, hip_d),
        # Waist
        (torso_bottom + spine_h * 0.5, waist_w, hip_d * 0.86),
        # Chest
        (torso_bottom + spine_h + chest_h * 0.38, chest_w, chest_d),
        # Shoulders
        (torso_bottom + spine_h + chest_h * 0.72, shoulder_w, chest_d * 0.84),
        # Neck base
        (torso_bottom + spine_h + chest_h * 0.84, neck_r * 1.6, neck_r * 1.6),
        # Neck
        (hips_y + spine_h + chest_h + neck_len * 0.5, neck_r, neck_r),
        # Head base
        (hips_y + spine_h + chest_h + neck_len, head_r * 0.85, head_r * 0.8),
        # Head mid (widest)
        (hips_y + spine_h + chest_h + neck_len + head_r * 0.5, head_r, head_r * 0.95),
        # Head top
        (hips_y + spine_h + chest_h + neck_len + head_r, head_r * 0.7, head_r * 0.65),
        # Crown
        (hips_y + spine_h + chest_h + neck_len + head_r * 1.3, head_r * 0.3, head_r * 0.3),
    ]
    
    all_rings = []
    for (y, rx, rz) in rings_data:
        r = ring(0, y, 0, rx, rz, rx)
        all_rings.append(r)
    
    bm.verts.ensure_lookup_table()
    
    # Connect rings with faces
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
    
    # Add subdivision surface for smoothness
    mod = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod.levels = 2
    mod.render_levels = 3
    
    # Smooth shading
    for poly in mesh.polygons:
        poly.use_smooth = True
    
    return obj

body = create_body_mesh()
body.data.materials.append(mat_skin)
body.name = "SamuraiBody"

# ── Eyes ─────────────────────────────────────────────────────────────────────
eye_y = hips_y + spine_h + chest_h + neck_len + head_r * 0.48
eye_z = head_r * 0.6
eye_x = head_r * 0.36

for side in [-1, 1]:
    # Eye white
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.018, 
        location=(side * eye_x, eye_y, eye_z))
    ew = bpy.context.active_object
    ew.name = f"EyeWhite{'L' if side < 0 else 'R'}"
    ew.scale = (1, 0.7, 1.2)
    ew.data.materials.append(mat_eye_white)
    bpy.ops.object.shade_smooth()
    
    # Iris
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.012,
        location=(side * eye_x, eye_y + 0.008, eye_z))
    iris = bpy.context.active_object
    iris.name = f"Iris{'L' if side < 0 else 'R'}"
    iris.scale = (1, 0.6, 1)
    iris.data.materials.append(mat_iris)
    bpy.ops.object.shade_smooth()
    
    # Pupil
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.006,
        location=(side * eye_x, eye_y + 0.014, eye_z))
    pup = bpy.context.active_object
    pup.name = f"Pupil{'L' if side < 0 else 'R'}"
    pup.scale = (1, 0.5, 1)
    pup.data.materials.append(mat_pupil)
    bpy.ops.object.shade_smooth()

# ── Black Face (only eyes visible) ────────────────────────────────────────────
# Create a black face mask that covers everything except the eye area
face_y = eye_y
face_z = eye_z
face_x = head_r * 0.8

# Face mask - black area covering everything except eyes
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.1,
    location=(0, face_y, face_z))
face_mask = bpy.context.active_object
face_mask.name = "FaceMask"
face_mask.scale = (1.2, 0.8, 0.6)
face_mask.data.materials.append(mat_samurai_black)
bpy.ops.object.shade_smooth()

# Create holes for eyes using boolean modifiers
# Left eye hole
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.02,
    location=(-eye_x * 1.2, eye_y, eye_z))
eye_hole_l = bpy.context.active_object
eye_hole_l.name = "EyeHoleL"
eye_hole_l.data.materials.append(mat_samurai_black)

# Right eye hole
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.02,
    location=(eye_x * 1.2, eye_y, eye_z))
eye_hole_r = bpy.context.active_object
eye_hole_r.name = "EyeHoleR"
eye_hole_r.data.materials.append(mat_samurai_black)

# Apply boolean modifiers to create eye holes
bpy.ops.object.select_all(action='DESELECT')
face_mask.select_set(True)
eye_hole_l.select_set(True)
eye_hole_r.select_set(True)
bpy.context.view_layer.objects.active = face_mask

# Apply boolean difference
mod = face_mask.modifiers.new("Boolean1", 'BOOLEAN')
mod.object = eye_hole_l
mod.operation = 'DIFFERENCE'
bpy.ops.object.modifier_apply(modifier="Boolean1")

mod2 = face_mask.modifiers.new("Boolean2", 'BOOLEAN')
mod2.object = eye_hole_r
mod2.operation = 'DIFFERENCE'
bpy.ops.object.modifier_apply(modifier="Boolean2")

# Delete the eye hole objects
bpy.ops.object.select_all(action='DESELECT')
eye_hole_l.select_set(True)
eye_hole_r.select_set(True)
bpy.ops.object.delete()

# ── Eyebrows ────────────────────────────────────────────────────────────────
for side in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(side * eye_x, eye_y - 0.005, eye_z + head_r * 0.2))
    brow = bpy.context.active_object
    brow.name = f"Eyebrow{'L' if side < 0 else 'R'}"
    brow.scale = (0.02, 0.003, 0.003)
    brow.data.materials.append(mat_hair)

# ── Nose ─────────────────────────────────────────────────────────────────────
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.012,
    location=(0, eye_y - head_r * 0.22, eye_z + head_r * 0.12))
nose = bpy.context.active_object
nose.name = "Nose"
nose.scale = (0.8, 1.2, 0.7)
nose.data.materials.append(mat_skin)
bpy.ops.object.shade_smooth()

# ── Mouth / Lips ─────────────────────────────────────────────────────────────
mouth_y = eye_y - head_r * 0.35
mouth_z = eye_z + head_r * 0.03
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.015,
    location=(0, mouth_y, mouth_z))
mouth = bpy.context.active_object
mouth.name = "Mouth"
mouth.scale = (1.2, 0.4, 0.5)
mouth.data.materials.append(mat_lips)
bpy.ops.object.shade_smooth()

# ── Ears ─────────────────────────────────────────────────────────────────────
for side in [-1, 1]:
    ear_x = side * head_r * 0.88
    ear_y = eye_y
    ear_z = eye_z - head_r * 0.05
    
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.02,
        location=(ear_x, ear_y, ear_z))
    ear = bpy.context.active_object
    ear.name = f"Ear{'L' if side < 0 else 'R'}"
    ear.scale = (0.3, 0.7, 1)
    ear.data.materials.append(mat_skin)
    bpy.ops.object.shade_smooth()

# ── Hair ─────────────────────────────────────────────────────────────────────
# Scalp cap
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=head_r * 1.05,
    location=(0, eye_y + head_r * 0.15, eye_z + head_r * 0.35))
scalp = bpy.context.active_object
scalp.name = "HairScalp"
scalp.scale = (1, 0.95, 0.9)
scalp.data.materials.append(mat_hair)
bpy.ops.object.shade_smooth()

# ── Samurai Armor ────────────────────────────────────────────────────────────
def create_samurai_armor():
    mesh = bpy.data.meshes.new("ArmorMesh")
    obj = bpy.data.objects.new("SamuraiArmor", mesh)
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
    
    # Armor pieces with blue and red colors
    armor_bottom = torso_bottom + 0.02
    armor_top = torso_bottom + spine_h + chest_h * 0.82
    
    # Chest plate (blue with red trim)
    rings_data = [
        (armor_bottom, hip_w + 0.01, hip_d + 0.01),
        (armor_bottom + spine_h * 0.3, waist_w + 0.01, hip_d * 0.86 + 0.01),
        (armor_bottom + spine_h + chest_h * 0.2, chest_w + 0.01, chest_d + 0.01),
        (armor_bottom + spine_h + chest_h * 0.6, shoulder_w + 0.01, chest_d * 0.84 + 0.01),
        (armor_top, neck_r * 1.6 + 0.01, neck_r * 1.6 + 0.01),
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

# Create main armor
armor = create_samurai_armor()
armor.data.materials.append(mat_samurai_blue)
armor.name = "SamuraiArmor"

# ── Samurai Details ──────────────────────────────────────────────────────────
# Red shoulder guards
for side, x_sign in [("L", -1), ("R", 1)]:
    shoulder_x = x_sign * shoulder_w * 0.8
    shoulder_y = torso_bottom + spine_h + chest_h * 0.7
    
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.08, radius2=0.04,
        depth=0.12, location=(shoulder_x, shoulder_y, 0))
    shoulder_guard = bpy.context.active_object
    shoulder_guard.name = f"ShoulderGuard{side}"
    shoulder_guard.data.materials.append(mat_samurai_red)
    bpy.ops.object.shade_smooth()

# White belt/sash
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.08, depth=0.08,
    location=(0, torso_bottom + 0.04, 0))
belt = bpy.context.active_object
belt.name = "SamuraiBelt"
belt.rotation_euler = (math.pi/2, 0, 0)
belt.data.materials.append(mat_samurai_white)

# ─── Samurai Helmet ──────────────────────────────────────────────────────────
# Create a simplified samurai helmet (kabuto style)
helmet_y = eye_y + head_r * 1.5
helmet_z = eye_z

# Main helmet body
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.15,
    location=(0, helmet_y, helmet_z))
helmet = bpy.context.active_object
helmet.name = "SamuraiHelmet"
helmet.scale = (0.8, 0.6, 0.9)
helmet.data.materials.append(mat_samurai_metal)
bpy.ops.object.shade_smooth()

# Helmet crest/decoration
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.02, radius2=0.06,
    depth=0.08, location=(0, helmet_y + 0.1, helmet_z))
crest = bpy.context.active_object
crest.name = "HelmetCrest"
crest.data.materials.append(mat_samurai_red)
bpy.ops.object.shade_smooth()

# ─── Samurai Sword ───────────────────────────────────────────────────────────
# Create a simple katana
sword_y = torso_bottom + spine_h + chest_h * 0.5
sword_x = shoulder_w * 1.2

# Sword blade
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.015, depth=0.8,
    location=(sword_x, sword_y, 0))
blade = bpy.context.active_object
blade.name = "SwordBlade"
blade.rotation_euler = (0, math.pi/2, 0)
blade.data.materials.append(mat_samurai_metal)

# Sword guard
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.04, depth=0.02,
    location=(sword_x, sword_y, 0))
guard = bpy.context.active_object
guard.name = "SwordGuard"
guard.rotation_euler = (0, math.pi/2, 0)
guard.data.materials.append(mat_samurai_red)

# Sword handle
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.01, depth=0.2,
    location=(sword_x, sword_y - 0.4, 0))
handle = bpy.context.active_object
handle.name = "SwordHandle"
handle.rotation_euler = (0, math.pi/2, 0)
handle.data.materials.append(mat_samurai_black)

# ─── Legs and Feet ───────────────────────────────────────────────────────────
# Left leg armor
for side, x_off in [("L", -hip_w), ("R", hip_w)]:
    # Upper leg armor
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.08, radius2=0.06,
        depth=0.35, location=(x_off, torso_bottom - 0.2, 0))
    leg_upper = bpy.context.active_object
    leg_upper.name = f"LegArmorUpper{side}"
    leg_upper.data.materials.append(mat_samurai_blue)
    bpy.ops.object.shade_smooth()
    
    # Lower leg armor
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.07, radius2=0.05,
        depth=0.35, location=(x_off, torso_bottom - 0.55, 0))
    leg_lower = bpy.context.active_object
    leg_lower.name = f"LegArmorLower{side}"
    leg_lower.data.materials.append(mat_samurai_blue)
    bpy.ops.object.shade_smooth()
    
    # Foot armor (simplified)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.06, depth=0.08,
        location=(x_off, 0.12, 0))
    foot_armor = bpy.context.active_object
    foot_armor.name = f"FootArmor{side}"
    foot_armor.rotation_euler = (math.pi/2, 0, 0)
    foot_armor.data.materials.append(mat_samurai_metal)

# ── Join all mesh parts into one object ──────────────────────────────────────
body_obj = bpy.data.objects["SamuraiBody"]
bpy.context.view_layer.objects.active = body_obj
body_obj.select_set(True)

# Select all mesh objects to join
for obj in bpy.data.objects:
    if obj.type == 'MESH' and obj.name not in ["SamuraiBody"]:
        obj.select_set(True)

# Join
bpy.ops.object.join()
body_obj = bpy.context.active_object
body_obj.name = "SamuraiCharacter"

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

# Remove default bone
bpy.ops.armature.select_all(action='SELECT')
bpy.ops.armature.delete()

# Helper to add bones
def add_bone(name, head, tail, parent=None, connect=False):
    bone = armature.edit_bones.new(name)
    bone.head = Vector(head)
    bone.tail = Vector(tail)
    if parent:
        bone.parent = armature.edit_bones[parent]
        bone.use_connect = connect
    return bone

# Root
add_bone("root", (0, 0, 0), (0, 0.05, 0))

# Hips
add_bone("hips", (0, torso_bottom, 0), (0, torso_bottom + 0.05, 0), "root")

# Spine
add_bone("spine", (0, torso_bottom + 0.05, 0), (0, torso_bottom + spine_h, 0), "hips")

# Chest
chest_top = torso_bottom + spine_h + chest_h
add_bone("chest", (0, torso_bottom + spine_h, 0), (0, chest_top, 0), "spine")

# Neck
neck_top = chest_top + neck_len
add_bone("neck", (0, chest_top, 0), (0, neck_top, 0), "chest")

# Head
head_top = neck_top + head_r * 2
add_bone("head", (0, neck_top, 0), (0, head_top, 0), "neck")

# Arms
shoulder_y = chest_top - chest_h * 0.14
arm_len = 0.28
forearm_len = 0.25
hand_len = 0.14

for side, x_sign in [("L", -1), ("R", 1)]:
    sx = x_sign * shoulder_w
    # Upper arm
    add_bone(f"armUpper{side}", (sx, shoulder_y, 0), (sx, shoulder_y - arm_len, 0), "chest")
    # Lower arm
    add_bone(f"armLower{side}", (sx, shoulder_y - arm_len, 0), (sx, shoulder_y - arm_len - forearm_len, 0), f"armUpper{side}", True)

# Legs
for side, x_sign in [("L", -1), ("R", 1)]:
    lx = x_sign * hip_w
    upper_leg = 0.40
    lower_leg = 0.40
    # Upper leg
    add_bone(f"legUpper{side}", (lx, torso_bottom - 0.06, 0), (lx, torso_bottom - 0.06 - upper_leg, 0), "hips")
    # Lower leg
    knee_y = torso_bottom - 0.06 - upper_leg
    add_bone(f"legLower{side}", (lx, knee_y, 0), (lx, knee_y - lower_leg, 0), f"legUpper{side}", True)
    # Foot
    foot_y = knee_y - lower_leg
    add_bone(f"foot{side}", (lx, foot_y, 0), (lx, foot_y + 0.02, 0.12), f"legLower{side}", True)

# Switch back to object mode
bpy.ops.object.mode_set(mode='OBJECT')

# ── Parent mesh to armature with armature modifier ───────────────────────────
body_obj.select_set(True)
armature_obj.select_set(True)
bpy.context.view_layer.objects.active = armature_obj

# Use automatic weights for skinning
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
body_obj.select_set(True)
armature_obj.select_set(True)
bpy.context.view_layer.objects.active = body_obj

# Remove any existing parent
body_obj.parent = None

# Try armature deform with automatic weights
try:
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    print("Successfully parented with auto weights")
except Exception as e:
    print(f"Auto weights failed: {e}, trying empty groups")
    # Fallback: manual armature modifier
    body_obj.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = body_obj
    mod = body_obj.modifiers.new("Armature", 'ARMATURE')
    mod.object = armature_obj
    bpy.ops.object.parent_set(type='OBJECT')

# ── Initialize animation data ──────────────────────────────────────────────────
if not armature_obj.animation_data:
    armature_obj.animation_data_create()

# ── Animations (copy from base model) ────────────────────────────────────────
action_idle = bpy.data.actions.new("Idle")
action_walk = bpy.data.actions.new("Walk")
action_run = bpy.data.actions.new("Run")
action_jump = bpy.data.actions.new("Jump")
action_sit = bpy.data.actions.new("Sit")

fps = 24

# Helper to set keyframes on a bone
def keyframe_bone(armature_obj, bone_name, frame, location=None, rotation=None):
    pbone = armature_obj.pose.bones.get(bone_name)
    if not pbone:
        return
    if location:
        pbone.location = Vector(location)
        pbone.keyframe_insert(data_path="location", frame=frame)
    if rotation:
        pbone.rotation_mode = 'XYZ'
        pbone.rotation_euler = Euler(rotation)
        pbone.keyframe_insert(data_path="rotation_euler", frame=frame)

# ── IDLE animation (48 frames = 2 seconds) ────────────────────────────────────
action = action_idle
armature_obj.animation_data.action = action

for f in range(1, 49):
    t = f / fps
    breath = math.sin(t * 1.4) * 0.015
    sway = math.sin(t * 0.55) * 0.012
    head_drift = math.sin(t * 0.4 + 1) * 0.05
    
    keyframe_bone(armature_obj, "chest", f, rotation=(0.03 + breath, 0, 0))
    keyframe_bone(armature_obj, "spine", f, rotation=(0, 0, sway))
    keyframe_bone(armature_obj, "hips", f, rotation=(0, sway * 0.018, -sway * 0.018))
    keyframe_bone(armature_obj, "neck", f, rotation=(-0.02, head_drift, 0))
    keyframe_bone(armature_obj, "head", f, rotation=(breath, head_drift * 0.9, 0))
    
    # Arms hang naturally
    keyframe_bone(armature_obj, "armUpperL", f, rotation=(0.08 + breath * 0.5, 0, -0.06))
    keyframe_bone(armature_obj, "armUpperR", f, rotation=(0.08 + breath * 0.5, 0, 0.06))
    keyframe_bone(armature_obj, "armLowerL", f, rotation=(0.15, 0, -0.04))
    keyframe_bone(armature_obj, "armLowerR", f, rotation=(0.15, 0, 0.04))

# ── WALK animation (48 frames) ───────────────────────────────────────────────
armature_obj.animation_data.action = action_walk

for f in range(1, 49):
    t = f / fps
    phase = t * 4.5  # walk cadence
    s = math.sin(phase)
    c = math.cos(phase)
    leg_swing = 0.45
    knee_bend = 0.7
    arm_swing = 0.35
    lean = 0.1
    
    # Torso
    keyframe_bone(armature_obj, "hips", f, rotation=(lean * 0.4, 0, 0))
    keyframe_bone(armature_obj, "spine", f, rotation=(lean * 0.5, 0, 0))
    keyframe_bone(armature_obj, "chest", f, rotation=(lean * 0.3, -s * 0.05, 0))
    keyframe_bone(armature_obj, "head", f, rotation=(-lean * 0.2, s * 0.025, 0))
    
    # Legs
    knee_l = max(0, -c) * knee_bend
    knee_r = max(0, c) * knee_bend
    
    keyframe_bone(armature_obj, "legUpperL", f, rotation=(s * leg_swing, 0, 0))
    keyframe_bone(armature_obj, "legUpperR", f, rotation=(-s * leg_swing, 0, 0))
    keyframe_bone(armature_obj, "legLowerL", f, rotation=(knee_l, 0, 0))
    keyframe_bone(armature_obj, "legLowerR", f, rotation=(knee_r, 0, 0))
    keyframe_bone(armature_obj, "footL", f, rotation=(-s * leg_swing * 0.4, 0, 0))
    keyframe_bone(armature_obj, "footR", f, rotation=(s * leg_swing * 0.4, 0, 0))
    
    # Arms swing opposite to legs
    carry = 0.25
    keyframe_bone(armature_obj, "armUpperL", f, rotation=(-s * arm_swing, 0, 0.07))
    keyframe_bone(armature_obj, "armUpperR", f, rotation=(s * arm_swing, 0, -0.07))
    keyframe_bone(armature_obj, "armLowerL", f, rotation=(carry + max(0, -s) * 0.18, 0, 0.05))
    keyframe_bone(armature_obj, "armLowerR", f, rotation=(carry + max(0, s) * 0.18, 0, -0.05))

# ── RUN animation (48 frames) ────────────────────────────────────────────────
armature_obj.animation_data.action = action_run

for f in range(1, 49):
    t = f / fps
    phase = t * 7  # faster cadence
    s = math.sin(phase)
    c = math.cos(phase)
    leg_swing = 0.75
    knee_bend = 1.1
    arm_swing = 0.55
    lean = 0.22
    
    keyframe_bone(armature_obj, "hips", f, rotation=(lean * 0.4, 0, 0))
    keyframe_bone(armature_obj, "spine", f, rotation=(lean * 0.5, 0, 0))
    keyframe_bone(armature_obj, "chest", f, rotation=(lean * 0.3, -s * 0.06, 0))
    keyframe_bone(armature_obj, "head", f, rotation=(-lean * 0.2, s * 0.03, 0))
    
    knee_l = max(0, -c) * knee_bend
    knee_r = max(0, c) * knee_bend
    
    keyframe_bone(armature_obj, "legUpperL", f, rotation=(s * leg_swing, 0, 0))
    keyframe_bone(armature_obj, "legUpperR", f, rotation=(-s * leg_swing, 0, 0))
    keyframe_bone(armature_obj, "legLowerL", f, rotation=(knee_l, 0, 0))
    keyframe_bone(armature_obj, "legLowerR", f, rotation=(knee_r, 0, 0))
    keyframe_bone(armature_obj, "footL", f, rotation=(-s * leg_swing * 0.4, 0, 0))
    keyframe_bone(armature_obj, "footR", f, rotation=(s * leg_swing * 0.4, 0, 0))
    
    carry = 0.35
    keyframe_bone(armature_obj, "armUpperL", f, rotation=(-s * arm_swing, 0, 0.1))
    keyframe_bone(armature_obj, "armUpperR", f, rotation=(s * arm_swing, 0, -0.1))
    keyframe_bone(armature_obj, "armLowerL", f, rotation=(carry + max(0, -s) * 0.22, 0, 0.06))
    keyframe_bone(armature_obj, "armLowerR", f, rotation=(carry + max(0, s) * 0.22, 0, -0.06))

# ── JUMP animation (48 frames) ───────────────────────────────────────────────
armature_obj.animation_data.action = action_jump

for f in range(1, 49):
    t = f / fps
    # Jump arc: frames 1-16 crouch, 17-32 rise+peak, 33-48 land
    if f <= 16:
        # Crouch prep
        p = f / 16
        keyframe_bone(armature_obj, "hips", f, location=(0, -0.06 * p, 0))
        keyframe_bone(armature_obj, "legUpperL", f, rotation=(0.3 * p, 0, 0))
        keyframe_bone(armature_obj, "legUpperR", f, rotation=(0.3 * p, 0, 0))
        keyframe_bone(armature_obj, "legLowerL", f, rotation=(0.6 * p, 0, 0))
        keyframe_bone(armature_obj, "legLowerR", f, rotation=(0.6 * p, 0, 0))
        keyframe_bone(armature_obj, "armUpperL", f, rotation=(0.3 * p, 0, -0.1))
        keyframe_bone(armature_obj, "armUpperR", f, rotation=(0.3 * p, 0, 0.1))
    elif f <= 32:
        # Rise and peak
        p = (f - 16) / 16
        up = math.sin(p * math.pi)
        keyframe_bone(armature_obj, "hips", f, location=(0, up * 0.3, 0))
        keyframe_bone(armature_obj, "legUpperL", f, rotation=(-0.5 * up, 0, 0))
        keyframe_bone(armature_obj, "legUpperR", f, rotation=(-0.3 * up, 0, 0))
        keyframe_bone(armature_obj, "legLowerL", f, rotation=(0.6 * up, 0, 0))
        keyframe_bone(armature_obj, "legLowerR", f, rotation=(0.4 * up, 0, 0))
        keyframe_bone(armature_obj, "armUpperL", f, rotation=(-1.0 * up, 0, 0.15))
        keyframe_bone(armature_obj, "armUpperR", f, rotation=(-1.0 * up, 0, -0.15))
        keyframe_bone(armature_obj, "armLowerL", f, rotation=(0.6 * up, 0, 0))
        keyframe_bone(armature_obj, "armLowerR", f, rotation=(0.6 * up, 0, 0))
    else:
        # Landing
        p = (f - 32) / 16
        squash = (1 - p) * 0.8
        keyframe_bone(armature_obj, "hips", f, location=(0, squash * 0.05, 0))
        keyframe_bone(armature_obj, "legUpperL", f, rotation=(0.4 * squash, 0, 0))
        keyframe_bone(armature_obj, "legUpperR", f, rotation=(0.4 * squash, 0, 0))
        keyframe_bone(armature_obj, "legLowerL", f, rotation=(0.8 * squash, 0, 0))
        keyframe_bone(armature_obj, "legLowerR", f, rotation=(0.8 * squash, 0, 0))
        keyframe_bone(armature_obj, "armUpperL", f, rotation=(-0.2 * squash, 0, 0.15))
        keyframe_bone(armature_obj, "armUpperR", f, rotation=(-0.2 * squash, 0, -0.15))

# ── SIT animation (48 frames, looping) ───────────────────────────────────────
armature_obj.animation_data.action = action_sit

for f in range(1, 49):
    t = f / fps
    breath = math.sin(t * 1.2) * 0.015
    
    keyframe_bone(armature_obj, "hips", f, location=(0, -0.26, 0), rotation=(0.06, 0, 0))
    keyframe_bone(armature_obj, "spine", f, rotation=(0.03, 0, 0))
    keyframe_bone(armature_obj, "chest", f, rotation=(0.03 + breath, 0, 0))
    keyframe_bone(armature_obj, "head", f, rotation=(-0.06, breath * 2, 0))
    
    # Thighs forward, shins down
    keyframe_bone(armature_obj, "legUpperL", f, rotation=(-1.48, 0, 0.05))
    keyframe_bone(armature_obj, "legUpperR", f, rotation=(-1.48, 0, -0.05))
    keyframe_bone(armature_obj, "legLowerL", f, rotation=(1.55, 0, 0))
    keyframe_bone(armature_obj, "legLowerR", f, rotation=(1.55, 0, 0))
    keyframe_bone(armature_obj, "footL", f, rotation=(0.18, 0, 0))
    keyframe_bone(armature_obj, "footR", f, rotation=(0.18, 0, 0))
    
    # Arms hang at sides, forearms forward resting on thighs
    keyframe_bone(armature_obj, "armUpperL", f, rotation=(0.15, 0, -0.08))
    keyframe_bone(armature_obj, "armUpperR", f, rotation=(0.15, 0, 0.08))
    keyframe_bone(armature_obj, "armLowerL", f, rotation=(1.1, 0, 0.1))
    keyframe_bone(armature_obj, "armLowerR", f, rotation=(1.1, 0, -0.1))

# Set all actions to loop
for act in [action_idle, action_walk, action_run, action_jump, action_sit]:
    act.use_frame_range = True
    act.frame_start = 1
    act.frame_end = 48

# Set default to idle
armature_obj.animation_data.action = action_idle
scene.frame_set(1)

# ── Push all actions to NLA strips for proper GLB export ─────────────────────
armature_obj.animation_data.use_nla = True
for act in [action_idle, action_walk, action_run, action_jump, action_sit]:
    strip = armature_obj.animation_data.nla_tracks.new()
    strip.name = act.name
    nla_strip = strip.strips.new(act.name, 1, act)
    nla_strip.frame_start = 1
    nla_strip.frame_end = 48

# Set back to non-NLA for export (actions are baked into NLA)
armature_obj.animation_data.use_nla = False

# ── Export as GLB ────────────────────────────────────────────────────────────
import os
export_path = os.path.join(os.path.dirname(bpy.data.filepath) or r"C:\Users\taksh\studyforest\public\models", "avatars", "samurai.glb")

# Ensure directory exists
os.makedirs(os.path.dirname(export_path), exist_ok=True)

# Select only the character and armature
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
print("=== SAMURAI CHARACTER CREATED SUCCESSFULLY ===")