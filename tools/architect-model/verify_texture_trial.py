import bpy, json, hashlib, struct
import numpy as np
from pathlib import Path
root=Path(__file__).resolve().parent
meta=json.loads((root/'texture-art/head-uv-metadata.json').read_text())
def pixels(path):
    image=bpy.data.images.load(str(path));w,h=image.size
    data=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(data)
    return data.reshape(h,w,4)[::-1].copy()
source_path=Path(meta['source'])
if not source_path.is_absolute(): source_path=root/source_path
source=pixels(source_path); candidate=pixels(root/'texture-art/architect-skin-candidate-atlas.png')
x0,y0,x1,y1=meta['top_left_rectangle'];poly=np.array(meta['mask_polygon_atlas_pixels'])
yy,xx=np.mgrid[y0:y1,x0:x1];inside=np.zeros(xx.shape,dtype=bool)
for p,q in zip(poly,np.roll(poly,-1,axis=0)):
    inside^=((p[1]>yy)!=(q[1]>yy))&(xx<(q[0]-p[0])*(yy-p[1])/(q[1]-p[1]+1e-12)+p[0])
inside&=~((xx-x0<200)&(yy-y0>1300))
global_mask=np.zeros(source.shape[:2],dtype=bool);global_mask[y0:y1,x0:x1]=inside
outside=float(np.abs(source[~global_mask]-candidate[~global_mask]).max())
assert outside < .004, 'Pixels changed outside head mask'
def read(path):
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+length]);start=20+length+8
    return doc,raw[start:]
def accessor(doc,bin,index):
    a=doc['accessors'][index]
    size={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a['componentType']]
    size*={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    data=bytearray(size*a['count'])
    if 'bufferView' in a:
        view=doc['bufferViews'][a['bufferView']]
        start=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',size)
        data=bytearray(b''.join(bin[start+i*stride:start+i*stride+size] for i in range(a['count'])))
    if 'sparse' in a:
        sparse=a['sparse'];indices=sparse['indices'];values=sparse['values']
        iv=doc['bufferViews'][indices['bufferView']]; vv=doc['bufferViews'][values['bufferView']]
        begin=iv.get('byteOffset',0)+indices.get('byteOffset',0)
        dtype={5121:np.uint8,5123:np.dtype('<u2'),5125:np.dtype('<u4')}[indices['componentType']]
        ids=np.frombuffer(bin,dtype=dtype,count=sparse['count'],offset=begin)
        start=vv.get('byteOffset',0)+values.get('byteOffset',0)
        for j,entry in enumerate(ids):
            entry=int(entry);data[entry*size:(entry+1)*size]=bin[start+j*size:start+(j+1)*size]
    return bytes(data)
def signature(doc,bin):
    rows={}
    for mesh in doc['meshes']:
        for i,p in enumerate(mesh['primitives']):
            entries=dict(p['attributes']); entries['indices']=p['indices']
            for j,target in enumerate(p.get('targets',[])):
                for name,index in target.items(): entries[f'morph{j}/{name}']=index
            for name,index in entries.items():
                rows[f'{mesh["name"]}/{i}/{name}']=hashlib.sha256(accessor(doc,bin,index)).hexdigest()
    return rows
base,binary=read(root/'output/architect-mpfb.glb')
trial,trial_binary=read(root/'output/architect-textured.glb')
one=signature(base,binary);two=signature(trial,trial_binary)
differences=[key for key in one if one[key]!=two.get(key)]
assert not differences, differences
report={'status':'PASS','outside_head_mask_max_pixel_delta':outside,
        'mesh_accessor_buffers_identical':len(one),'mesh_difference_count':len(differences),
        'base_sha256':hashlib.sha256((root/'output/architect-mpfb.glb').read_bytes()).hexdigest(),
        'textured_sha256':hashlib.sha256((root/'output/architect-textured.glb').read_bytes()).hexdigest(),
        'texture_sha256':hashlib.sha256((root/'texture-art/architect-skin-candidate-atlas.png').read_bytes()).hexdigest(),
        'source':'CC0 MakeHuman middleage skin; head-only generated contribution; 0.85 blend, feathered mask',
        'visual_status':'Root viewed and accepted for prototype; exact reference likeness not claimed'}
(root/'output/texture-isolation-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
