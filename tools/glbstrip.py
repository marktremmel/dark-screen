"""Strip the embedded texture out of GLB files so many pieces can share one atlas.png (kit packs).
Usage: python3 -I tools/glbstrip.py out_dir in1.glb in2.glb ..."""
import json, struct, sys, os
out = sys.argv[1]
for f in sys.argv[2:]:
    b = open(f, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl]); bo = 20 + jl
    bl = struct.unpack('<I', b[bo:bo + 4])[0]; bin_ = b[bo + 8:bo + 8 + bl]
    drop = {im['bufferView'] for im in j.get('images', []) if 'bufferView' in im}
    newbin = bytearray(); remap = {}; views = []
    for i, v in enumerate(j['bufferViews']):
        if i in drop: continue
        while len(newbin) % 4: newbin.append(0)
        off = v.get('byteOffset', 0); chunk = bin_[off:off + v['byteLength']]
        nv = dict(v); nv['byteOffset'] = len(newbin); newbin += chunk
        remap[i] = len(views); views.append(nv)
    j['bufferViews'] = views
    for a in j.get('accessors', []):
        if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
    j['images'] = [{'uri': 'atlas.png'} for _ in j.get('images', [])]
    j['buffers'] = [{'byteLength': len(newbin)}]
    while len(newbin) % 4: newbin.append(0)
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(newbin)
    o = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(newbin), 0x004E4942) + bytes(newbin)
    name = os.path.basename(f).replace('subway_', '')
    open(os.path.join(out, name), 'wb').write(o); print(name, len(b), '->', len(o))
