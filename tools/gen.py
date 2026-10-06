# Map Mark's painted pictures (generator file names) to game keys, convert to build/gen/<key>.jpg
import os, sys
from PIL import Image
SRC='/mnt/user-data/uploads/Game Assets/Claude outputs/Sotet_Kepernyo/new_images/'
MAP={
 'Flashlight in a Shadowy Hallway':'ep1_intro', 'Peephole Neighbor Under Flashlight':'ep1_peephole',
 'Moonlit Teddy Bear on the Shelf':'ep2_bubu', 'Tender Flashlight Moment with Cat':'ep2_bear_view',
 'Painterly Portrait of a Boy in Blue':'ep4_turn_bence',
 'Painterly Cat Tumbles Through Cozy Night Apartment':'ep5_cat_fail', 'Cinematic Skatepark Ollie at Dusk':'ep5_skate', 'Cozy Rainy Night Ramen Feast':'ep5_noodles',
 'Rainy Night Mannequin Display':'ep5_mannequins', 'Eerie Nighttime School Corridor':'ep5_cctv', 'Late-Night Solitude by the Window':'ep5_bedroom', 'Rainy Neon Mall Atrium':'ep5_mall_screens',
 'Lonely Courtyard Under Amber Light':'ep9_courtyard', 'Vintage Phone and Answering Machine Still Life':'ep9_answering_machine',
 'Grinning Schoolyard Selfie at Dusk':'ep6_fake_frame', 'Rainy Evening at a Quiet Urban School':'ep6_school_front', 'Painterly Portrait in Mustard Knit':'ep6_lili',
 'Painterly Portrait of a Confident Teenager':'ep6_mate',
 # round 4 window views
 'Moody Nighttime Apartment Courtyard':'view_night_flat', 'Moody Eastern European City at Night':'view_night_high', 'Rain-Soaked Schoolyard at Night':'view_night_school', 'Autumn Dawn Over Soviet Apartment Blocks':'view_morning_school',
 'Moody Dawn in a Cluttered Teen Bedroom':'ep6_morning', 'Golden Morning in the Vintage Computer Lab':'ep6_lab_morning',
}
os.makedirs('build/gen',exist_ok=True)
for name,key in MAP.items():
    p=SRC+name+'.png'
    if not os.path.exists(p): print('missing',name); continue
    im=Image.open(p).convert('RGB'); im.thumbnail((1024,1024),Image.LANCZOS); im.save(f'build/gen/{key}.jpg',quality=82); print(key,im.size)
