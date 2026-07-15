"""
Blender Python script: Create a green alien character with big black eyes,
antennae and a sleek dark jumpsuit. Same skeleton/animations as the others.
Run: blender.exe --background --python blender_alien.py
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

# Alien materials
mat_alien_skin = make_mat("AlienSkin", (0.32, 0.78, 0.36, 1), roughness=0.55, metalness=0.0)
mat_alien_belly = make_mat("AlienBelly", (0.55, 0.88, 0.5, 1), roughness=0.6, metalness=0.0)
mat_alien_dark = make_mat("AlienDark", (0.06, 0.09, 0.08, 1), roughness=0.6, metalness=0.2)
mat_alien_metal = make_mat("AlienMetal", (0.3, 0.35, 0.32, 1), roughness=0.3, metalness=0.85)
mat_alien_eye = make_mat("AlienEye", (0.02, 0.02, 0.03, 1), roughness=0.1, metalness=0.0)
mat_alien_glow = make_mat("AlienGlow", (0.5, 1.0, 0.6, 1), roughness=0.2,
                          metalness=0.0, emissive=(0.4, 1.0, 0.5), emissive_strength=3.0)

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

# ── Body dimensions (slim, taller alien proportions) ─────────────────────────
head_r = 0.13
neck_r = 0.05
neck_len = 0.06
chest_w = 0.135
chest_d = 0.10
chest_h = 0.27
waist_w = 0.11
hip_w = 0.115
hip_d = 0.10
shoulder_w = 0.17
spine_h = 0.21
hips_y = 0.9
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
        (0.046, 0.046, 0.046),
        (0.25, 0.05, 0.05),
        (0.46, 0.053, 0.053),
        (0.65, 0.07, 0.07),
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
body.data.materials.append(mat_alien_skin)
body.name = "AlienBody"

# ── Alien Head (elongated, big black eyes, antennae) ─────────────────────────
head_y = hips_y + spine_h + chest_h + neck_len + head_r * 0.5
head_z = head_r * 0.6

# Elongated green skull
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=head_r * 1.1,
    location=(0, head_y, head_z))
skull = bpy.context.active_object
skull.name = "AlienSkull"
skull.scale = (1, 1.18, 0.92)
skull.data.materials.append(mat_alien_skin)
bpy.ops.object.shade_smooth()

# Chin taper (elongated alien jaw)
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=head_r * 0.7, radius2=0.0,
    depth=head_r * 0.9, location=(0, head_y - head_r * 0.9, head_z * 0.6))
chin = bpy.context.active_object
chin.name = "AlienChin"
chin.rotation_euler = (math.pi, 0, 0)
chin.scale = (1, 1, 0.8)
chin.data.materials.append(mat_alien_skin)
bpy.ops.object.shade_smooth()

# Two large black almond eyes (flattened discs on the face surface)
for side in [-1, 1]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=head_r * 0.42,
        location=(side * head_r * 0.42, head_y + head_r * 0.05, head_z + head_r * 1.0))
    eye = bpy.context.active_object
    eye.name = f"AlienEye{'L' if side < 0 else 'R'}"
    eye.scale = (0.5, 1.15, 0.18)
    eye.data.materials.append(mat_alien_eye)
    bpy.ops.object.shade_smooth()
    # glowing pupil slit
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=head_r * 0.12,
        location=(side * head_r * 0.42, head_y + head_r * 0.05, head_z + head_r * 1.12))
    slit = bpy.context.active_object
    slit.name = f"AlienPupil{'L' if side < 0 else 'R'}"
    slit.scale = (0.28, 0.85, 0.28)
    slit.data.materials.append(mat_alien_glow)
    bpy.ops.object.shade_smooth()

# Antennae (two thin stalks with glowing bulbs)
for side in [-1, 1]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.008, depth=0.14,
        location=(side * head_r * 0.3, head_y + head_r * 1.25, head_z))
    stalk = bpy.context.active_object
    stalk.name = f"AlienAntenna{side}"
    stalk.rotation_euler = (0, 0, side * 0.25)
    stalk.data.materials.append(mat_alien_metal)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.02,
        location=(side * head_r * 0.45, head_y + head_r * 1.4, head_z))
    bulb = bpy.context.active_object
    bulb.name = f"AlienAntennaBulb{side}"
    bulb.data.materials.append(mat_alien_glow)
    bpy.ops.object.shade_smooth()

# Neck
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=neck_r * 1.2, depth=0.07,
    location=(0, head_y - head_r * 1.05, head_z * 0.2))
neck = bpy.context.active_object
neck.name = "AlienNeck"
neck.rotation_euler = (math.pi / 2, 0, 0)
neck.data.materials.append(mat_alien_skin)

# ── Alien Jumpsuit (dark, slim) ──────────────────────────────────────────────
def create_suit():
    mesh = bpy.data.meshes.new("SuitMesh")
    obj = bpy.data.objects.new("Suit", mesh)
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

suit = create_suit()
suit.data.materials.append(mat_alien_dark)
suit.name = "AlienSuit"

# Glowing green chest emblem
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.04, depth=0.03,
    location=(0, torso_bottom + spine_h + chest_h * 0.5, chest_d + 0.02))
emblem = bpy.context.active_object
emblem.name = "AlienEmblem"
emblem.rotation_euler = (math.pi / 2, 0, 0)
emblem.data.materials.append(mat_alien_glow)

# ── Arms (green skin, slim) ──────────────────────────────────────────────────
shoulder_y = torso_bottom + spine_h + chest_h * 0.86
arm_len = 0.28
forearm_len = 0.25

for side, x_sign in [("L", -1), ("R", 1)]:
    sx = x_sign * shoulder_w * 0.95
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.045, radius2=0.038,
        depth=arm_len, location=(sx, shoulder_y - arm_len / 2, 0))
    upper = bpy.context.active_object
    upper.name = f"AlienArmUpper{side}"
    upper.data.materials.append(mat_alien_skin)
    bpy.ops.object.shade_smooth()

    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.038, radius2=0.03,
        depth=forearm_len, location=(sx, shoulder_y - arm_len - forearm_len / 2, 0))
    lower = bpy.context.active_object
    lower.name = f"AlienArmLower{side}"
    lower.data.materials.append(mat_alien_skin)
    bpy.ops.object.shade_smooth()

    # Three-fingered hand (slim)
    hand_y = shoulder_y - arm_len - forearm_len
    for fx in [-0.025, 0, 0.025]:
        bpy.ops.mesh.primitive_capsule_add(radius=0.012, depth=0.05,
            location=(sx + fx, hand_y - 0.04, 0))
        finger = bpy.context.active_object
        finger.name = f"AlienFinger{side}{fx}"
        finger.data.materials.append(mat_alien_skin)
        bpy.ops.object.shade_smooth()

# ── Legs (green skin, slim) ──────────────────────────────────────────────────
for side, x_off in [("L", -hip_w), ("R", hip_w)]:
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.06, radius2=0.05,
        depth=0.40, location=(x_off, torso_bottom - 0.26, 0))
    leg_upper = bpy.context.active_object
    leg_upper.name = f"AlienLegUpper{side}"
    leg_upper.data.materials.append(mat_alien_skin)
    bpy.ops.object.shade_smooth()

    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.05, radius2=0.04,
        depth=0.40, location=(x_off, torso_bottom - 0.66, 0))
    leg_lower = bpy.context.active_object
    leg_lower.name = f"AlienLegLower{side}"
    leg_lower.data.materials.append(mat_alien_skin)
    bpy.ops.object.shade_smooth()

    # Slim elongated foot
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.06,
        location=(x_off, 0.07, 0.06))
    foot = bpy.context.active_object
    foot.name = f"AlienFoot{side}"
    foot.scale = (0.95, 0.7, 1.7)
    foot.data.materials.append(mat_alien_skin)
    bpy.ops.object.shade_smooth()

    # Three toes at the front of the foot
    for tx in [-0.035, 0, 0.035]:
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.018, radius2=0.01,
            depth=0.06, location=(x_off + tx, 0.06, 0.16))
        toe = bpy.context.active_object
        toe.name = f"AlienToe{side}{tx}"
        toe.rotation_euler = (math.pi / 2, 0, 0)
        toe.data.materials.append(mat_alien_skin)
        bpy.ops.object.shade_smooth()

# ── Join all mesh parts into one object ──────────────────────────────────────
body_obj = bpy.data.objects["AlienBody"]
bpy.context.view_layer.objects.active = body_obj
body_obj.select_set(True)

for obj in bpy.data.objects:
    if obj.type == 'MESH' and obj.name != "AlienBody":
        obj.select_set(True)

bpy.ops.object.join()
body_obj = bpy.context.active_object
body_obj.name = "AlienCharacter"

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
    add_bone(f"legLower{side}", (lx, knee_y, 0), (lk := knee_y - lower_leg, 0), f"legUpper{side}", True)
    foot_y = knee_y - lower_leg
    add_bone(f"foot{side}", (lx, foot_y, 0), (lx, foot_y + 0.02, 0.12), f"legLower{side}", True)

bpy.ops.object.mode_set(mode='OBJECT')

# ── Parent mesh to armature ───────────────────────────────────────────────────
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

# ── Initialize animation data ────────────────────────────────────────────────
if not armature_obj.animation_data:
    armature_obj.animation_data_create()

action_idle = bpy.data.actions.new("Idle")
action_walk = bpy.data.actions.new("Walk")
action_run = bpy.data.actions.new("Run")
action_jump = bpy.data.actions.new("Jump")
action_sit = bpy.data.actions.new("Sit")

fps = 24

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

# ── IDLE ─────────────────────────────────────────────────────────────────────
armature_obj.animation_data.action = action_idle
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
    keyframe_bone(armature_obj, "armUpperL", f, rotation=(0.08 + breath * 0.5, 0, -0.06))
    keyframe_bone(armature_obj, "armUpperR", f, rotation=(0.08 + breath * 0.5, 0, 0.06))
    keyframe_bone(armature_obj, "armLowerL", f, rotation=(0.15, 0, -0.04))
    keyframe_bone(armature_obj, "armLowerR", f, rotation=(0.15, 0, 0.04))

# ── WALK ─────────────────────────────────────────────────────────────────────
armature_obj.animation_data.action = action_walk
for f in range(1, 49):
    t = f / fps
    phase = t * 4.5
    s = math.sin(phase)
    c = math.cos(phase)
    leg_swing = 0.45
    knee_bend = 0.7
    arm_swing = 0.35
    lean = 0.1
    keyframe_bone(armature_obj, "hips", f, rotation=(lean * 0.4, 0, 0))
    keyframe_bone(armature_obj, "spine", f, rotation=(lean * 0.5, 0, 0))
    keyframe_bone(armature_obj, "chest", f, rotation=(lean * 0.3, -s * 0.05, 0))
    keyframe_bone(armature_obj, "head", f, rotation=(-lean * 0.2, s * 0.025, 0))
    knee_l = max(0, -c) * knee_bend
    knee_r = max(0, c) * knee_bend
    keyframe_bone(armature_obj, "legUpperL", f, rotation=(s * leg_swing, 0, 0))
    keyframe_bone(armature_obj, "legUpperR", f, rotation=(-s * leg_swing, 0, 0))
    keyframe_bone(armature_obj, "legLowerL", f, rotation=(knee_l, 0, 0))
    keyframe_bone(armature_obj, "legLowerR", f, rotation=(knee_r, 0, 0))
    keyframe_bone(armature_obj, "footL", f, rotation=(-s * leg_swing * 0.4, 0, 0))
    keyframe_bone(armature_obj, "footR", f, rotation=(s * leg_swing * 0.4, 0, 0))
    carry = 0.25
    keyframe_bone(armature_obj, "armUpperL", f, rotation=(-s * arm_swing, 0, 0.07))
    keyframe_bone(armature_obj, "armUpperR", f, rotation=(s * arm_swing, 0, -0.07))
    keyframe_bone(armature_obj, "armLowerL", f, rotation=(carry + max(0, -s) * 0.18, 0, 0.05))
    keyframe_bone(armature_obj, "armLowerR", f, rotation=(carry + max(0, s) * 0.18, 0, -0.05))

# ── RUN ──────────────────────────────────────────────────────────────────────
armature_obj.animation_data.action = action_run
for f in range(1, 49):
    t = f / fps
    phase = t * 7
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

# ── JUMP ─────────────────────────────────────────────────────────────────────
armature_obj.animation_data.action = action_jump
for f in range(1, 49):
    t = f / fps
    if f <= 16:
        p = f / 16
        keyframe_bone(armature_obj, "hips", f, location=(0, -0.06 * p, 0))
        keyframe_bone(armature_obj, "legUpperL", f, rotation=(0.3 * p, 0, 0))
        keyframe_bone(armature_obj, "legUpperR", f, rotation=(0.3 * p, 0, 0))
        keyframe_bone(armature_obj, "legLowerL", f, rotation=(0.6 * p, 0, 0))
        keyframe_bone(armature_obj, "legLowerR", f, rotation=(0.6 * p, 0, 0))
        keyframe_bone(armature_obj, "armUpperL", f, rotation=(0.3 * p, 0, -0.1))
        keyframe_bone(armature_obj, "armUpperR", f, rotation=(0.3 * p, 0, 0.1))
    elif f <= 32:
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
        p = (f - 32) / 16
        squash = (1 - p) * 0.8
        keyframe_bone(armature_obj, "hips", f, location=(0, squash * 0.05, 0))
        keyframe_bone(armature_obj, "legUpperL", f, rotation=(0.4 * squash, 0, 0))
        keyframe_bone(armature_obj, "legUpperR", f, rotation=(0.4 * squash, 0, 0))
        keyframe_bone(armature_obj, "legLowerL", f, rotation=(0.8 * squash, 0, 0))
        keyframe_bone(armature_obj, "legLowerR", f, rotation=(0.8 * squash, 0, 0))
        keyframe_bone(armature_obj, "armUpperL", f, rotation=(-0.2 * squash, 0, 0.15))
        keyframe_bone(armature_obj, "armUpperR", f, rotation=(-0.2 * squash, 0, -0.15))

# ── SIT ──────────────────────────────────────────────────────────────────────
armature_obj.animation_data.action = action_sit
for f in range(1, 49):
    t = f / fps
    breath = math.sin(t * 1.2) * 0.015
    keyframe_bone(armature_obj, "hips", f, location=(0, -0.26, 0), rotation=(0.06, 0, 0))
    keyframe_bone(armature_obj, "spine", f, rotation=(0.03, 0, 0))
    keyframe_bone(armature_obj, "chest", f, rotation=(0.03 + breath, 0, 0))
    keyframe_bone(armature_obj, "head", f, rotation=(-0.06, breath * 2, 0))
    keyframe_bone(armature_obj, "legUpperL", f, rotation=(-1.48, 0, 0.05))
    keyframe_bone(armature_obj, "legUpperR", f, rotation=(-1.48, 0, -0.05))
    keyframe_bone(armature_obj, "legLowerL", f, rotation=(1.55, 0, 0))
    keyframe_bone(armature_obj, "legLowerR", f, rotation=(1.55, 0, 0))
    keyframe_bone(armature_obj, "footL", f, rotation=(0.18, 0, 0))
    keyframe_bone(armature_obj, "footR", f, rotation=(0.18, 0, 0))
    keyframe_bone(armature_obj, "armUpperL", f, rotation=(0.15, 0, -0.08))
    keyframe_bone(armature_obj, "armUpperR", f, rotation=(0.15, 0, 0.08))
    keyframe_bone(armature_obj, "armLowerL", f, rotation=(1.1, 0, 0.1))
    keyframe_bone(armature_obj, "armLowerR", f, rotation=(1.1, 0, -0.1))

for act in [action_idle, action_walk, action_run, action_jump, action_sit]:
    act.use_frame_range = True
    act.frame_start = 1
    act.frame_end = 48

armature_obj.animation_data.action = action_idle
scene.frame_set(1)

armature_obj.animation_data.use_nla = True
for act in [action_idle, action_walk, action_run, action_jump, action_sit]:
    strip = armature_obj.animation_data.nla_tracks.new()
    strip.name = act.name
    nla_strip = strip.strips.new(act.name, 1, act)
    nla_strip.frame_start = 1
    nla_strip.frame_end = 48

armature_obj.animation_data.use_nla = False

import os
export_path = os.path.join(os.path.dirname(bpy.data.filepath) or r"C:\Users\taksh\studyforest\public\models", "avatars", "alien.glb")
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
print("=== ALIEN CHARACTER CREATED SUCCESSFULLY ===")
