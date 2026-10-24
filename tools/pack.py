"""Pack converted assets into data/*.js so the game runs from file:// (no fetch needed)."""
import base64, json, os, io
from PIL import Image
os.chdir('/home/claude/sotet')
OUT='game/data'; os.makedirs(OUT,exist_ok=True)
SRC='assets_src'
def b64(path): return base64.b64encode(open(path,'rb').read()).decode()
def png_b64(path,maxs=128,nearest=False):
    im=Image.open(path).convert('RGBA')
    if max(im.size)>maxs:
        im.thumbnail((maxs,maxs),Image.NEAREST if nearest else Image.LANCZOS)
    buf=io.BytesIO(); im.save(buf,'PNG',optimize=True); return base64.b64encode(buf.getvalue()).decode()

PACKS={
 'core':{
   'glb':['arms','flashlight','battery','ceilinglamp','door'],
   'tex':{'electronics':('electronics_etx_part_1.png',256),'electronics2':('electronics_etx_part_2.png',256),'metal_etx':('metal_etx_1.png',128),'grass':('kits/block/textures/grass_worn.png',128),'panel':('kits/block/textures/panel_ml.png',128)},
   'img':['ui_e','ui_esc','ui_eye','ui_save','ui_cursor','ui_bar_full','ui_bar_empty','ui_card','ui_dialog','ui_note'],
   'audio':['uiclick','click','denied','step1','step2','step3','step4','switch_on','switch_off','beep','paper','hum','mus_debrief','amb_still','door_open'],
   'jpg':['gen/view_night_flat','gen/view_night_high','gen/view_night_school','gen/view_morning_school'],
   'font':'m5x7.ttf'},
 'hub':{
   'glb':['labdesk','labchair','pcretro','keyboard'],
   'tex':{'lab_floor':('Tile_15.png',128),'lab_wall':('Plaster_11.png',128),'skirt':('C64_wall_halfconcrete_02.png',128),'ceiling':('C64_tiles_ceiling.png',128),'labdoor':('C64_door_grungy_with_glass.png',128),'plaster':('Plaster_09.png',128)},
   'audio':['mus_hub','tvon','space']},
 'ep1':{
   'glb':['teddy','sofa','armchair','tubetv','bookshelf','coffeetable','carpet','studydesk','studychair','wardrobe','bed','mattress','bigbed','bigmattress','bedside','diningtable','diningchair','cupboard','fridge','kcabinet','ksink','kupper','box','photoframe','motherboard','fusebox'],
   'tex':{'wood_floor':('Wood_17.png',128),'wood_dark':('Wood_11.png',128),'tiles':('Tile_13.png',128),'wall':('Plaster_19.png',128),'wall2':('Plaster_09.png',128),'carpet':('C64_carpet_brown_01.png',128),'window':('C64_window_wood_old_01.png',128),'panel':('C64_electrical_panel_outside.png',128),'metal':('Metal_09.png',128)},
   'audio':['mus_tense','mus_dark','poweron','meow','purr','fridgehum','drawer','closet','box','drop','chair','scrape','plastic','rumble','drip','fan','press','screw','clang','stinger','thump','presence','distort','aithink','strange','spark1','spark2','heavy1','heavy2','heavy3','heavy4','latch','door_open','door_close','tvon','phonering','pickup','hangup','squeak','knock','feedback','vela1','vela2','vela3','vela4','vela5'],'jpg':['gen/ep1_intro','gen/ep1_peephole']},
 'ep2':{'glb':[],'tex':{},'audio':[],'jpg':['gen/ep2_bubu','gen/ep2_bear_view','gen/ep9_mum_cooking']},
 'ep3':{'jpg':['refl_a','refl_b','refl_c']+['gen/ep3_'+k for k in ['selfie','cat','rink1','rink2','cake','window','bench']]},
 'ep4':{'jpg':['gen/ep4_'+k for k in ['meme','turn_player','turn_bence','video','ghost_avatar','mate_avatar']]},
 'npc':{'glb':['npc_guard','npc_caretaker','npc_nagyi','npc_mannequin','npc_mannequin2']},
 'kit_school':{'kits':{'school':('kits/school','sk_',1024,['floor_terrazzo','ceiling_tiles','ceiling_light','ceiling_light_dead','emergency_light','exit_sign','vending_machine','waiting_chairs','trash_can','wet_floor_sign','hatch_shutter','window_interior','pa_speaker','notice_board','reception_desk','key_cabinet','crt_monitor','tv_small_static','bench','drinking_fountain','door_office','janitor_cart','cubbies','backpack','umbrella','door_front','lockers','troffer_hanging','pigeonholes','plant_dead','filing_cabinet','tv_cart','wire_shelf','shelving_loaded','table_folding','chair_folding','phone_beige','cafeteria_table','door_release','fuse_box','mop_bucket','broom','box_stack','shoes','sign_office','door_exit','teacher_desk','typewriter','calendar','mug_coffee','papers','folder_pile','wall_clock','door_library','door_classroom','door_gym','door_boiler','student_desk','student_chair','library_shelf','bookshelf','card_catalogue','circulation_desk','boiler','sign_library','sign_gym','sign_boiler','radiator','stairs_school','workbench','toolbox','ceiling_light_dead','waste_bin','chalkboard','trophy_case','fire_alarm','railing_school'])},
   'tex':{'terrazzo':('kits/school/textures/terrazzo.png',128),'ceil_tile':('kits/school/textures/ceiling_tile.png',128),'plaster_c':('kits/school/textures/plaster_cracked.png',128),'concrete':('kits/school/textures/concrete_floor.png',128),'corridor':('kits/school/textures/corridor_paint.png',128),'brick':('kits/school/textures/brick.png',128),'glazed':('kits/school/textures/glazed.png',128),'vct':('kits/school/textures/vct.png',128),'class_paint':('kits/school/textures/class_paint.png',128)}},
 'ep8':{'jpg':['gen/ep8_lab_night'],'audio':['amb_distant','amb_still','typing','lightsw','hatch','crton']},
 'ep5':{'jpg':['gen/ep5_cat_fail','gen/ep5_skate','gen/ep5_noodles','gen/ep5_mannequins','gen/ep5_cctv','gen/ep5_bedroom','gen/ep5_mall_screens','gen/ep2_bubu','gen/ep8_lab_night','refl_b'],'audio':[]},
 'ep6':{'jpg':['gen/ep6_fake_frame','gen/ep6_school_front','gen/ep6_lili','gen/ep6_mate','gen/ep6_morning','gen/ep6_lab_morning','gen/ep3_selfie','gen/ep2_bear_view','gen/ep5_mall_screens','refl_a'],'audio':['typing']},
 'ep9':{'glb':['sv_closet','sv_carpet','sv_cube010','sv_sofa','sv_cube012','sv_napkin','sv_vase','sv_tv','sv_piano','sv_lamp','sv_painting001','sv_painting003','sv_plant','sv_door','sv_door_1','sv_phone'],'tex':{'sv_wallpaper':('sv_wallpaper.png',128),'sv_floor':('sv_floor.png',128),'sv_ceiling':('sv_ceiling.png',64)},'jpg':['gen/ep9_courtyard','gen/ep9_answering_machine','gen/ep9_family_photo','gen/ep9_mum_cooking','gen/ep9_stairwell'],'audio':['amb_still','lightsw']},
 'field':{'glb':['nat_commontree_1','nat_commontree_2','nat_commontree_3','nat_pine_2','nat_bush_common','nat_bush_common_flowers','nat_flower_3_group','nat_flower_4_group','nat_grass_wispy_tall','nat_grass_common_tall','nat_rock_medium_1','nat_rock_medium_2','nat_rockpath_round_wide','nat_rockpath_round_small_1','nat_clover_1','nat_plant_7_big'],'tex':{'sky_1':('sky_1.png',576),'sky_2':('sky_2.png',576),'sky_3':('sky_3.png',576),'sky_4':('sky_4.png',576)},'audio':['amb_woods','bird','gstep1','gstep2','gstep3','gstep4','mus_field']},
 'rogue':{'tex':{'rg_wall':('kits/block/textures/stair_line.png',128),'rg_white':('kits/block/textures/whitewash.png',128),'rg_concrete':('kits/block/textures/concrete_floor.png',128),'rg_wallpaper':('kits/block/textures/wallpaper.png',128),
   'rg_terrazzo':('rogue/terrazzo_c.png',128),'rg_mint':('rogue/mint.png',128),'rg_flatdoor':('rogue/flatdoor.png',128),
   'rg_y_wall':('rogue/wallpaper_backrooms_yellow.png',128),'rg_y_carpet':('rogue/carpet_backrooms_damp.png',128),'rg_y_ceil':('rogue/ceiling_tiles_acoustic.png',128),'rg_y_light':('rogue/ceiling_light_panel.png',128),
   'rg_hotel_carpet':('rogue/hotel_carpet.png',128),'rg_hotel_wall':('rogue/hotel_wall.png',128),'rg_pool_blue':('rogue/pool_blue.png',128),'rg_pool_white':('rogue/pool_white.png',128),'rg_stripe':('rogue/stripe_mustard.png',128)},
   'jpg':['gen/sm_'+n for n in 'ep3_cat ep3_cake ep5_noodles ep5_skate ep3_bench ep5_cat_fail ep4_meme ep6_school_front ep3_window ep3_rink1 ep9_courtyard ep3_selfie ep5_bedroom ep9_stairwell ep9_family_photo ep6_morning'.split()],
   'paint':['warm_light_cold_stairwell','misty_twilight_park_with_tram_glow','endless_teal_hallway_with_cat_posters','midnight_school_hallway_glow','midnight_metro_empty_platform_glow','empty_underground_passageway_2'],   # title cards only; posters come from the gallery pack
   'stickers':sorted(f[:-4] for f in os.listdir('assets_src/stickers') if f.endswith('.png')) if os.path.isdir('assets_src/stickers') else [],
   'audio':['rg_drone_stair','rg_drone_yellow','rg_signal1','rg_signal2','lightsw','knock','phonering','door_close','presence','stinger']},
 'gallery':{'gallery':sorted(f[:-4] for f in os.listdir('assets_src/gallery') if f.endswith('.jpg')) if os.path.isdir('assets_src/gallery') else []},
 'underpass':{'glb':['arcade','vending','vending2'],'kits':{'lpsub':('kits/lpsub','up_',1024,['bench_metro','bin_metro','departure_board','fare_gate','lamp_trough_metro','sign_way_out','ticket_machine','poster_hills']),'psxmetro':('kits/psxmetro','pm_',1024,['column','fire_cabinet','bench_hall','station_name'])},
   'tex':{'up_wall':('kits/lpsub/textures/wall_metro.png',128),'up_dado':('kits/lpsub/textures/wall_metro_dado.png',128),'up_floor':('kits/lpsub/textures/floor_platform.png',128),'up_ceil':('kits/lpsub/textures/ceiling_metro.png',128),'pm_granite':('kits/psxmetro/textures/granite_grey.png',128)}},
 'metro':{'glb':['mp_metro'],'audio':['rg_train_pass','rg_station_bell'],'kits':{'subway':('kits/subway','sw_',512,['mod_ceiling_tall','mod_platform_edge','mod_platform_floor','mod_track_straight','mod_wall_tall','prop_bench_01','prop_bin_01','prop_timetable_01','prop_turnstile_01','prop_worklight_01'])}},
 'park':{'kits':{'block':('kits/block','bk_',512,['wall_panel','wall_window_panel','wall_doorway_panel','door_entrance','entrance_canopy','sign_entrance','bench_entrance','bin_container','wall_post_panel'])},'glb':['nat_commontree_1','nat_commontree_2','nat_commontree_3','nat_pine_2','nat_bush_common','nat_bush_common_flowers','nat_rock_medium_1','nat_grass_common_tall','nat_plant_7_big'],'tex':{'rg_asphalt':('kits/block/textures/asphalt.png',128)},'audio':['amb_woods','gstep1','gstep2','gstep3','gstep4']},
 'ep7':{'jpg':['gen/ep7_cctv_suspect','gen/ep7_cctv_you'],'audio':['amb_hollow','sec_latch','shutter','vent','plastic2','strain','phonebtn','typing','crton','hatch','knob','lightsw']},
}
import sys
ONLY=sys.argv[1:]
total=0
for name,P in PACKS.items():
    if ONLY and name not in ONLY: continue
    d={'glb':{},'tex':{},'img':{},'audio':{}}
    for g in P.get('glb',[]): d['glb'][g]=b64(f'build/glb/{g}.glb')
    for k,(f,s) in P.get('tex',{}).items(): d['tex'][k]=png_b64(f'{SRC}/tex/{f}' if not f.startswith('kits/') else f'{SRC}/{f}',s)
    for i in P.get('img',[]):
        im=Image.open(f'{SRC}/ui/{i}.png').convert('RGBA'); bb=im.getbbox()
        if bb: im=im.crop(bb)
        im.thumbnail((256,256),Image.LANCZOS); buf=io.BytesIO(); im.save(buf,'PNG',optimize=True); d['img'][i]=base64.b64encode(buf.getvalue()).decode()
    for kit,(kdir,pre,asz,pieces) in P.get('kits',{}).items():
        im=Image.open(f'{SRC}/{kdir}/textures/atlas.png').convert('RGBA')
        if asz and im.size[0]>asz: im=im.resize((asz,asz),Image.NEAREST)
        buf=io.BytesIO(); im.save(buf,'PNG',optimize=True)
        d.setdefault('kits',{})[kit]={'prefix':pre,'atlas':base64.b64encode(buf.getvalue()).decode(),'pieces':{pc:b64(f'{SRC}/{kdir}/glb/{pc}.glb') for pc in pieces}}
    for i in P.get('jpg',[]):
        big = i.replace('gen/sm_', 'gen/')
        if '/sm_' in i and os.path.exists(f'build/{big}.jpg'):
            # posters for the flat: a sharp 512 px square from the full picture (the 192 px thumbnails looked blurry on the wall)
            im=Image.open(f'build/{big}.jpg').convert('RGB'); w,h=im.size; m=min(w,h); im=im.crop(((w-m)//2,(h-m)//2,(w-m)//2+m,(h-m)//2+m)).resize((512,512),Image.LANCZOS)
            buf=io.BytesIO(); im.save(buf,'JPEG',quality=84); d['img'][os.path.basename(i)]='data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode()
        elif os.path.exists(f'build/{i}.jpg'): d['img'][os.path.basename(i)]='data:image/jpeg;base64,'+b64(f'build/{i}.jpg')
        else: print('  (missing picture, skipped:',i,')')
    for n in P.get('gallery',[]): d['img']['gl_'+n]='data:image/jpeg;base64,'+b64(f'{SRC}/gallery/{n}.jpg')   # full resolution, as Mark made them
    for n in P.get('paint',[]):
        im=Image.open(f'{SRC}/paint/{n}.jpg').convert('RGB'); im.thumbnail((1024,1024),Image.LANCZOS); buf=io.BytesIO(); im.save(buf,'JPEG',quality=84)
        d['img']['pt_'+n]='data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode()
    for n in P.get('stickers',[]): d['img']['st_'+n]='data:image/png;base64,'+png_b64(f'{SRC}/stickers/{n}.png',160)
    for a in P.get('audio',[]): d['audio'][a]=b64(f'{SRC}/audio/{a}.ogg')
    if 'font' in P: d['font']=b64(f'{SRC}/font/{P["font"]}')
    js='window.SK_DATA=window.SK_DATA||{};window.SK_DATA['+json.dumps(name)+']='+json.dumps(d,separators=(',',':'))+';\n'
    open(f'{OUT}/{name}.js','w').write(js); total+=len(js)
    print(name, round(len(js)/1e6,2),'MB')
print('total',round(total/1e6,2),'MB')
