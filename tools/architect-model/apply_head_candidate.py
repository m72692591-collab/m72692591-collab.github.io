"""Bounded material trial. Never overwrites the validated V4 artifacts."""
import bpy, json, hashlib, importlib.util
import numpy as np
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('builder',root/'build_architect.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
meta=json.loads((root/'texture-art/head-uv-metadata.json').read_text())
source=Path(meta['source'])
if not source.is_absolute(): source=root/source
candidate=root/'texture-art/architect-head-uv-candidate.png'
def pixels(path):
    image=bpy.data.images.load(str(path),check_existing=True)
    w,h=image.size
    data=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(data)
    return data.reshape(h,w,4)[::-1].copy()
atlas=pixels(source);patch=pixels(candidate)
x0,y0,x1,y1=meta['top_left_rectangle']; assert patch.shape[:2]==(y1-y0,x1-x0)
poly=np.array(meta['mask_polygon_atlas_pixels']); yy,xx=np.mgrid[y0:y1,x0:x1]
inside=np.zeros(xx.shape,dtype=bool)
for p,q in zip(poly,np.roll(poly,-1,axis=0)):
    inside ^= ((p[1]>yy)!=(q[1]>yy)) & (xx < (q[0]-p[0])*(yy-p[1])/(q[1]-p[1]+1e-12)+p[0])
inside &= ~((xx-x0 < 200) & (yy-y0 > 1300))
weight=np.zeros(inside.shape,dtype=np.float32); mask=inside.copy()
for _ in range(12):
    weight+=mask/12
    mask[0,:]=False;mask[-1,:]=False;mask[:,0]=False;mask[:,-1]=False
    mask=mask & np.roll(mask,1,0)&np.roll(mask,-1,0)&np.roll(mask,1,1)&np.roll(mask,-1,1)
weight*=.85  # retain some original albedo; avoid unnaturally coarse stubble
region=atlas[y0:y1,x0:x1]
region[:,:,:3]=region[:,:,:3]*(1-weight[:,:,None])+patch[:,:,:3]*weight[:,:,None]
image=bpy.data.images.new('Architect head candidate atlas',width=atlas.shape[1],height=atlas.shape[0],alpha=True)
image.pixels.foreach_set(atlas[::-1].reshape(-1))
image.filepath_raw=str(root/'texture-art/architect-skin-candidate-atlas.png');image.file_format='PNG';image.save()
material=bpy.data.materials['ArchitectSkin']
node=next(n for n in material.node_tree.nodes if n.type=='TEX_IMAGE')
node.image=image
rig=bpy.data.objects['ArchitectRig'];builder.set_pose(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for child in rig.children_recursive: child.select_set(True)
bpy.context.view_layer.objects.active=rig
output=root/'output/architect-textured.glb'
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
  export_animations=True,export_skins=True,export_morph=True,export_apply=False,
  export_yup=True,export_animation_mode='ACTIONS')
receipt=builder.inspect_glb(output)
receipt.update(status='CANDIDATE_PENDING_VISUAL_QA',source='CC0 middleage skin plus isolated head image-generation contribution',
               input_candidate_sha256=hashlib.sha256(candidate.read_bytes()).hexdigest(),
               base_glb_sha256=hashlib.sha256((root/'output/architect-mpfb.glb').read_bytes()).hexdigest(),
               blend_amount=.85,limitations=['UV alignment requires review','Exact likeness remains incomplete'])
(root/'output/textured-model-receipt.json').write_text(json.dumps(receipt,indent=2))
builder.set_pose(rig,.95,'Left')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'output/architect-textured.blend'))
scene=bpy.context.scene;scene.render.filepath=str(root/'output/architect-textured-preview.png')
bpy.ops.render.render(write_still=True)
head=rig.pose.bones['mixamorig:Head'].head
target=Vector((0,head.y,head.z+.10));camera=scene.camera
camera.location=(.05,-3.4,target.z+.02)
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=.43
scene.render.resolution_x=700;scene.render.resolution_y=700
scene.render.filepath=str(root/'output/architect-textured-face.png')
bpy.ops.render.render(write_still=True)
print('CANDIDATE_COMPLETE; base V4 left unchanged')
