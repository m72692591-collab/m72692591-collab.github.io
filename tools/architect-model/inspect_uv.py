import bpy,json
from pathlib import Path
root=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(root/'assets/clothes/male_elegantsuit01/male_elegantsuit01.obj'))
obj=bpy.context.object; mesh=obj.data; uv=mesh.uv_layers.active.data
edgefaces={}; neighbors=[set() for p in mesh.polygons]
for p in mesh.polygons:
    pts=[tuple(round(float(v),5) for v in uv[i].uv) for i in p.loop_indices]
    for a,b in zip(pts,pts[1:]+pts[:1]):
        edge=tuple(sorted((a,b)))
        for prior in edgefaces.get(edge,[]):
            neighbors[p.index].add(prior); neighbors[prior].add(p.index)
        edgefaces.setdefault(edge,[]).append(p.index)
todo=set(range(len(neighbors))); parts=[]
while todo:
    pending=[todo.pop()]; found=set(pending)
    while pending:
        for n in neighbors[pending.pop()]:
            if n not in found: found.add(n);todo.discard(n);pending.append(n)
    pts=[uv[j].uv for i in found for j in mesh.polygons[i].loop_indices]
    cs=[mesh.vertices[j].co for i in found for j in mesh.polygons[i].vertices]
    parts.append({'faces':sorted(found),'count':len(found),'uv_min':[min(c[i] for c in pts) for i in range(2)],'uv_max':[max(c[i] for c in pts) for i in range(2)],'xyz_min':[min(c[i] for c in cs) for i in range(3)],'xyz_max':[max(c[i] for c in cs) for i in range(3)]})
parts.sort(key=lambda p:-p['count'])
(root/'output/suit-uv-islands.json').write_text(json.dumps(parts,indent=2))
for i,p in enumerate(parts):
    if p['uv_max'][1]>.8: print(i,{k:v for k,v in p.items() if k!='faces'})
