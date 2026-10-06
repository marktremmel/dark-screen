import subprocess, time, json, os, base64, sys
from playwright.sync_api import sync_playwright
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
HP=-90  # House Props + some interior FBX are Z-up
S=[
 # name, file, tex, rx, axis, size, texSize
 ('sofa','Sofa_PSX.fbx','Sofa_PSX.jpg',HP,'y',0.85,128),
 ('armchair','SingleSofa_PSX.fbx','SingleSofa_PSX.jpg',HP,'y',0.85,128),
 ('tubetv','TubeTV_PSX.fbx','TubeTV_PSX.jpg',HP,'y',0.5,128),
 ('bookshelf','BookshelvesType1_PSX.fbx','BookshelvesType1_PSX.jpg',HP,'y',1.8,128),
 ('coffeetable','CoffeeTableType1_PSX.fbx','CoffeeTableType1_PSX.jpg',HP,'y',0.45,128),
 ('carpet','Carpet_PSX.fbx','Carpet_PSX.jpg',HP,'max',2.2,128),
 ('studydesk','StudyDesk_PSX.fbx','StudyDesk_PSX.jpg',HP,'y',0.76,128),
 ('studychair','StudyChair_PSX.fbx','StudyChair_PSX.jpg',HP,'y',0.9,128),
 ('wardrobe','WardrobeType1_PSX.fbx','WardrobeType1_PSX.jpg',HP,'y',2.0,128),
 ('bed','SingleWoodDivan_PSX.fbx','SingleWoodDivan_PSX.jpg',HP,'max',2.0,128),
 ('mattress','SingleMattress_PSX.fbx','SingleMattress_PSX.jpg',HP,'max',1.9,128),
 ('bigbed','KingSizeWoodDivan_PSX.fbx','KingSizeWoodDivan_PSX.jpg',HP,'max',2.1,128),
 ('bigmattress','KingSizeMattress_PSX.fbx','KingSizeMattress_PSX.jpg',HP,'max',2.0,128),
 ('bedside','BedsideTableType1_PSX.fbx','BedsideTableType1_PSX.jpg',HP,'y',0.55,128),
 ('diningtable','DiningTableType1_PSX.fbx','DiningTableType1_PSX.jpg',HP,'y',0.75,128),
 ('diningchair','DiningChairType1_PSX.fbx','DiningChairType1_PSX.jpg',HP,'y',0.9,128),
 ('cupboard','Cupboard_PSX.fbx','Cupboard_PSX.jpg',HP,'y',1.8,128),
 ('labdesk','LabDesk.fbx','LabDesk.jpg',0,'y',0.75,256),
 ('keyboard','Keyboard.fbx','Keyboard.jpg',0,'max',0.45,128),
 ('labchair','LabChair.fbx','LabChair.jpg',0,'y',1.0,128),
 ('pcretro','PCRetro.fbx','PCRetro.jpg',0,'y',0.45,256),
 ('flashlight','Flashlight.fbx','Flashlight.jpg',0,'max',0.22,64),
 ('fridge','Fridge.fbx','Fridge.jpg',0,'y',1.8,256),
 ('kcabinet','KitchenCabinet.fbx','KitchenCabinet.jpg',0,'y',0.9,256),
 ('ksink','KitchenSink.fbx','KitchenSink.jpg',0,'y',0.9,256),
 ('kupper','UpperCabinet.fbx','UpperCabinet.jpg',0,'y',0.7,256),
 ('ceilinglamp','CeilingLamp.fbx','CeilingLamp.jpg',90,'max',0.5,64),
 ('door','Door.fbx','Door.jpg',HP,'y',2.05,128),
 ('box','Box.fbx','Box.jpg',0,'max',0.5,64),
 ('battery','Battery.fbx','Battery.jpg',0,'max',0.07,64),
 ('clock','Clock.fbx','Clock.jpg',0,'max',0.3,128),
 ('photoframe','PhotoFrame.fbx','PhotoFrame.jpg',0,'max',0.25,128),
 ('motherboard','circuit_board_etx_1.glb',None,0,'max',0.3,128),
 ('fusebox','fuse_box_etx_1.glb',None,0,'y',0.6,128),
 ('teddy','TeddyBear.fbx',None,0,'y',0.34,64),
]
only=sys.argv[1:]
srv=subprocess.Popen(['python3','-m','http.server','8766'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
os.makedirs('build/glb',exist_ok=True)
rep={}
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=b.new_page(); logs=[]; pg.on('console',lambda m: logs.append(m.text)); pg.on('pageerror',lambda e: logs.append('ERR '+str(e)))
  pg.goto('http://localhost:8766/tools/convert.html'); pg.wait_for_function('window.READY')
  RY={'armchair':-90,'sofa':-90,'bedside':-90,'bookshelf':-90,'clock':-90,'cupboard':-90,'diningchair':-90,'door':-90,'labchair':180,'pcretro':90,'studychair':-90,'studydesk':-90,'tubetv':-90,'wardrobe':-90}
  RXO={'pcretro':-90}
  for name,f,t,rx,ax,size,ts in S:
    rx=RXO.get(name,rx)
    if only and name not in only: continue
    try:
      r=pg.evaluate('s=>convert(s)',{'name':name,'file':f,'tex':t,'rx':rx,'ry':RY.get(name,0),'axis':ax,'size':size,'texSize':ts})
      open(f'build/glb/{name}.glb','wb').write(base64.b64decode(r.pop('b64'))); rep[name]=r
    except Exception as e: rep[name]='FAIL '+str(e)[:200]
  b.close()
srv.kill()
for k,v in rep.items(): print(k,v)
print([l for l in logs if 'ERR' in l or 'rror' in l][:10])
