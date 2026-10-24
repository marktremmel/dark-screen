import subprocess,time,os
from playwright.sync_api import sync_playwright
from PIL import Image
os.chdir('/home/claude/sotet')
names=['ikarus','playground','kiosk','bd_canopy','bd_board','bd_doors','bd_counter','bd_bench']
srv=subprocess.Popen(['python3','-m','http.server','8769'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
ims=[]
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=b.new_page(viewport={'width':400,'height':200})
  for n in names:
    pg.goto(f'http://localhost:8769/tools/glbview.html?n={n}'); pg.wait_for_function('window.READY',timeout=60000)
    pg.screenshot(path=f'/tmp/claude-0/{n}.png'); ims.append(n)
  b.close()
srv.kill()
W=4; H=(len(ims)+W-1)//W
sheet=Image.new('RGB',(400*W,220*H),(0,0,0))
from PIL import ImageDraw
d=ImageDraw.Draw(sheet)
for i,n in enumerate(ims):
  sheet.paste(Image.open(f'/tmp/claude-0/{n}.png'),((i%W)*400,(i//W)*220+20)); d.text(((i%W)*400+4,(i//W)*220+4),n,fill=(255,255,0))
sheet.save('build/shots/new_places_sheet.png'); print(len(ims))
