"""Project-isolated MPFB 2.0.18 character builder; run with Blender 4.5.9.

The result is a manually parameterized approximation, not a reconstruction of
the reference person. The source add-on and CC0 asset files are not modified.
"""
import sys, os, json, zipfile, time, math, hashlib, struct
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)
SOURCE = ROOT / "mpfb2-2.0.18" / "src"
ASSETS = ROOT / "assets"
USER = ROOT / "isolated-user"
USER.mkdir(exist_ok=True)
START = time.time()

def log(message):
    print("ARCHITECT:", message, flush=True)

def setup():
    bpy.context.preferences.use_preferences_save = False
    sys.path.insert(0, str(SOURCE))
    import mpfb
    get_preference = mpfb.get_preference
    def isolated_preference(name):
        if name == "mpfb_user_data":
            return str(USER)
        return get_preference(name)
    mpfb.get_preference = isolated_preference
    if "mpfb" not in bpy.context.preferences.addons:
        bpy.context.preferences.addons.new().module = "mpfb"
    original = bpy.utils.extension_path_user
    def local_extension_path(package, *args, **kwargs):
        if package == "mpfb":
            return str(USER)
        return original(package, *args, **kwargs)
    bpy.utils.extension_path_user = local_extension_path
    try:
        mpfb.register()
    finally:
        bpy.utils.extension_path_user = original
    from mpfb.services.locationservice import LocationService
    mpfb.set_preference("mpfb_second_root", str(ASSETS))
    LocationService.update_second_root()
    LocationService.ensure_relevant_directories_exist()
    # Official facial packs are unpacked only under this project's data root.
    destination = USER / "data"
    for archive in ("visemes02.zip", "faceunits01.zip"):
        with zipfile.ZipFile(ROOT / archive) as z:
            for entry in z.infolist():
                target = (destination / entry.filename).resolve()
                if not target.is_relative_to(destination.resolve()):
                    raise ValueError("Unsafe archive member")
            z.extractall(destination)
    log("Registered isolated MPFB " + str(mpfb.VERSION))

def texture_material(obj, name, texture, *, alpha=False, roughness=0.55,
                     emission=(0, 0, 0, 1), emission_strength=0.0):
    """Plain Principled/image graph supported directly by the glTF exporter."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Emission Color"].default_value = emission
    bsdf.inputs["Emission Strength"].default_value = emission_strength
    if texture:
        path = ASSETS / texture
        assert path.is_file(), path
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(str(path), check_existing=True)
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if alpha:
            mat.node_tree.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
            mat.surface_render_method = "DITHERED"
    mat.use_backface_culling = False
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return mat

def aim_bone(rig, name, direction):
    bone = rig.pose.bones["mixamorig:" + name]
    bpy.context.view_layer.update()
    current = bone.matrix.copy()
    delta = (bone.tail - bone.head).rotation_difference(Vector(direction))
    rotation = delta.to_matrix() @ current.to_3x3()
    desired = rotation.to_4x4()
    desired.translation = current.translation
    bone.matrix = desired
    bpy.context.view_layer.update()

def set_pose(rig, presentation=0.0, side="Right", breathing=0.0):
    for b in rig.pose.bones:
        b.rotation_mode = "QUATERNION"
        b.rotation_quaternion = Quaternion()
        b.location = (0, 0, 0)
    bpy.context.view_layer.update()
    rig.pose.bones["mixamorig:Spine1"].rotation_quaternion = Quaternion((1, 0, 0), breathing)
    rig.pose.bones["mixamorig:Head"].rotation_quaternion = Quaternion((0, 1, 0), breathing * 0.6)
    for which in ("Left", "Right"):
        arm = rig.pose.bones["mixamorig:" + which + "Arm"]
        sign = 1 if arm.head.x > 0 else -1
        t = presentation if which == side else 0.0
        aim_bone(rig, which + "Arm", (sign * (0.12 + 0.20*t), -0.025 - 0.12*t, -0.61 + 0.22*t))
        aim_bone(rig, which + "ForeArm", (sign * (0.04 + 0.12*t), -0.12 - 0.35*t, -0.40 + 0.57*t))
        if t > .001:
            aim_bone(rig, which + "Hand", (sign*.08, -.35, .16))
        for finger in ("Index", "Middle", "Ring", "Pinky"):
            for segment in (1, 2, 3):
                name = "mixamorig:" + which + "Hand" + finger + str(segment)
                if name in rig.pose.bones:
                    rig.pose.bones[name].rotation_quaternion = Quaternion((1, 0, 0), 0.12 if segment == 1 else 0.08)
    bpy.context.view_layer.update()

def animate_rig(rig):
    rig.animation_data_create()
    for name, side, duration in (("Idle", "Right", 96), ("PresentRight", "Right", 64), ("PresentLeft", "Left", 64)):
        action = bpy.data.actions.new(name)
        rig.animation_data.action = action
        for frame in range(1, duration + 1, 4):
            phase = (frame - 1) / (duration - 1)
            amount = 0 if name == "Idle" else math.sin(math.pi * phase) ** 2
            set_pose(rig, amount, side, 0.006 * math.sin(phase * math.tau))
            for b in rig.pose.bones:
                b.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=b.name)
                b.keyframe_insert(data_path="location", frame=frame, group=b.name)
        set_pose(rig)
        for b in rig.pose.bones:
            b.keyframe_insert(data_path="rotation_quaternion", frame=duration, group=b.name)
            b.keyframe_insert(data_path="location", frame=duration, group=b.name)
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        track.mute = True
    rig.animation_data.action = None
    set_pose(rig)

def remove_faces(obj, predicate):
    # Called after facial interpolation, so MHCLO index correspondences are no
    # longer needed. These clothes have no nontrivial facial targets.
    obj.shape_key_clear()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    uv_layer = bm.loops.layers.uv.active
    selected = [f for f in bm.faces if predicate(f, uv_layer)]
    bmesh.ops.delete(bm, geom=selected, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    log("Removed " + str(len(selected)) + " faces from " + obj.name)

def finish_suit(suit, shirt):
    # This CC0 suit's collar/tie is one UV island, identified from its texture.
    # Replace the island with the separately fitted open-neck CC0 shirt.
    # UV bounding rectangles overlap; a rectangular cut also removes shoulder
    # fabric. Use the complete UV-connected island proven by inspect_uv.py.
    islands = json.loads((OUT / "suit-uv-islands.json").read_text())
    candidates = [part for part in islands if part["count"] == 519
                  and .348 < part["uv_min"][0] < .350
                  and .977 < part["uv_max"][1] < .979]
    assert len(candidates) == 1, "Expected pinned suit collar/tie UV island"
    inner_faces = set(candidates[0]["faces"])
    remove_faces(suit, lambda face, uv: face.index in inner_faces)
    remove_faces(shirt, lambda f, uv: f.calc_center_median().z < 1.25 or abs(f.calc_center_median().x) > .12)
    for vertex in shirt.data.vertices:
        vertex.co.y += .012
    grid = suit.copy()
    grid.data = suit.data.copy()
    grid.name = "ArchitectSuitLightGrid"
    bpy.context.collection.objects.link(grid)
    grid.parent = suit.parent
    mat = texture_material(grid, "ArchitectLightGrid", None, roughness=.55,
                           emission=(.07,.45,1,1), emission_strength=.65)
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (.025,.12,.35,1)
    bpy.ops.object.select_all(action="DESELECT")
    grid.select_set(True)
    bpy.context.view_layer.objects.active = grid
    wire = grid.modifiers.new("True geometry light grid", "WIREFRAME")
    wire.thickness = .00020
    wire.offset = 1
    wire.use_replace = True
    while grid.modifiers.find(wire.name) > 0:
        bpy.ops.object.modifier_move_up(modifier=wire.name)
    bpy.ops.object.modifier_apply(modifier=wire.name)
    log("Added skinned 3D suit grid: " + str(len(grid.data.vertices)) + " vertices")

def setup_render(rig):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 700
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.035, 0.045, 0.07)
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (0.025, 0.045, 0.085, 1)
    scene.world.node_tree.nodes.get("Background").inputs[1].default_value = 0.35
    scene.view_settings.view_transform = "AgX"
    head = rig.pose.bones["mixamorig:Head"].head
    height = head.z + 0.2
    def point_at(obj, target):
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=(0.18, -3.4, height - 0.23))
    camera = bpy.context.object
    point_at(camera, (0, 0, height - 0.57))
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 1.48
    scene.camera = camera
    for name, location, energy, color, size in (
        ("Key", (-1.5, -2.5, height + 0.5), 190, (1, .88, .78), 2.4),
        ("Fill", (1.7, -1.0, height), 55, (0.36, 0.62, 1), 2.0),
        ("Rim", (1.2, 1.0, height + 0.5), 330, (0.12, 0.55, 1), 2.3),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = color
        light.data.shape = "DISK"
        light.data.size = size
        point_at(light, (0, 0, height - 0.4))

def inspect_glb(path):
    data = path.read_bytes()
    assert data[:4] == b"glTF"
    json_len, kind = struct.unpack_from("<II", data, 12)
    assert kind == 0x4E4F534A
    doc = json.loads(data[20:20+json_len])
    names = {m.get("name", ""): m.get("extras", {}).get("targetNames", []) for m in doc.get("meshes", [])}
    result = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
              "meshes": len(doc.get("meshes", [])), "skins": len(doc.get("skins", [])),
              "joint_counts": [len(s["joints"]) for s in doc.get("skins", [])],
              "animations": [a.get("name") for a in doc.get("animations", [])],
              "morph_targets": names}
    assert result["skins"] > 0, "No skin exported"
    assert any("jawOpen" in v and "viseme_aa" in v for v in names.values()), "Facial morphs missing"
    return result

def main():
    setup()
    from mpfb.services.humanservice import HumanService
    from mpfb.services.targetservice import TargetService
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    info = TargetService.get_default_macro_info_dict()
    info.update(gender=1.0, age=0.48, muscle=0.52, weight=0.44,
                proportions=0.55, height=0.56)
    info["race"] = {"asian": 0.08, "caucasian": 0.84, "african": 0.08}
    base = HumanService.create_human(scale=0.1, macro_detail_dict=info)
    base.name = "ArchitectBody"
    log("Created body: " + str(len(base.data.vertices)) + " vertices")
    details = {
        "head/head-rectangular": .12, "chin/chin-width-incr": .25,
        "chin/chin-prominent-incr": .20, "cheek/l-cheek-bones-incr": .26,
        "cheek/r-cheek-bones-incr": .26, "nose/nose-greek-incr": .14,
        "eyebrows/eyebrows-trans-down": .05,
        "eyes/l-eye-height2-incr": .12, "eyes/r-eye-height2-incr": .12,
    }
    for target, value in details.items():
        path = SOURCE / "mpfb" / "data" / "targets" / (target + ".target.gz")
        assert path.is_file(), path
        TargetService.load_target(base, str(path), weight=value, name=target.split("/")[-1])
    rig = HumanService.add_builtin_rig(base, "mixamo")
    rig.name = "ArchitectRig"
    log("Created skeleton: " + str(len(rig.data.bones)) + " bones")
    (OUT / "smoke.json").write_text(json.dumps({
        "status": "PASS", "blender": bpy.app.version_string,
        "body_vertices": len(base.data.vertices),
        "bones": [b.name for b in rig.data.bones],
        "seconds": time.time() - START,
    }, indent=2), encoding="utf-8")
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "smoke.blend"))
    if "--smoke" in sys.argv:
        return
    from mpfb.services.faceservice import FaceService, ARKIT_FACEUNITS, META_VISEMES
    from mpfb.services.exportservice import ExportService
    assets_used = []
    def add(path, kind):
        mhclo = ASSETS / path
        assert mhclo.is_file(), mhclo
        text = mhclo.read_text(encoding="utf-8")
        assert "CC0" in text, "Asset license not explicit: " + path
        obj = HumanService.add_mhclo_asset(str(mhclo), base, asset_type=kind,
                                         subdiv_levels=0, material_type="NONE")
        assets_used.append(path)
        log("Added " + path)
        return obj
    texture_material(base, "ArchitectSkin", "skins/middleage_caucasian_male/middleage_lightskinned_male_diffuse.png", roughness=.62)
    eyes = add("eyes/high-poly/high-poly.mhclo", "Eyes")
    texture_material(eyes, "ArchitectEyes", "eyes/materials/blue_eye.png", alpha=True, roughness=.2)
    brows = add("eyebrows/eyebrow009/eyebrow009.mhclo", "Eyebrows")
    texture_material(brows, "ArchitectBrows", "eyebrows/eyebrow009/eyebrow009.png", alpha=True)
    hair = add("hair/short01/short01.mhclo", "Hair")
    texture_material(hair, "ArchitectHair", "hair/short01/short01_diffuse.png", alpha=True, roughness=.7)
    teeth = add("teeth/teeth_base/teeth_base.mhclo", "Teeth")
    texture_material(teeth, "ArchitectTeeth", None, roughness=.35)
    tongue = add("tongue/tongue01/tongue01.mhclo", "Tongue")
    tongue_mat = texture_material(tongue, "ArchitectTongue", None, roughness=.5)
    tongue_mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (.38,.07,.08,1)
    suit = add("clothes/male_elegantsuit01/male_elegantsuit01.mhclo", "Clothes")
    suitmat = texture_material(suit, "ArchitectHolographicSuit", "clothes/male_elegantsuit01/male_elegantsuit01_diffuse.png", roughness=.72, emission=(.015,.08,.25,1), emission_strength=.12)
    suitmat.node_tree.nodes.get("Principled BSDF").inputs["Alpha"].default_value = .86
    suitmat.surface_render_method = "DITHERED"
    shirt = add("clothes/male_casualsuit01/male_casualsuit01.mhclo", "Clothes")
    texture_material(shirt, "ArchitectOpenNeckShirt", "clothes/male_casualsuit01/male_casualsuit01_diffuse.png", roughness=.8)
    shoes = add("clothes/shoes01/shoes01.mhclo", "Clothes")
    texture_material(shoes, "ArchitectShoes", "clothes/shoes01/shoes01_diffuse.png", roughness=.4)
    for obj in rig.children_recursive:
        if obj.type == "MESH":
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
    log("Baking proportions; loading face targets")
    TargetService.bake_targets(base)
    FaceService.load_targets(base, load_microsoft_visemes=False,
                             load_meta_visemes=True, load_arkit_faceunits=True)
    actual = list(base.data.shape_keys.key_blocks.keys())
    missing = (set(ARKIT_FACEUNITS) | set(META_VISEMES)) - set(actual)
    assert not missing, "Missing facial targets: " + str(missing)
    log("Interpolating " + str(len(actual)-1) + " facial targets")
    FaceService.interpolate_targets(base)
    log("Removing hidden body and helper geometry")
    ExportService.bake_modifiers_remove_helpers(base, bake_masks=True, bake_subdiv=False, remove_helpers=True)
    finish_suit(suit, shirt)
    for obj in rig.children_recursive:
        if obj.type == "MESH" and obj.data.shape_keys:
            for name in ("mouthSmileLeft", "mouthSmileRight"):
                if name in obj.data.shape_keys.key_blocks:
                    obj.data.shape_keys.key_blocks[name].value = .08
    animate_rig(rig)
    bpy.context.scene.render.fps = 24
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for obj in rig.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    filepath = OUT / "architect-mpfb.glb"
    log("Exporting GLB")
    bpy.ops.export_scene.gltf(filepath=str(filepath), export_format="GLB",
        use_selection=True, export_animations=True, export_skins=True, export_morph=True,
        export_apply=False, export_yup=True, export_animation_mode="ACTIONS")
    receipt = inspect_glb(filepath)
    receipt.update(status="GENERATED_PENDING_VISUAL_QA", blender=bpy.app.version_string,
        mpfb="2.0.18", likeness="manual reference-inspired approximation; not exact face reconstruction",
        license="MakeHuman system assets CC0; generator code GPL; original rig animation authored for this project",
        assets=assets_used, arkit_count=len(ARKIT_FACEUNITS), viseme_count=len(META_VISEMES),
        seconds=time.time()-START, detail_parameters=details,
        limitations=["Naturalistic motion not motion capture", "No audio alignment authored", "Visual QA required"])
    (OUT / "model-receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    setup_render(rig)
    set_pose(rig, .95, "Left")
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "architect-mpfb.blend"))
    if "--no-render" not in sys.argv:
        bpy.context.scene.render.filepath = str(OUT / "architect-preview.png")
        log("Rendering preview on CPU")
        bpy.ops.render.render(write_still=True)
    log("Finished in " + str(round(time.time()-START, 1)) + " seconds")

if __name__ == "__main__":
    main()
