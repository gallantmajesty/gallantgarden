"""
02_locomotion.py - Full locomotion animation library
Usage: blender --background --python 02_locomotion.py -- <input.blend> <output.blend>

Animations created:
  Idle (30f)  - breathing, subtle sway
  Walk (30f)  - natural walk cycle
  Run (24f)   - running cycle
  Sprint (20f) - fast run
  Jump (30f)  - crouch/launch/air/land
  Crouch (20f) - crouch idle
  Wave (40f)  - friendly wave gesture
  Dance (60f) - simple dance loop

Part of the FocusLily Realms character template system.
"""
import bpy
import sys
import math
from mathutils import Vector

# ── PARSE ARGS ────────────────────────────────────────────────────
argv = sys.argv
if "--" in argv:
    args = argv[argv.index("--") + 1:]
else:
    args = []

INPUT = args[0] if len(args) > 0 else r"C:\Users\taksh\Downloads\textured_mesh_rigged.blend"
OUTPUT = args[1] if len(args) > 1 else r"C:\Users\taksh\Downloads\textured_mesh_animated.blend"
FPS = int(args[2]) if len(args) > 2 else 30


def log(msg):
    print(f"[locomotion] {msg}")


def get_arm_obj():
    """Get the Armature object."""
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE':
            return obj
    raise RuntimeError("No armature found")


def kf(action, arm_obj, bone_name, frame, rot_xyz, loc_xyz=None):
    """Insert a keyframe for a bone."""
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


# ── ANIMATION DEFINITIONS ────────────────────────────────────────

def anim_idle(arm_obj, start, duration=30):
    """Idle animation - breathing and subtle sway."""
    action = bpy.data.actions.new("Idle")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration
        a = t * math.pi * 2
        br = math.sin(a) * 0.02

        kf(action, arm_obj, "Spine", f, (br * 0.5, 0, 0))
        kf(action, arm_obj, "Spine1", f, (br * 0.8, 0, 0))
        kf(action, arm_obj, "Spine2", f, (br, 0, 0))
        kf(action, arm_obj, "Head", f, (math.sin(a) * 0.01, 0, 0))
        kf(action, arm_obj, "LeftUpperArm", f, (0, 0, math.sin(a) * 0.02))
        kf(action, arm_obj, "RightUpperArm", f, (0, 0, -math.sin(a) * 0.02))
    log(f"Idle: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_walk(arm_obj, start, duration=30):
    """Walk cycle - natural stride with arm swing."""
    action = bpy.data.actions.new("Walk")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration
        a = t * math.pi * 2

        hip_y = math.sin(a * 2) * 0.015
        kf(action, arm_obj, "Hips", f, (0, 0, -hip_y), (0, 0, hip_y))
        kf(action, arm_obj, "Spine", f, (math.sin(a) * 0.05, 0, 0))
        kf(action, arm_obj, "Spine2", f, (-math.sin(a) * 0.03, 0, 0))

        ll, rl = math.sin(a), math.sin(a + math.pi)
        kf(action, arm_obj, "LeftUpperLeg", f, (ll * 0.5, 0, 0))
        kf(action, arm_obj, "LeftLowerLeg", f, (max(0, -ll) * 0.8, 0, 0))
        kf(action, arm_obj, "LeftFoot", f, (ll * 0.2, 0, 0))
        kf(action, arm_obj, "RightUpperLeg", f, (rl * 0.5, 0, 0))
        kf(action, arm_obj, "RightLowerLeg", f, (max(0, -rl) * 0.8, 0, 0))
        kf(action, arm_obj, "RightFoot", f, (rl * 0.2, 0, 0))

        kf(action, arm_obj, "LeftUpperArm", f, (-ll * 0.4, 0, 0))
        kf(action, arm_obj, "LeftLowerArm", f, (max(0, ll) * 0.3, 0, 0))
        kf(action, arm_obj, "RightUpperArm", f, (-rl * 0.4, 0, 0))
        kf(action, arm_obj, "RightLowerArm", f, (max(0, rl) * 0.3, 0, 0))

        kf(action, arm_obj, "Head", f, (-abs(math.sin(a)) * 0.03, 0, 0))
    log(f"Walk: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_run(arm_obj, start, duration=24):
    """Run cycle - faster with bigger range of motion."""
    action = bpy.data.actions.new("Run")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration
        a = t * math.pi * 2

        hip_y = math.sin(a * 2) * 0.04
        kf(action, arm_obj, "Hips", f, (0, 0, -hip_y * 0.5), (0, 0, hip_y))
        kf(action, arm_obj, "Spine", f, (0.1 + math.sin(a) * 0.08, 0, 0))
        kf(action, arm_obj, "Spine2", f, (-math.sin(a) * 0.05, 0, 0))

        ll, rl = math.sin(a), math.sin(a + math.pi)
        kf(action, arm_obj, "LeftUpperLeg", f, (ll * 0.8, 0, 0))
        kf(action, arm_obj, "LeftLowerLeg", f, (max(0, -ll) * 1.2, 0, 0))
        kf(action, arm_obj, "LeftFoot", f, (ll * 0.3, 0, 0))
        kf(action, arm_obj, "RightUpperLeg", f, (rl * 0.8, 0, 0))
        kf(action, arm_obj, "RightLowerLeg", f, (max(0, -rl) * 1.2, 0, 0))
        kf(action, arm_obj, "RightFoot", f, (rl * 0.3, 0, 0))

        kf(action, arm_obj, "LeftUpperArm", f, (-ll * 0.7, 0, 0))
        kf(action, arm_obj, "LeftLowerArm", f, (max(0, ll) * 0.5 + 0.3, 0, 0))
        kf(action, arm_obj, "RightUpperArm", f, (-rl * 0.7, 0, 0))
        kf(action, arm_obj, "RightLowerArm", f, (max(0, rl) * 0.5 + 0.3, 0, 0))

        kf(action, arm_obj, "Head", f, (-abs(math.sin(a)) * 0.06, 0, 0))
    log(f"Run: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_sprint(arm_obj, start, duration=20):
    """Sprint - maximum speed run cycle."""
    action = bpy.data.actions.new("Sprint")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration
        a = t * math.pi * 2

        hip_y = math.sin(a * 2) * 0.06
        kf(action, arm_obj, "Hips", f, (0.15, 0, -hip_y * 0.3), (0, 0, hip_y))
        kf(action, arm_obj, "Spine", f, (0.18 + math.sin(a) * 0.12, 0, 0))
        kf(action, arm_obj, "Spine2", f, (0.05 - math.sin(a) * 0.08, 0, 0))

        ll, rl = math.sin(a), math.sin(a + math.pi)
        kf(action, arm_obj, "LeftUpperLeg", f, (ll * 1.1, 0, 0))
        kf(action, arm_obj, "LeftLowerLeg", f, (max(0, -ll) * 1.6, 0, 0))
        kf(action, arm_obj, "LeftFoot", f, (ll * 0.4, 0, 0))
        kf(action, arm_obj, "RightUpperLeg", f, (rl * 1.1, 0, 0))
        kf(action, arm_obj, "RightLowerLeg", f, (max(0, -rl) * 1.6, 0, 0))
        kf(action, arm_obj, "RightFoot", f, (rl * 0.4, 0, 0))

        kf(action, arm_obj, "LeftUpperArm", f, (-ll * 1.0, 0, 0))
        kf(action, arm_obj, "LeftLowerArm", f, (max(0, ll) * 0.6 + 0.5, 0, 0))
        kf(action, arm_obj, "RightUpperArm", f, (-rl * 1.0, 0, 0))
        kf(action, arm_obj, "RightLowerArm", f, (max(0, rl) * 0.6 + 0.5, 0, 0))

        kf(action, arm_obj, "Head", f, (-abs(math.sin(a)) * 0.09, 0, 0))
    log(f"Sprint: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_jump(arm_obj, start, duration=30):
    """Jump - crouch, launch, air, land."""
    action = bpy.data.actions.new("Jump")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration

        if t < 0.2:  # Crouch
            c = t / 0.2
            kf(action, arm_obj, "Hips", f, (0, 0, 0), (0, 0, -c * 0.15))
            kf(action, arm_obj, "LeftUpperLeg", f, (c * 0.5, 0, 0))
            kf(action, arm_obj, "RightUpperLeg", f, (c * 0.5, 0, 0))
            kf(action, arm_obj, "LeftLowerLeg", f, (c * 0.6, 0, 0))
            kf(action, arm_obj, "RightLowerLeg", f, (c * 0.6, 0, 0))
            kf(action, arm_obj, "Spine", f, (-c * 0.1, 0, 0))
        elif t < 0.35:  # Launch
            l = (t - 0.2) / 0.15
            kf(action, arm_obj, "Hips", f, (0, 0, 0), (0, 0, l * 0.5))
            kf(action, arm_obj, "LeftUpperArm", f, (0, 0, -l * 0.8))
            kf(action, arm_obj, "RightUpperArm", f, (0, 0, l * 0.8))
            kf(action, arm_obj, "LeftUpperLeg", f, (-l * 0.3, 0, 0))
            kf(action, arm_obj, "RightUpperLeg", f, (-l * 0.3, 0, 0))
        elif t < 0.65:  # Air
            air = (t - 0.35) / 0.3
            p = math.sin(air * math.pi)
            kf(action, arm_obj, "Hips", f, (0, 0, 0), (0, 0, 0.5 * p))
            kf(action, arm_obj, "LeftUpperLeg", f, (-0.3 * p, 0, 0))
            kf(action, arm_obj, "RightUpperLeg", f, (-0.3 * p, 0, 0))
            kf(action, arm_obj, "LeftUpperArm", f, (0, 0, -0.5 * p))
            kf(action, arm_obj, "RightUpperArm", f, (0, 0, 0.5 * p))
            kf(action, arm_obj, "LeftLowerLeg", f, (0.4 * p, 0, 0))
            kf(action, arm_obj, "RightLowerLeg", f, (0.4 * p, 0, 0))
        else:  # Land
            land = (t - 0.65) / 0.35
            d = 1 - land
            kf(action, arm_obj, "Hips", f, (0, 0, 0), (0, 0, d * 0.05))
            kf(action, arm_obj, "Spine", f, (d * 0.1, 0, 0))
            kf(action, arm_obj, "LeftUpperLeg", f, (d * 0.3, 0, 0))
            kf(action, arm_obj, "RightUpperLeg", f, (d * 0.3, 0, 0))
            kf(action, arm_obj, "LeftLowerLeg", f, (d * 0.2, 0, 0))
            kf(action, arm_obj, "RightLowerLeg", f, (d * 0.2, 0, 0))
    log(f"Jump: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_crouch(arm_obj, start, duration=20):
    """Crouch idle - sustained crouching position."""
    action = bpy.data.actions.new("Crouch")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration
        a = t * math.pi * 2

        kf(action, arm_obj, "Hips", f, (0, 0, 0), (0, 0, -0.15))
        kf(action, arm_obj, "Spine", f, (-0.1 + math.sin(a) * 0.01, 0, 0))
        kf(action, arm_obj, "LeftUpperLeg", f, (0.5, 0, 0))
        kf(action, arm_obj, "RightUpperLeg", f, (0.5, 0, 0))
        kf(action, arm_obj, "LeftLowerLeg", f, (0.6, 0, 0))
        kf(action, arm_obj, "RightLowerLeg", f, (0.6, 0, 0))
        kf(action, arm_obj, "LeftUpperArm", f, (0.3, 0, 0))
        kf(action, arm_obj, "RightUpperArm", f, (0.3, 0, 0))
        kf(action, arm_obj, "LeftLowerArm", f, (-0.3, 0, 0))
        kf(action, arm_obj, "RightLowerArm", f, (-0.3, 0, 0))
    log(f"Crouch: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_wave(arm_obj, start, duration=40):
    """Wave - friendly greeting gesture."""
    action = bpy.data.actions.new("Wave")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration

        if t < 0.15:  # Raise arm
            r = t / 0.15
            kf(action, arm_obj, "RightUpperArm", f, (0, 0, -r * 1.2))
            kf(action, arm_obj, "RightLowerArm", f, (-r * 0.8, 0, 0))
            kf(action, arm_obj, "Spine2", f, (0, 0, r * 0.05))
        elif t < 0.85:  # Wave
            wt = (t - 0.15) / 0.7
            wave = math.sin(wt * math.pi * 4) * 0.3
            kf(action, arm_obj, "RightUpperArm", f, (0, 0, -1.2))
            kf(action, arm_obj, "RightLowerArm", f, (-0.8 + wave, 0, 0))
            kf(action, arm_obj, "Spine2", f, (0, 0, 0.05))
            kf(action, arm_obj, "Head", f, (0, 0, wave * 0.1))
        else:  # Lower arm
            r = (t - 0.85) / 0.15
            kf(action, arm_obj, "RightUpperArm", f, (0, 0, -1.2 * (1 - r)))
            kf(action, arm_obj, "RightLowerArm", f, (-0.8 * (1 - r), 0, 0))
            kf(action, arm_obj, "Spine2", f, (0, 0, 0.05 * (1 - r)))
    log(f"Wave: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_dance(arm_obj, start, duration=60):
    """Dance - simple rhythmic dance loop."""
    action = bpy.data.actions.new("Dance")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration
        a = t * math.pi * 2

        # Bounce
        bounce = abs(math.sin(a * 4)) * 0.05
        kf(action, arm_obj, "Hips", f, (0, 0, 0), (0, 0, -bounce))

        # Sway
        sway = math.sin(a * 4) * 0.08
        kf(action, arm_obj, "Spine", f, (0, 0, sway))
        kf(action, arm_obj, "Spine2", f, (0, 0, -sway * 0.5))

        # Arms alternate
        arm1 = math.sin(a * 4) * 0.6
        arm2 = math.sin(a * 4 + math.pi) * 0.6
        kf(action, arm_obj, "LeftUpperArm", f, (0, 0, arm1))
        kf(action, arm_obj, "LeftLowerArm", f, (abs(arm1) * 0.3, 0, 0))
        kf(action, arm_obj, "RightUpperArm", f, (0, 0, arm2))
        kf(action, arm_obj, "RightLowerArm", f, (abs(arm2) * 0.3, 0, 0))

        # Legs
        kf(action, arm_obj, "LeftUpperLeg", f, (bounce * 2, 0, 0))
        kf(action, arm_obj, "RightUpperLeg", f, (bounce * 2, 0, 0))

        # Head groove
        kf(action, arm_obj, "Head", f, (0, 0, sway * 0.3))
    log(f"Dance: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_nod(arm_obj, start, duration=20):
    """Nod - affirmative head nod."""
    action = bpy.data.actions.new("Nod")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration
        if t < 0.3:
            n = t / 0.3
            kf(action, arm_obj, "Head", f, (n * 0.15, 0, 0))
            kf(action, arm_obj, "Neck", f, (n * 0.08, 0, 0))
        elif t < 0.5:
            n = (t - 0.3) / 0.2
            kf(action, arm_obj, "Head", f, ((1 - n) * 0.15, 0, 0))
            kf(action, arm_obj, "Neck", f, ((1 - n) * 0.08, 0, 0))
        elif t < 0.7:
            n = (t - 0.5) / 0.2
            kf(action, arm_obj, "Head", f, (n * 0.15, 0, 0))
            kf(action, arm_obj, "Neck", f, (n * 0.08, 0, 0))
        else:
            n = (t - 0.7) / 0.3
            kf(action, arm_obj, "Head", f, ((1 - n) * 0.15, 0, 0))
            kf(action, arm_obj, "Neck", f, ((1 - n) * 0.08, 0, 0))
    log(f"Nod: {duration} frames ({start}-{start + duration - 1})")
    return action


def anim_shake(arm_obj, start, duration=24):
    """Shake - head shake (disagreement)."""
    action = bpy.data.actions.new("Shake")
    action.frame_range = (start, start + duration - 1)
    for f in range(start, start + duration):
        t = (f - start) / duration
        a = t * math.pi * 2
        shake = math.sin(a * 3) * 0.12
        kf(action, arm_obj, "Head", f, (0, 0, shake))
        kf(action, arm_obj, "Neck", f, (0, 0, shake * 0.5))
    log(f"Shake: {duration} frames ({start}-{start + duration - 1})")
    return action


# ── MAIN ──────────────────────────────────────────────────────────
def main():
    log(f"Input: {INPUT}")
    log(f"Output: {OUTPUT}")

    # Load the rigged file
    if INPUT.endswith(".glb") or INPUT.endswith(".gltf"):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=INPUT)
    else:
        bpy.ops.wm.open_mainfile(filepath=INPUT)

    arm_obj = get_arm_obj()
    log(f"Found armature: {arm_obj.name}")

    # Setup animation data
    arm_obj.animation_data_create()

    # Chain all animations sequentially
    frame = 1
    actions = []

    actions.append(anim_idle(arm_obj, frame, 30));    frame += 30
    actions.append(anim_walk(arm_obj, frame, 30));    frame += 30
    actions.append(anim_run(arm_obj, frame, 24));     frame += 24
    actions.append(anim_sprint(arm_obj, frame, 20));  frame += 20
    actions.append(anim_jump(arm_obj, frame, 30));    frame += 30
    actions.append(anim_crouch(arm_obj, frame, 20));  frame += 20
    actions.append(anim_wave(arm_obj, frame, 40));    frame += 40
    actions.append(anim_dance(arm_obj, frame, 60));   frame += 60
    actions.append(anim_nod(arm_obj, frame, 20));     frame += 20
    actions.append(anim_shake(arm_obj, frame, 24));   frame += 24

    # Set first animation as active
    arm_obj.animation_data.action = actions[0]

    # Setup scene timeline
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = frame - 1
    bpy.context.scene.render.fps = FPS

    log(f"Total frames: {frame - 1}")
    log(f"Animations: {[a.name for a in actions]}")

    # Save
    if OUTPUT.endswith(".blend"):
        bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
    else:
        bpy.ops.export_scene.gltf(
            filepath=OUTPUT,
            use_selection=False,
            export_format='GLB',
            export_animations=True,
            export_image_format='AUTO',
            export_yup=True,
        )

    log(f"Saved: {OUTPUT}")
    log("DONE - locomotion complete")


if __name__ == "__main__":
    main()
