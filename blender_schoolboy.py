"""
Harry Potter-style Schoolboy Character for Blender
Chibi proportions (~120cm), Hogwarts robe, round glasses
Run in Blender's Scripting workspace
"""

import bpy
import math
from mathutils import Vector

# ─── Clear scene ───
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# ─── Collections ───
body_col = bpy.data.collections.new("Body")
clothes_col = bpy.data.collections.new("Clothes")
accessories_col = bpy.data.collections.new("Accessories")
bpy.context.scene.collection.children.link(body_col)
bpy.context.scene.collection.children.link(clothes_col)
bpy.context.scene.collection.children.link(accessories_col)

def link_to_collection(obj, collection):
    collection.objects.link(obj)
    if obj.name in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.unlink(obj)

def make_material(name, color, roughness=0.5, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat

# ─── Materials ───
skin_mat = make_material("Skin", (0.93, 0.82, 0.72), 0.7)
hair_mat = make_material("Hair", (0.13, 0.1, 0.09), 0.6, 0.02)
eye_white_mat = make_material("EyeWhite", (0.96, 0.95, 0.92), 0.15)
iris_mat = make_material("Iris", (0.35, 0.22, 0.12), 0.15)
pupil_mat = make_material("Pupil", (0.07, 0.05, 0.04), 0.1)
robe_mat = make_material("Robe", (0.14, 0.14, 0.16), 0.85)
robe_trim_mat = make_material("RobeTrim", (0.72, 0.58, 0.22), 0.4, 0.6)
sweater_mat = make_material("Sweater", (0.55, 0.53, 0.5), 0.9)
shirt_mat = make_material("Shirt", (0.95, 0.94, 0.9), 0.8)
tie_mat = make_material("Tie", (0.55, 0.42, 0.12), 0.7)
pants_mat = make_material("Pants", (0.18, 0.18, 0.2), 0.85)
shoe_mat = make_material("Shoes", (0.1, 0.08, 0.06), 0.5)
glasses_mat = make_material("Glasses", (0.08, 0.06, 0.04), 0.3, 0.8)
emblem_mat = make_material("Emblem", (0.72, 0.58, 0.22), 0.4, 0.6)

# ─── Proportions (chibi: big head, short body) ───
total_h = 1.2  # 120cm
head_r = 0.18
neck_r = 0.04
neck_len = 0.04
chest_w = 0.16
chest_d = 0.1
chest_h = 0.14
waist_w = 0.12
hip_w = 0.14
spine_h = 0.08
shoulder_w = 0.2
upper_arm = 0.12
lower_arm = 0.1
hand_len = 0.06
upper_leg = 0.14
lower_leg = 0.14
foot_len = 0.08
foot_h = 0.03

# Y offsets
feet_y = 0
ankle_y = lower_leg
knee_y = ankle_y + lower_leg
hip_y = knee_y + upper_leg
spine_y = hip_y + 0.05
chest_y = spine_y + spine_h
neck_y = chest_y + chest_h * 0.86
head_y = neck_y + neck_len
hair_y = head_y + head_r * 0.95

def add_sphere(name, location, scale, material, collection=body_col):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=location, segments=32, ring_count=16)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    link_to_collection(obj, collection)
    return obj

def add_cylinder(name, location, radius_top, radius_bot, depth, material, collection=body_col, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1, location=location, vertices=32)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (radius_top, radius_top, depth)
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    link_to_collection(obj, collection)
    return obj

# ═══════════════════════════════════════════
# HEAD
# ═══════════════════════════════════════════
add_sphere("Head", (0, head_y, 0), (head_r, head_r * 1.0, head_r * 0.95), skin_mat)
add_sphere("Jaw", (0, head_y - head_r * 0.56, head_r * 0.02), (head_r * 0.65, head_r * 0.52, head_r * 0.7), skin_mat)
add_sphere("Chin", (0, head_y - head_r * 0.68, head_r * 0.03), (head_r * 0.1, head_r * 0.08, head_r * 0.1), skin_mat)

# Cheekbones
add_sphere("CheekL", (-head_r * 0.42, head_y - head_r * 0.22, head_r * 0.25), (head_r * 0.75, head_r * 0.3, head_r * 0.3), skin_mat)
add_sphere("CheekR", (head_r * 0.42, head_y - head_r * 0.22, head_r * 0.25), (head_r * 0.75, head_r * 0.3, head_r * 0.3), skin_mat)

# ─── Eyes ───
eye_x = head_r * 0.36
eye_y = head_y - head_r * 0.04
eye_z = head_r * 0.6

for side, sx in [("L", -1), ("R", 1)]:
    x = sx * eye_x
    add_sphere(f"EyeWhite{side}", (x, eye_y, eye_z), (head_r * 0.16, head_r * 0.11, head_r * 0.05), eye_white_mat)
    add_sphere(f"Iris{side}", (x, eye_y - 0.005, eye_z + 0.02), (head_r * 0.11, head_r * 0.08, head_r * 0.04), iris_mat)
    add_sphere(f"Pupil{side}", (x, eye_y - 0.005, eye_z + 0.035), (head_r * 0.05, head_r * 0.03, head_r * 0.03), pupil_mat)
    add_sphere(f"EyeHighlight{side}", (x + head_r * 0.025, eye_y + head_r * 0.02, eye_z + 0.04), (head_r * 0.02, head_r * 0.015, head_r * 0.01), eye_white_mat)

# Eyebrows
for sx in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * eye_x, eye_y + head_r * 0.22, eye_z + 0.02))
    obj = bpy.context.active_object
    obj.name = f"Eyebrow{'L' if sx < 0 else 'R'}"
    obj.scale = (head_r * 0.2, head_r * 0.025, head_r * 0.025)
    obj.data.materials.append(hair_mat)
    link_to_collection(obj, body_col)

# Nose
add_sphere("NoseBridge", (0, eye_y - head_r * 0.2, eye_z + 0.12), (head_r * 0.035, head_r * 0.1, head_r * 0.04), skin_mat)
add_sphere("NoseTip", (0, eye_y - head_r * 0.28, eye_z + 0.13), (head_r * 0.05, head_r * 0.03, head_r * 0.04), skin_mat)

# Lips
add_sphere("LipsUpper", (0, head_y - head_r * 0.38, eye_z + 0.03), (head_r * 0.07, head_r * 0.022, head_r * 0.02), make_material("LipPink", (0.77, 0.44, 0.41), 0.7))
add_sphere("LipsLower", (0, head_y - head_r * 0.4, eye_z + 0.035), (head_r * 0.09, head_r * 0.03, head_r * 0.025), make_material("LipPink2", (0.83, 0.55, 0.48), 0.7))

# Ears
for sx in [-1, 1]:
    x = sx * head_r * 0.82
    add_sphere(f"Ear{side}", (x, eye_y + head_r * 0.02, -head_r * 0.02), (head_r * 0.02, head_r * 0.06, head_r * 0.05), skin_mat)

# ─── Neck ───
add_cylinder("Neck", (0, neck_y, 0), neck_r, neck_r * 1.1, neck_len, skin_mat)

# ═══════════════════════════════════════════
# HAIR (messy, layered)
# ═══════════════════════════════════════════
# Scalp cap
add_sphere("HairCap", (0, hair_y + head_r * 0.15, -head_r * 0.12), (head_r * 1.06, head_r * 1.0, head_r * 1.06), hair_mat)

# Messy tufts on crown
add_sphere("HairTuft1", (-head_r * 0.3, hair_y + head_r * 0.68, head_r * 0.16), (head_r * 0.46, head_r * 0.22, head_r * 0.42), hair_mat)
add_sphere("HairTuft2", (head_r * 0.28, hair_y + head_r * 0.72, head_r * 0.1), (head_r * 0.42, head_r * 0.24, head_r * 0.4), hair_mat)
add_sphere("HairTuft3", (0, hair_y + head_r * 0.78, 0), (head_r * 0.5, head_r * 0.26, head_r * 0.48), hair_mat)

# Fringe
add_sphere("Fringe", (0, hair_y + head_r * 0.55, head_r * 0.5), (head_r * 0.82, head_r * 0.13, head_r * 0.36), hair_mat)

# Side hair
for sx in [-1, 1]:
    add_sphere(f"SideHair{'L' if sx < 0 else 'R'}", (sx * head_r * 0.9, hair_y - head_r * 0.2, -head_r * 0.1), (head_r * 0.2, head_r * 0.4, head_r * 0.3), hair_mat)

# Back hair
add_sphere("BackHair", (0, hair_y - head_r * 0.5, -head_r * 0.6), (head_r * 0.7, head_r * 0.5, head_r * 0.5), hair_mat)

# ═══════════════════════════════════════════
# TORSO (under clothes)
# ═══════════════════════════════════════════
# Pelvis
add_sphere("Pelvis", (0, hip_y - 0.04, 0), (hip_w, 0.13, chest_d * 0.9), pants_mat, clothes_col)

# Spine -> chest (shirt visible at collar)
add_cylinder("Spine", (0, spine_y, 0), waist_w, chest_w, spine_h, shirt_mat, clothes_col)
add_cylinder("Chest", (0, chest_y, 0), chest_w, chest_w * 0.9, chest_h, shirt_mat, clothes_col)

# ═══════════════════════════════════════════
# SWEATER VEST
# ═══════════════════════════════════════════
add_cylinder("SweaterVest", (0, chest_y, 0), chest_w * 0.95, hip_w * 0.95, chest_h * 1.2, sweater_mat, clothes_col)

# ═══════════════════════════════════════════
# SHIRT COLLAR + TIE
# ═══════════════════════════════════════════
# White collar triangles
for sx in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * 0.03, neck_y - 0.01, chest_d * 0.5))
    obj = bpy.context.active_object
    obj.name = f"Collar{'L' if sx < 0 else 'R'}"
    obj.scale = (0.035, 0.025, 0.03)
    obj.rotation_euler = (0.3, 0, sx * 0.4)
    obj.data.materials.append(shirt_mat)
    link_to_collection(obj, clothes_col)

# Tie
add_cylinder("Tie", (0, chest_y + chest_h * 0.3, chest_d * 0.6), 0.015, 0.02, chest_h * 0.8, tie_mat, clothes_col)
# Tie knot
add_sphere("TieKnot", (0, chest_y + chest_h * 0.65, chest_d * 0.65), (0.02, 0.015, 0.015), tie_mat, clothes_col)

# ═══════════════════════════════════════════
# ROBE (long, flowing)
# ═══════════════════════════════════════════
# Robe body (open front)
bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1, location=(0, chest_y, 0), vertices=48)
obj = bpy.context.active_object
obj.name = "RobeBody"
obj.scale = (chest_w * 0.95, chest_w * 0.95, chest_h * 2.2)
obj.data.materials.append(robe_mat)
link_to_collection(obj, clothes_col)

# Robe hood (behind neck)
add_sphere("RobeHood", (0, neck_y + 0.02, -chest_d * 0.55), (chest_w * 0.32, chest_h * 0.34, chest_d * 0.5), robe_mat, clothes_col)

# Robe sleeves (wider than arms)
for sx in [-1, 1]:
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1, 
        location=(sx * shoulder_w, chest_y + chest_h * 0.3, 0), vertices=32)
    obj = bpy.context.active_object
    obj.name = f"RobeSleeve{'L' if sx < 0 else 'R'}"
    obj.scale = (0.05, 0.05, upper_arm + lower_arm)
    obj.rotation_euler = (0, 0, sx * 0.15)
    obj.data.materials.append(robe_mat)
    link_to_collection(obj, clothes_col)

# Gold trim on robe edges
for side_z in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, chest_y, side_z * chest_w * 0.93))
    obj = bpy.context.active_object
    obj.name = f"RobeTrimZ{'Front' if side_z > 0 else 'Back'}"
    obj.scale = (0.008, chest_h * 2.0, 0.008)
    obj.data.materials.append(robe_trim_mat)
    link_to_collection(obj, clothes_col)

# Gold trim on sleeves
for sx in [-1, 1]:
    bpy.ops.mesh.primitive_torus_add(major_radius=0.045, minor_radius=0.005,
        location=(sx * shoulder_w, chest_y - chest_h * 0.5, 0))
    obj = bpy.context.active_object
    obj.name = f"SleeveTrim{'L' if sx < 0 else 'R'}"
    obj.rotation_euler = (math.pi/2, 0, 0)
    obj.data.materials.append(robe_trim_mat)
    link_to_collection(obj, clothes_col)

# ═══════════════════════════════════════════
# LOTUS EMBLEM (back of robe)
# ═══════════════════════════════════════════
# Create lotus petals using scaled spheres
lotus_y = chest_y + chest_h * 0.1
lotus_z = -chest_w * 0.94

# Center petal
add_sphere("LotusCenter", (0, lotus_y, lotus_z), (0.015, 0.035, 0.008), emblem_mat, clothes_col)

# Side petals
for i, angle in enumerate([0.4, -0.4, 0.8, -0.8, 1.2, -1.2]):
    px = math.sin(angle) * 0.025
    py = lotus_y + math.cos(angle) * 0.03
    add_sphere(f"LotusPetal{i}", (px, py, lotus_z), (0.012, 0.03, 0.006), emblem_mat, clothes_col)

# ═══════════════════════════════════════════
# ARMS
# ═══════════════════════════════════════════
for side, sx in [("L", -1), ("R", 1)]:
    # Shoulder joint
    add_sphere(f"Shoulder{side}", (sx * shoulder_w, chest_y + chest_h * 0.72, 0), (0.04, 0.04, 0.04), skin_mat)
    
    # Upper arm (sleeved - robe material visible)
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1,
        location=(sx * shoulder_w, chest_y + chest_h * 0.72, 0), vertices=24)
    obj = bpy.context.active_object
    obj.name = f"UpperArm{side}"
    obj.scale = (0.03, 0.03, upper_arm)
    obj.rotation_euler = (0, 0, sx * 0.08)
    obj.data.materials.append(robe_mat)
    link_to_collection(obj, clothes_col)
    
    # Elbow
    elbow_y = chest_y + chest_h * 0.72 - upper_arm
    add_sphere(f"Elbow{side}", (sx * shoulder_w, elbow_y, 0), (0.025, 0.025, 0.025), skin_mat)
    
    # Lower arm (skin)
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1,
        location=(sx * shoulder_w, elbow_y, 0), vertices=24)
    obj = bpy.context.active_object
    obj.name = f"LowerArm{side}"
    obj.scale = (0.025, 0.025, lower_arm)
    obj.data.materials.append(skin_mat)
    link_to_collection(obj, body_col)
    
    # Hand
    hand_y = elbow_y - lower_arm
    add_sphere(f"Hand{side}", (sx * shoulder_w, hand_y - hand_len * 0.3, 0), (0.025, hand_len * 0.45, 0.02), skin_mat)
    
    # Fingers
    for fi, fx in enumerate([-0.007, -0.002, 0.003, 0.007]):
        bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1,
            location=(sx * shoulder_w + fx, hand_y - hand_len * 0.5, 0), vertices=8)
        obj = bpy.context.active_object
        obj.name = f"Finger{side}{fi}"
        obj.scale = (0.005, 0.005, hand_len * 0.25)
        obj.data.materials.append(skin_mat)
        link_to_collection(obj, body_col)

# ═══════════════════════════════════════════
# LEGS + PANTS
# ═══════════════════════════════════════════
for side, sx in [("L", -1), ("R", 1)]:
    x = sx * hip_w * 0.5
    
    # Hip joint
    add_sphere(f"Hip{side}", (x, hip_y, 0), (0.04, 0.04, 0.04), pants_mat, clothes_col)
    
    # Upper leg (pants)
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1, location=(x, hip_y, 0), vertices=24)
    obj = bpy.context.active_object
    obj.name = f"UpperLeg{side}"
    obj.scale = (0.04, 0.04, upper_leg)
    obj.data.materials.append(pants_mat)
    link_to_collection(obj, clothes_col)
    
    # Knee
    knee_pos = hip_y - upper_leg
    add_sphere(f"Knee{side}", (x, knee_pos, 0), (0.035, 0.035, 0.035), pants_mat, clothes_col)
    
    # Lower leg (pants)
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1, location=(x, knee_pos, 0), vertices=24)
    obj = bpy.context.active_object
    obj.name = f"LowerLeg{side}"
    obj.scale = (0.035, 0.035, lower_leg)
    obj.data.materials.append(pants_mat)
    link_to_collection(obj, clothes_col)

# ═══════════════════════════════════════════
# SHOES
# ═══════════════════════════════════════════
for side, sx in [("L", -1), ("R", 1)]:
    x = sx * hip_w * 0.5
    ankle_pos = knee_y - lower_leg
    
    # Ankle
    add_sphere(f"Ankle{side}", (x, ankle_pos, 0), (0.03, 0.03, 0.03), shoe_mat, clothes_col)
    
    # Shoe body
    add_sphere(f"ShoeBody{side}", (x, ankle_pos - 0.01, foot_len * 0.2), (0.035, 0.03, foot_len * 0.44), shoe_mat, clothes_col)
    
    # Toe cap
    add_sphere(f"ShoeToe{side}", (x, ankle_pos - 0.02, foot_len * 0.64), (0.03, 0.025, foot_len * 0.28), shoe_mat, clothes_col)
    
    # Sole
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, ankle_pos - 0.06, foot_len * 0.28))
    obj = bpy.context.active_object
    obj.name = f"Sole{side}"
    obj.scale = (0.038, 0.015, foot_len * 0.5)
    obj.data.materials.append(make_material("SoleBlack", (0.05, 0.04, 0.03), 0.9))
    link_to_collection(obj, clothes_col)

# ═══════════════════════════════════════════
# ROUND GLASSES
# ═══════════════════════════════════════════
glass_z = eye_z + 0.04

# Lens frames (torus)
for sx in [-1, 1]:
    bpy.ops.mesh.primitive_torus_add(major_radius=0.035, minor_radius=0.003,
        location=(sx * eye_x, eye_y, glass_z))
    obj = bpy.context.active_object
    obj.name = f"GlassesFrame{'L' if sx < 0 else 'R'}"
    obj.rotation_euler = (math.pi/2, 0, 0)
    obj.data.materials.append(glasses_mat)
    link_to_collection(obj, accessories_col)

# Bridge
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, eye_y, glass_z))
obj = bpy.context.active_object
obj.name = "GlassesBridge"
obj.scale = (0.025, 0.005, 0.004)
obj.data.materials.append(glasses_mat)
link_to_collection(obj, accessories_col)

# Arms (temples)
for sx in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * (eye_x + 0.04), eye_y, glass_z - 0.04))
    obj = bpy.context.active_object
    obj.name = f"GlassesArm{'L' if sx < 0 else 'R'}"
    obj.scale = (0.004, 0.004, 0.08)
    obj.data.materials.append(glasses_mat)
    link_to_collection(obj, accessories_col)

# ═══════════════════════════════════════════
# SETUP
# ═══════════════════════════════════════════
# Parent all to an empty for easy transforms
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
root = bpy.context.active_object
root.name = "Schoolboy_Root"

# Select all objects except root
bpy.ops.object.select_all(action='DESELECT')
for col in [body_col, clothes_col, accessories_col]:
    for obj in col.objects:
        obj.select_set(True)

# Parent to root
bpy.context.view_layer.objects.active = root
bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)

# Set origin to feet
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

# Camera + light
bpy.ops.object.camera_add(location=(0, 1.0, -2.5))
cam = bpy.context.active_object
cam.rotation_euler = (math.radians(80), 0, 0)
bpy.context.scene.camera = cam

bpy.ops.object.light_add(type='AREA', location=(1, 2, 1))
light = bpy.context.active_object
light.data.energy = 200

bpy.ops.object.light_add(type='AREA', location=(-1, 1.5, -1))
light2 = bpy.context.active_object
light2.data.energy = 100

print("Schoolboy character created! ~120cm tall with Hogwarts robe, glasses, and lotus emblem.")
