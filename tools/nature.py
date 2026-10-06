# Quaternius Stylized Nature MegaKit (CC0) glTF -> small GLBs for the field. Drops normal maps, shrinks textures.
import json, struct, io, os
from PIL import Image
SRC='assets_src/nature'; OUT='build/glb'
SIZES={'Leaves.png':256,'Flowers.png':256,'Grass.png':128,'Leaves_NormalTree_C.png':256,'Leaf_Pine_C.png':128,'Leaves_TwistedTree_C.png':128,'Bark_NormalTree.png':128,'Rocks_Diffuse.png':128,'PathRocks_Diffuse.png':128}
MODELS=['CommonTree_1','CommonTree_2','CommonTree_3','Pine_2','Bush_Common','Bush_Common_Flowers','Flower_3_Group','Flower_4_Group','Grass_Wispy_Tall','Grass_Common_Tall','Rock_Medium_1','Rock_Medium_2','RockPath_Round_Wide','RockPath_Round_Small_1','Clover_1','Plant_7_Big','Petal_1']
def pad(b, c=b'\0'): return b + c * ((4 - len(b) % 4) % 4)
for m in MODELS:
    d=json.load(open(f'{SRC}/{m}.gltf')); binb=open(f'{SRC}/{d["buffers"][0]["uri"]}','rb').read()
    for mat in d.get('materials',[]): mat.pop('normalTexture',None); mat.get('pbrMetallicRoughness',{}).pop('metallicRoughnessTexture',None)
    used=sorted({mat['pbrMetallicRoughness']['baseColorTexture']['index'] for mat in d.get('materials',[]) if 'baseColorTexture' in mat.get('pbrMetallicRoughness',{})})
    remap={o:i for i,o in enumerate(used)}
    for mat in d.get('materials',[]):
        p=mat.get('pbrMetallicRoughness',{})
        if 'baseColorTexture' in p: p['baseColorTexture']['index']=remap[p['baseColorTexture']['index']]
    texs=[d['textures'][o] for o in used]; imgs=[]; newtex=[]
    blob=pad(binb); views=d['bufferViews']
    for t in texs:
        uri=d['images'][t['source']]['uri']; im=Image.open(f'{SRC}/{uri}').convert('RGBA'); s=SIZES.get(uri,128); im=im.resize((s,s),Image.LANCZOS)
        if uri=='Leaves_TwistedTree_C.png':   # the kit ships these leaves red; turn them into summer green for the bushes
            a=im.getchannel('A'); h,sat,v=im.convert('RGB').convert('HSV').split(); h=h.point(lambda x:(x+70)%256); v=v.point(lambda x:min(255,int(x*0.9)))
            im=Image.merge('HSV',(h,sat,v)).convert('RGB').convert('RGBA'); im.putalpha(a)
        buf=io.BytesIO(); im.save(buf,'PNG',optimize=True); data=buf.getvalue()
        views.append({'buffer':0,'byteOffset':len(blob),'byteLength':len(data)}); blob=pad(blob+data)
        imgs.append({'bufferView':len(views)-1,'mimeType':'image/png','name':uri}); newtex.append({'source':len(imgs)-1,**({'sampler':t['sampler']} if 'sampler' in t else {})})
    d['images']=imgs; d['textures']=newtex; d['buffers']=[{'byteLength':len(blob)}]
    js=pad(json.dumps(d,separators=(',',':')).encode(),b' ')
    glb=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(blob),0x004E4942)+blob
    key='nat_'+m.lower(); open(f'{OUT}/{key}.glb','wb').write(glb); print(key, len(glb)//1024,'KB')
