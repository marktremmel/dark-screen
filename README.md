# Sötét Képernyő (Dark Screen)

A browser horror anthology about digital culture, made for Digital Culture lessons with grades 7–9 at SEK Budapest. Nine short episodes, about one lesson each, on smart devices, oversharing, face recognition, cyberbullying, ransomware, addictive feeds, voice-clone scams and deepfakes. Psychological horror only: no gore and no violence, at most one or two jump scares per episode, and a quiet mode (csendes mód) that removes them. Every episode ends with a calm debrief: what really happened, three things to do in real life, and where to get help.

Student-facing text is in English, with the key terms in Hungarian in brackets and in hover tooltips.

## Play

Open `game/index.html` in Chrome or Edge. It runs offline from a folder (no installation, no server), or from any web host such as GitHub Pages. Headphones help.

Controls: mouse to look (click the picture first), W A S D to walk, Shift to run, E to use, F for the flashlight, Esc to pause. The phone and laptop episodes are played with the mouse only.

## The episodes

| # | Episode | Format | Topic |
|---|---|---|---|
| 1 | Késő esti szerelés (Late-night build) | 3D | Inside a computer, working safely, pareidolia |
| 2 | Mindig figyel (Always listening) | 3D | Smart devices, default passwords, public links |
| 3 | Valaki tudja (Someone knows) | Phone | Geotags, metadata, aggregation |
| 4 | Kamerák (Cameras) | 3D | Face recognition, false matches, data rights |
| 5 | A csoportchat (The group chat) | Laptop | Cyberbullying, bystanders and upstanders |
| 6 | Zárolva (Locked) | 3D | Phishing, ransomware, backups |
| 7 | Végtelen hírfolyam (Endless feed) | Phone | Recommendation algorithms, dark patterns, sleep |
| 8 | Anya hangja (Mum's voice) | 3D | Voice cloning, the grandparent scam, family code word |
| 9 | Tükörkép (Reflection) | Laptop | Deepfakes, verification, reporting impersonation |

## For teachers

Episode 1 is always open. Episodes 2–9 open with a lesson code the teacher gives out in class; the game only stores hashes of the codes. The codes, the teacher guides, the reflection sheets and the Teacher Board (paste students' save codes, see the class at a glance, all offline) are in the separate Teacher Pack, which is not part of this repository.

Progress is saved per nickname in the browser. Every end screen shows a save code (SK1-…) that moves progress to another computer and that students paste into their reflection sheet.

## Building

`npm install`, then `npm run build` bundles `src/` into `game/game.js`. The asset packs in `game/data/` are prebuilt; `tools/pack.py` rebuilds them but needs the original asset files, which are not included here.

## Credits

See [game/CREDITS.txt](game/CREDITS.txt) and the Credits screen in the game. Third-party models, textures, music and sounds are used under their own licences and are included only in their packed, in-game form. The "Still Alive" easter egg links to the song on YouTube; the song is not part of this repository.

All apps, companies, people and messages in the game are invented.
