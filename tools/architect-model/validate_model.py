"""Read-back validation of the exported GLB, not the authoring scene."""
import bpy, json, time, hashlib, sys, argparse
from pathlib import Path
root = Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--file',default='architect-mpfb.glb')
parser.add_argument('--receipt',default='readback-validation.json')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
glb=root/'output'/args.file
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(glb))
rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
body = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.data.shape_keys and len(o.data.shape_keys.key_blocks) == 68)
scene = bpy.context.scene
checks = {}
for name in ("jawOpen", "eyeBlinkLeft", "mouthSmileRight", "viseme_aa", "viseme_PP"):
    basis = body.data.shape_keys.key_blocks[0]
    target = body.data.shape_keys.key_blocks[name]
    maximum = max((a.co-b.co).length for a,b in zip(target.data, basis.data))
    checks[name] = {"max_local_displacement_m": maximum, "pass": maximum > 1e-5}
    assert maximum > 1e-5, name + " has no actual deformation"
if rig.animation_data:
    for track in rig.animation_data.nla_tracks:
        track.mute = True
animations = {}
for action in bpy.data.actions:
    if "Present" not in action.name and "Idle" not in action.name:
        continue
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    side = "Left" if "Left" in action.name else "Right"
    bone = next(b for b in rig.pose.bones if side+"Hand" == b.name.split(":")[-1])
    scene.frame_set(1)
    start = bone.matrix.translation.copy()
    scene.frame_set(32)
    end = bone.matrix.translation.copy()
    moved = (end-start).length
    animations[action.name] = {"hand_displacement_m":moved,"duration_frames":list(action.frame_range)}
    if "Present" in action.name:
        assert moved > .15, "Gesture does not move hand: " + action.name
assert len([n for n in animations if "Present" in n]) == 2
report = {"status":"PASS", "source":"GLB re-import", "bones":len(rig.data.bones),
          "glb_sha256":hashlib.sha256(glb.read_bytes()).hexdigest(),
          "body_morph_count":len(body.data.shape_keys.key_blocks)-1,
          "morph_checks":checks,"animation_checks":animations,
          "limitation":"Structure and movement checks do not establish lifelike motion or exact identity."}
(root/"output"/args.receipt).write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report,indent=2))
