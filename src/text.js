// All student-facing text. English, with Hungarian in brackets for key words.
// Markup: [[key]] or [[key|shown text]] becomes a hover/focus tooltip from GLOSSARY.

export const GLOSSARY = {
  cpu: { term: 'CPU', hu: 'processzor', tip: 'Central Processing Unit: the chip that carries out the instructions of every program, billions of times per second.' },
  cooler: { term: 'cooler', hu: 'hűtő', tip: 'A metal block with a fan that pulls heat away from the CPU. Without it the CPU overheats and slows down or shuts off.' },
  paste: { term: 'thermal paste', hu: 'hővezető paszta', tip: 'A grey paste that fills microscopic air gaps between the CPU and the cooler, so heat can flow. A pea-sized dot is enough.' },
  ram: { term: 'RAM', hu: 'memória', tip: 'Random Access Memory: fast working memory for the programs that are running right now. It forgets everything when the power goes off.' },
  dual: { term: 'dual channel', hu: 'kétcsatornás mód', tip: 'Two RAM sticks in matching slots (here A2 and B2) can be read at the same time, which is faster.' },
  ssd: { term: 'SSD', hu: 'SSD-meghajtó', tip: 'Solid State Drive: long-term storage. Your files, the operating system and games stay here even without power.' },
  m2: { term: 'M.2 slot', hu: 'M.2 foglalat', tip: 'A small flat slot on the motherboard for modern SSDs. The drive lies flat and is held by one tiny screw.' },
  gpu: { term: 'graphics card', hu: 'videokártya', tip: 'GPU: draws the image you see. It has thousands of small cores that calculate many pixels at once.' },
  pcie: { term: 'PCIe x16 slot', hu: 'PCIe x16 foglalat', tip: 'The long slot near the CPU. Graphics cards go here because it carries the most data lanes.' },
  psu: { term: 'PSU', hu: 'tápegység', tip: 'Power Supply Unit: turns 230 V mains electricity from the wall socket into the low, steady voltages the parts need. Never open one.' },
  cables: { term: 'power cables', hu: 'tápkábelek', tip: '24-pin for the motherboard, 8-pin for the CPU, 8-pin PCIe for the graphics card. Each plug has its own shape so it only fits one way.' },
  motherboard: { term: 'motherboard', hu: 'alaplap', tip: 'The big circuit board that connects every part. Everything plugs into it.' },
  socket: { term: 'socket', hu: 'foglalat', tip: 'The square holder on the motherboard where the CPU sits. A small triangle shows the correct direction.' },
  static: { term: 'static electricity', hu: 'sztatikus elektromosság', tip: 'Charge your body collects, for example from a carpet. A tiny invisible spark can destroy a chip. Touch bare metal first to discharge it.' },
  fusebox: { term: 'fuse box', hu: 'biztosítéktábla', tip: 'The panel with switches that protect the home wiring. If a switch trips, that part of the flat has no power.' },
  pareidolia: { term: 'pareidolia', hu: 'pareidólia', tip: 'When the brain sees faces or people in random shapes: a coat on a hook, a shadow in a doorway. It happens more in the dark, and when you are scared.' },
  powercut: { term: 'power cut', hu: 'áramszünet', tip: 'When the electricity supply stops, for a whole street or just one flat.' },
  breaker: { term: 'main switch', hu: 'főkapcsoló', tip: 'The big switch in the fuse box that turns power to the whole flat on or off.' },
  bios: { term: 'BIOS', hu: 'BIOS', tip: 'The tiny program built into the motherboard that checks the parts and starts the computer before the operating system loads.' },
  permission: { term: 'permission', hu: 'engedély', tip: 'When an app asks to use your camera, microphone, location or contacts. You can say no, and change it later in the settings.' },
  flashlight: { term: 'flashlight', hu: 'zseblámpa', tip: 'Battery-powered torch. Batteries run out: pick up spare ones.' },
  smart: { term: 'smart device', hu: 'okoseszköz', tip: 'An everyday object with a computer, sensors and an internet connection inside: speakers, TVs, toys, doorbells, vacuums.' },
  wakeword: { term: 'wake word', hu: 'ébresztőszó', tip: 'The word a smart speaker waits for ("Hey VELA"). It listens all the time for it, and sometimes mishears and starts recording by mistake.' },
  cloud: { term: 'cloud', hu: 'felhő', tip: 'Other companies\' computers on the internet where your data is stored. If it is in the cloud, it is not only on your device.' },
  acr: { term: 'viewing data', hu: 'nézési adatok', tip: 'Smart TVs can recognise what is on screen and send that list to advertising partners (ACR: automatic content recognition).' },
  defaultpw: { term: 'default password', hu: 'gyári jelszó', tip: 'The password a device ships with, like 0000 or admin. Lists of them are online, so anyone can try them. Always change it.' },
  publiclink: { term: 'public link', hu: 'nyilvános link', tip: '"Anyone with the link can view." Links get forwarded, so a public link is not private at all.' },
  darkpattern: { term: 'dark pattern', hu: 'sötét minta', tip: 'A design trick that pushes you to choose what the company wants: guilt-trip buttons, tiny grey "no" links, settings switched on by default.' },
  permissionlog: { term: 'activity log', hu: 'tevékenységnapló', tip: 'The list of what a device or app did and when. Checking it is how you find out what really happened.' },
  geotag: { term: 'geotag', hu: 'helymegjelölés', tip: 'GPS coordinates saved inside a photo file. Anyone who gets the original file, or an app that reads it, can see exactly where the photo was taken.' },
  metadata: { term: 'metadata', hu: 'metaadat', tip: 'Data about data: the hidden details stored with a photo or file, like the date, the phone model and the location.' },
  aggregation: { term: 'aggregation', hu: 'adatok összerakása', tip: 'Putting many small, harmless pieces of information together until they reveal something big: where you live, when you go out, who you are.' },
  streetview: { term: 'street view', hu: 'utcakép', tip: 'Online maps with 360° photos taken from the street. Anyone can look at almost any street, bench or front door from home.' },
  privateacc: { term: 'private account', hu: 'privát fiók', tip: 'Only followers you approve can see your posts. Your name, profile picture and bio are still visible to everyone.' },
  facerec: { term: 'face recognition', hu: 'arcfelismerés', tip: 'Software that turns a face in a picture into a list of numbers (a face template) and compares it with stored templates to say who it probably is.' },
  falsematch: { term: 'false match', hu: 'téves egyezés', tip: 'When face recognition says two different people are the same person. Bad light, a hood, similar clothes or a low-quality camera make it more likely, and it happens more to some groups of people than to others.' },
  biometric: { term: 'biometric data', hu: 'biometrikus adat', tip: 'Data made from your body: face, fingerprint, voice, the way you walk. You cannot change it like a password, so the law protects it extra strongly.' },
  retention: { term: 'retention period', hu: 'adatmegőrzési idő', tip: 'How long recordings and data are kept before they must be deleted. "Until no longer needed" is not a real answer.' },
  dpo: { term: 'data protection officer', hu: 'adatvédelmi tisztviselő', tip: 'The person in an organisation whose job is to make sure personal data is used legally. You can write to them directly.' },
  accessright: { term: 'access request', hu: 'hozzáférési kérelem', tip: 'Under data protection law (GDPR) you can ask any organisation what personal data it holds about you, and get a copy. They normally have to answer within a month.' },
  ransomware: { term: 'ransomware', hu: 'zsarolóvírus', tip: 'A program that encrypts (locks) files and demands money for the key. It spreads to every computer and disk it can reach on the network.' },
  phishing: { term: 'phishing', hu: 'adathalászat', tip: 'A fake message that pretends to come from someone you trust, to make you click, open a file or type a password.' },
  backup: { term: 'backup', hu: 'biztonsági mentés', tip: 'A copy of your files somewhere else. A backup that is always connected can be encrypted along with everything else; keep one copy offline.' },
  mfa: { term: 'two-step login', hu: 'kétlépcsős azonosítás', tip: 'Logging in with a password AND a second thing, like a code on your phone. A stolen password alone is then not enough.' },
  network: { term: 'network', hu: 'hálózat', tip: 'Computers connected by cables or Wi-Fi so they can share files and the internet. Whatever can reach a computer over the network, malware can reach too.' },
  cyberbullying: { term: 'cyberbullying', hu: 'internetes zaklatás', tip: 'Hurting, mocking or shutting someone out again and again using phones and apps: memes, group chats, edited photos, comments.' },
  bystander: { term: 'bystander', hu: 'szemlélő', tip: 'Someone who sees bullying happen but is not the bully or the target. What bystanders do (laugh, ignore, help) decides a lot.' },
  upstander: { term: 'upstander', hu: 'kiálló', tip: 'A bystander who does something helpful: supports the target, refuses to join in, speaks up, or tells an adult.' },
  pileon: { term: 'pile-on', hu: 'tömeges rászállás', tip: 'When many people join in against one person at once. Each one feels it is "only one emoji", but together it is a crowd.' },
  readreceipt: { term: 'read receipts', hu: 'olvasási visszaigazolás', tip: 'The ✓✓ that shows others you have read their message. It can create pressure to answer. You can usually switch it off.' },
  anonacc: { term: 'anonymous account', hu: 'névtelen fiók', tip: 'An account with no real name. It feels untraceable, but platforms know the phone, email and IP address behind it and can pass this on to schools or the police.' },
  checkin: { term: 'check-in', hu: 'bejelentkezés', tip: 'A post that says where you are (or were), often with a time. Regular check-ins show your routine.' },
  recalgo: { term: 'recommendation algorithm', hu: 'ajánlórendszer', tip: 'The program that picks the next clip for you. It learns from what you watch, for how long, and when, and its goal is to keep you watching.' },
  infinitescroll: { term: 'infinite scroll', hu: 'végtelen görgetés', tip: 'A feed with no bottom. Without an end, there is no natural moment to stop.' },
  autoplay: { term: 'autoplay', hu: 'automatikus lejátszás', tip: 'The next video starts by itself. Stopping takes a decision; carrying on takes none.' },
  variablereward: { term: 'variable reward', hu: 'változó jutalom', tip: 'Sometimes you get something great, mostly nothing, and you never know which. It is the trick that keeps people at slot machines.' },
  streak: { term: 'streak', hu: 'sorozat', tip: 'A counter of days in a row. Apps use the fear of "breaking" it to make you open them every day.' },
  confirmshaming: { term: 'confirmshaming', hu: 'bűntudatkeltés', tip: 'A "no" button written to make you feel guilty, like "No, I don\'t care about my friends".' },
  deepfake: { term: 'deepfake', hu: 'mélyhamisítvány', tip: 'A video, photo or recording of a real person, made or changed by AI so they seem to say or do something they never did.' },
  reverseimg: { term: 'reverse image search', hu: 'fordított képkeresés', tip: 'Searching the web with a picture instead of words, to find where it (or something very like it) appeared before.' },
  impersonation: { term: 'impersonation', hu: 'megszemélyesítés', tip: 'Pretending to be a real person online. Every big platform has a report option for it.' },
  voiceclone: { term: 'voice clone', hu: 'hangklón', tip: 'A computer copy of a real person\'s voice, made from recordings of them talking. A few minutes of public video is enough to make it say anything.' },
  grandscam: { term: 'grandparent scam', hu: 'unokázós csalás', tip: 'A scam that targets older people by phone: a "grandchild" or "child" in trouble needs cash at once, and someone comes to collect it. Now sometimes with a cloned voice.' },
  callback: { term: 'call back', hu: 'visszahívás', tip: 'Hang up and call the person on a number you already have, not the one the caller gives you. The safest check there is.' },
  codeword: { term: 'family code word', hu: 'családi jelszó', tip: 'A secret word your family agrees on. Someone who claims to be family and asks for help must be able to say it.' },
  spoof: { term: 'caller ID spoofing', hu: 'hívószám-hamisítás', tip: 'Faking the number that shows on the phone\'s display. A familiar number on the screen proves nothing on its own.' },
};

export const PARTS = {
  cpu:    { fit: 'CPU', name: 'CPU',            hu: 'processzor',   key: 'cpu' },
  cooler: { fit: 'CPU cooler', name: 'CPU cooler',     hu: 'hűtő',         key: 'cooler' },
  ram:    { fit: 'RAM sticks', name: 'RAM sticks',     hu: 'memória',      key: 'ram' },
  ssd:    { fit: 'SSD', name: 'SSD',            hu: 'tárhely',      key: 'ssd' },
  gpu:    { fit: 'graphics card', name: 'Graphics card',  hu: 'videokártya',  key: 'gpu' },
  psu:    { fit: 'power supply', name: 'Power supply',   hu: 'tápegység',    key: 'psu' },
  cables: { fit: 'power cables', name: 'Power cables',   hu: 'kábelek',      key: 'cables' },
};
export const PART_ORDER = ['cpu', 'cooler', 'ram', 'ssd', 'gpu', 'psu', 'cables'];

export const SUCCESS_LINES = {
  cpu: 'The [[cpu]] is the brain of the computer: it carries out billions of instructions every second.',
  cooler: 'The [[cooler]] pulls heat away from the CPU. Without it, the CPU would overheat in minutes.',
  ram: '[[ram]] is working memory: the data of the programs running right now lives here. It empties when the power goes off.',
  ssd: 'The [[ssd]] keeps your files and the system safe, even when there is no power.',
  gpu: 'The [[gpu]] draws the picture: thousands of small cores calculate at the same time.',
  psu: 'The [[psu]] turns the electricity from the wall into something the parts can use.',
  cables: 'The [[cables]] carry the power: with the wrong plug the computer would not even start.',
};

// Episodes in play order. `id` is the internal number used in saves (kept stable),
// the position in this list is the number shown to students.
export const EPISODES = [
  { id: 1, title: 'Késő esti szerelés', en: 'Late-night build', format: '3d' },
  { id: 2, title: 'Mindig figyel', en: 'Always listening', format: '3d' },
  { id: 3, title: 'Valaki tudja', en: 'Someone knows', format: 'screen' },
  { id: 7, title: 'Kamerák', en: 'Cameras', format: '3d' },
  { id: 4, title: 'A csoportchat', en: 'The group chat', format: 'screen' },
  { id: 8, title: 'Zárolva', en: 'Locked', format: '3d' },
  { id: 5, title: 'Végtelen hírfolyam', en: 'Endless feed', format: 'screen' },
  { id: 9, title: 'Anya hangja', en: 'Mum\'s voice', format: '3d' },
  { id: 6, title: 'Tükörkép', en: 'Reflection', format: 'screen' },
];
export const BUILT = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true };
// Release locks: each episode after the first opens with a code the teacher gives out in that lesson.
// Lesson codes are on unless the page sets window.SK_LOCKS = false before game.js (the public itch.io build does; the school build doesn't).
export const LOCKS_ON = typeof window === 'undefined' || window.SK_LOCKS !== false;
// Only hashes are stored, so the codes can't be read out of the public source. The codes themselves are in the Teacher Pack.
// An episode can have more than one valid code (the old codes for 2 and 3 still work).
export const UNLOCK_HASH = { 2: ['53fe6ab6', 'ebaae6e5'], 3: ['0e53f459', 'ac84f1e5'], 7: '1675a29d', 4: 'dcc8ceff', 8: '7fa41c1f', 5: 'e196b5b6', 9: '88c3440c', 6: '6b13e8e9', rogue: '465aad5d' };  // rogue: the Lépcsőház door in Room 214
export const TEACHER_HASH = '53bb351b';
export function codeHash(c) { let x = 2166136261; const s = 'sk-salt:' + c; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16).padStart(8, '0'); }
export const normCode = c => String(c || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
export const epPos = id => EPISODES.findIndex(e => e.id === id) + 1;
export const epInfo = id => EPISODES.find(e => e.id === id);
export const nextEp = id => { for (let i = epPos(id); i < EPISODES.length; i++) if (BUILT[EPISODES[i].id]) return EPISODES[i]; return null; };

export const DEBRIEF_EP1 = { id: 1,
  title: 'What really happened?',
  body: `There was a [[powercut]] and you built the computer alone in the dark. The heavy footsteps and the knocking were Mrs Kovács from the third floor: she heard banging from your flat and came down to check, then left a note. The phone call was Mum on the landline, because your mobile had died. The chair? Cirmi the cat jumped off it. The shape in the hallway was a long coat on the coat stand, and the figure you kept glimpsing in doorways was your brain filling the dark with people: that's called [[pareidolia]]. And VELA, the smart speaker, has a battery: it kept listening the whole time and woke up whenever it thought it heard something. The sparks, though, point to a real danger: [[static]] can destroy a part in a split second, and a wrong connection can damage the whole computer.`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Before you open a computer, unplug it from the wall and press the power button once, so the leftover charge drains away.',
    'Discharge [[static]] from your body: touch a bare metal surface or wear an anti-static wrist strap (antisztatikus csuklópánt). Hold parts by their edges.',
    'If something doesn\'t fit, don\'t force it! Check the manual or a trustworthy video. Never open the [[psu]].',
  ],
  helpTitle: 'Where can you get help?',
  help: `Ask an adult you trust: a parent, or your IT teacher. The shop or the manufacturer can help too (warranty: garancia), or a repair service. If anything sparks, smokes or smells burnt: unplug it straight away and tell an adult.`,
  teaser: 'And the old teddy bear on your bed? Its eye blinked when you told Cirmi your secret. It heard you. That\'s the next episode.',
};

export const DEBRIEF_EP2 = { id: 2,
  title: 'What really happened?',
  body: `Your old [[smart|smart]] teddy bear, Bubu, was still connected to the Wi-Fi. It had voice-activated recording switched on, so when you talked to the cat yesterday it recorded you and uploaded the clip to its [[cloud]] with a [[publiclink]]. The account still had the [[defaultpw]] 0000, so a stranger simply logged in and shared the clip. Closing the link stopped new views, but anyone among the 200 who watched it could have saved a copy: once something is out, you can\'t pull every copy back. VELA, the TV, the robot vacuum and the doorbell did not leak the clip, but they were all collecting more than you thought: false [[wakeword]] recordings sent for human review, [[acr]] sold to advertisers, a map of your home, and public doorbell videos of your neighbour. The "are you sure?" pop-ups that made switching things off feel wrong were [[darkpattern|dark patterns]]. And the figure in the corner of your eye? A dark flat, a scary evening and a tired brain: [[pareidolia]] again.`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Change every [[defaultpw]] (0000, admin, 1234) on toys, cameras, routers and apps. Use a long password you don\'t use anywhere else.',
    'Go through the settings of every smart device once: switch off "share to improve", "personalised ads", public links and recording you don\'t need. Delete old recordings.',
    'Read the [[permissionlog|activity log]] when something feels wrong. It shows what a device did and when, and it is your evidence.',
  ],
  helpTitle: 'Where can you get help?',
  help: `Tell an adult you trust (parent, class teacher, school counsellor). Report the post in the app where it was shared: every platform has a report button. In Hungary you can report harmful online content to the NMHH Internet Hotline (internethotline.hu), and the data protection authority (NAIH) handles misuse of personal data. If someone threatens you, keep screenshots and don't reply.`,
  teaser: 'Next time: a stranger knows where you are. How?',
};

export const DEBRIEF_EP3 = { id: 3,
  title: 'What really happened?',
  body: `Nobody hacked you. n1ghtwatch is a stranger who simply collected what you had posted yourself. The cat photo had a [[geotag]] in its [[metadata]], so Pixa showed your street. Your public profile gave away your name, class, school and birthday. Your [[checkin|check-ins]] showed that you skate at the same rink every Saturday at 6. The mirror selfie showed your school crest and the tram stop outside your window, and Chatr Map showed your live dot to everyone. None of these posts was dangerous on its own: put together, they were. That is called [[aggregation]]. The photo of "your" bench was not taken tonight: it came from a [[streetview|street-view]] map that anyone can open. And the shape in the black screen? A dark room, your own reflection and a brain on high alert ([[pareidolia]]). When the light came on, it was Dóri and a hoodie on the door.`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Turn off "save location" for your camera, and check the 📍 on your old posts. Share your live location only with people you really know, or nobody.',
    'Look at your profile as a stranger would: no school, class, birthday or routine ("every Saturday at 6") in public. Check photos for crests, street signs and house numbers before posting.',
    'If a stranger knows too much: don\'t reply. Take screenshots, report the account, block it, and tell an adult you trust.',
  ],
  helpTitle: 'Where can you get help?',
  help: `Tell an adult you trust first: a parent, an older sibling, your class teacher or the school counsellor. Every app has a report and a block button. In Hungary the Kék Vonal child helpline (116-111) is free and anonymous, and harmful online content can be reported to the NMHH Internet Hotline (internethotline.hu). If you feel in danger right now, call 112.`,
  teaser: 'Next time: a shopping centre after closing, and cameras that are sure they know your face.',
};

export const DEBRIEF_EP8 = { id: 8,
  title: 'What really happened?',
  body: `One person clicked one email. It looked like it came from the principal, but the address was a look-alike, it pushed for a quick decision, and the "PDF" was a program ending in .exe: a classic [[phishing]] email. Opening it started [[ransomware]], which locked the files on PC-3 and then crawled through the school's [[network]] to every computer, the lights, the door locks and the server. Pulling one cable stopped one computer; pulling the internet cable stopped the attackers from reaching in. The worst part was the [[backup]]: it was plugged in all the time, so the ransomware could reach it like any other disk. Before locking anything, it also copied 2.3 GB of files out of the school, including the parents' contact list. Real gangs do this so they can threaten to publish, and stolen data gets sold on. And the admin password was on a sticky note on a screen. The footsteps and the torch at the end of the corridor? Feri bácsi, doing his round, as confused as you were.`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Before you open an attachment, check three things: the real sender address, any pressure ("within 1 hour!"), and the file type. A ".pdf.exe" is a program. When in doubt, ask the sender another way.',
    'Keep backups of the files you care about, and keep one copy unplugged (a disk in a drawer, or a cloud backup with older versions). A backup that is always connected is not safe.',
    'Use long, different passwords, never on a sticky note, and switch on [[mfa]] wherever you can. If something like this happens: unplug, don\'t pay, tell an adult.',
  ],
  helpTitle: 'Where can you get help?',
  help: `At school: your teacher and the school's IT administrator. At home: a parent. In Hungary, cyber security incidents can be reported to the national cyber security centre, NKI (nki.gov.hu), which has an incident report form, and crimes like extortion to the police. If a message asks for money, a password or "urgent" action, stop and check first.`,
  teaser: 'Next time: a feed that never ends, and an app that doesn\'t want you to sleep.',
};

export const DEBRIEF_EP5 = { id: 5,
  title: 'What really happened?',
  body: `Loopa never asked what you like. It measured how long you stopped on each clip, what you watched twice, and what time it was. That is a [[recalgo]], and its only goal is to keep you watching. Fear and outrage hold attention best, so after one dark clip it served you darker ones: smart toys, cameras, red screens, mannequins, your own worst week. The figure in the red hoodie was never really there: a blur your brain stitched into a person, and at the end, your own reflection in the black screen. The app is built from [[darkpattern|dark patterns]]: [[infinitescroll]], [[autoplay]], pull-to-refresh as a [[variablereward]], a [[streak]], fake-urgent notifications and [[confirmshaming]]. None of them is an accident; each one is tested to make stopping harder. And every second you stopped on the mall clip told the feed to show it to more people.`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Switch off autoplay and every notification you don\'t need, in every app. Set a daily limit, and when it pops up, take it seriously.',
    'Name the trick when you feel it: "that\'s a streak", "that\'s infinite scroll". Naming it makes it much weaker.',
    'Phone out of the bedroom at night, or face down on silent across the room. Sleep beats one more clip, every time.',
  ],
  helpTitle: 'Where can you get help?',
  help: `Talk to a parent about phone-free hours at night: it is easier when the whole family does it. If a feed keeps showing you things that make you anxious or low, use "Not interested", unfollow, or take a break. If those feelings stay, talk to an adult you trust or call the Kék Vonal child helpline (116-111), free and anonymous.`,
  teaser: 'Next time: Nagyi\'s phone rings at 22:40, and it\'s Mum, crying. Or is it?',
};

export const DEBRIEF_EP6 = { id: 6,
  title: 'What really happened?',
  body: `The video was a [[deepfake]]. Máté made it in an evening with a free face-swap app and "stuff that was online anyway": your face and hoodie from the mirror selfie that n1ghtwatch collected (which is why the badge was on the wrong side), your voice from Bubu's twelve-second clip (which is why "Lili" came out as "Cirmi", with a cat underneath), a street-view picture of the school for the background, and the mall clip from Saturday night stuck on the end. None of it was hacked. All of it was posted, leaked or recorded earlier in the year, in the episodes you played. You took it apart the way professionals do: frame by frame, sound by sound, and with [[reverseimg|reverse image search]] to find where each piece came from. Then you did the two things that actually stop a fake: you reported it as [[impersonation]] with evidence, and you gave the proof to an adult who could act. Everyone who shared it "just to ask if it's real" helped it spread.`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Before you share a shocking video of someone you know, stop and check: where did it first appear, does the mouth match, do details (badges, writing, hands) look right, does the voice sound like them?',
    'If it\'s a fake of you: don\'t argue in the comments. Collect evidence (screenshots, links, times), report it on the platform as impersonation or manipulated media, and tell an adult you trust.',
    'Look at what is public about you today: clear selfies, long voice clips, your school and class. Less raw material means harder fakes.',
  ],
  helpTitle: 'Where can you get help?',
  help: `Your class teacher, the school counsellor or a parent first. Report fakes on the platform; harmful online content can also be reported to the NMHH Internet Hotline (internethotline.hu). Making or publishing a false recording that damages someone's reputation is a crime in Hungary, so the police can be involved too. Kék Vonal (116-111) is there if it all gets too much.`,
  teaser: '',
};

export const DEBRIEF_EP9 = { id: 9,
  title: 'What really happened?',
  body: `The voice on the phone was not Mum. It was a [[voiceclone]]: a computer copy of her voice, made from the cooking videos she posts, where she talks for minutes at a time. Nobody had to hack anyone. The scammers had Nagyi's number and your name from the school files copied in Zárolva, which were sold on, and Mum's voice from her own public videos. The rest is the old [[grandscam]]: a crying relative, an accident, the police, cash tonight, a "lawyer" at the door at midnight, and "don't tell anyone". The clone gave itself away: it said "Mama" when Mum always says "Anyu", the hospital noise behind it repeated every eight seconds, and it never answered a question. The number on the display was not Mum's, but a display can be faked too ([[spoof]]), so that alone proves nothing. What proved it was a [[callback]] on a number you already had: the ward. Nagyi was never foolish. She was scared for her daughter, and the scam is built on exactly that fear.`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Agree on a [[codeword]] with your family today. If a relative calls in trouble and can\'t say it, hang up and call them back.',
    'Always [[callback|call back]] on a number you already have, never the one the caller gives you. Real police, lawyers and hospitals never send someone to collect cash at your door.',
    'Talk to your grandparents about this, kindly. Write the warning signs next to their phone: hurry, secrecy, cash, a courier at night. And think about how much of your voice is public.',
  ],
  helpTitle: 'Where can you get help?',
  help: `If someone is on the way to collect money: don't open the door and call 112. Afterwards, report it to the police even if nobody paid, because the same group calls many families. Older people can ask their bank to lower their daily cash limit. If it happened in your family, talk about it with an adult you trust: being targeted is not the victim's fault.`,
  teaser: 'Next time: a video of you that you never made, and 63 notifications before school.',
};

export const DEBRIEF_EP7 = { id: 7,
  title: 'What really happened?',
  body: `Nobody "saw" you rob a shop. A [[facerec|face recognition]] system compared a dark, grainy picture of the thief with a picture of you and found them similar: both in red hoodies, both with their hoods half up, both under bad light. "91 %" was a similarity score, not the chance that you did it. That was a [[falsematch]], and it only fell apart when a person compared the pictures properly and looked at your alibi. The system also kept a log of every place it saw your face that evening, because a face is [[biometric]] that you carry everywhere and cannot change. Then there was the search log: a guard looking up his ex-girlfriend, everyone at a protest filed "just in case", teenagers tracked for advertising. The same tool that can find a thief can be used to follow anyone, which is why the law asks: who may search, for what reason, and for how long the data is kept (the [[retention]]). And the mannequins that kept turning up behind you? The cameras counted them as people, and in the dark so did your brain ([[pareidolia]]).`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Ask. Shops, schools and apps must tell you what data they collect about you. You can send an [[accessright]] and get a copy, and ask them to delete data they have no reason to keep.',
    'If you are ever wrongly accused because a computer said so: stay calm, don\'t run, keep your proof (tickets, receipts, messages, photos) and ask for an adult you trust to be called.',
    'When you see a camera, think about who watches it, who can search it, and for how long it remembers. Those are fair questions to ask out loud, too.',
  ],
  helpTitle: 'Where can you get help?',
  help: `A parent or another adult you trust, first. Every organisation that collects personal data has to name someone responsible for it (often a [[dpo]]). In Hungary, complaints about the misuse of personal data go to the national data protection authority, NAIH (naih.hu). If someone in a uniform stops you, stay calm, answer politely and ask them to call your parent.`,
  teaser: 'Next time: the 7.B group chat turns against someone. Will you join in?',
};

export const DEBRIEF_EP4 = { id: 4,
  title: 'What really happened?',
  body: `szellem_7b was not a ghost. It was an [[anonacc]] made by two classmates, Máté and Zsófi, "for fun". They made a group without Lili and turned her concert song into a joke. That is [[cyberbullying]], even if nobody touches anyone. The scary part was the group: the pings, "everyone is typing", the ✓✓ [[readreceipt|read receipts]] showing you had seen it. That pressure is how a [[pileon]] grows: each person adds "just one 😂". And the next target can be anyone, even the people who laughed along: fear of being next is exactly why so many people join in. szellem_7b could not really see your screenshots; that was a bluff to scare you. You were a [[bystander]]. Every bystander can be an [[upstander]]: save the evidence, don't spread it, stay with the person targeted, report it, and tell an adult who can act.`,
  todoTitle: '3 things to do in real life',
  todo: [
    'Don\'t react, laugh or forward. Take screenshots instead (with names, dates and the group name), and report the post or the group in the app.',
    'Talk to the person who is targeted, privately and kindly. Being the last to know is the worst part. One person on their side changes a lot.',
    'Tell an adult who can act: your class teacher, the school counsellor, a parent. Give them the screenshots. Names go to them, not into the group.',
  ],
  helpTitle: 'Where can you get help?',
  help: `Your class teacher, the school counsellor or a parent. Every app has a report button, and a block button for accounts that target you. In Hungary the Kék Vonal child helpline (116-111) is free and anonymous, also by chat. Harmful content can be reported to the NMHH Internet Hotline (internethotline.hu). If someone is threatened with violence, that is a matter for the police (112).`,
  teaser: 'Next time: a sleepover at school, one click, and every screen in the building wakes up at once.',
};

export const CREDITS = [
  ['Game', 'Sötét Képernyő (Dark Screen): a digital culture horror anthology. Made for Digital Culture lessons at SEK Budapest, built with Claude.'],
  ['Music', 'Music by Clement Panchout: "Space Horror InGame Music (Exploration)", "Space Horror InGame Music (Tense)", "Dark", "Time Flies", "Omno: Contemplative". Ambience by CAPTNPHANTOM (PSX Ambient Pack).'],
  ['Sound effects', 'FilmCow Recorded SFX and FilmCow Designed SFX (filmcow.itch.io). Helton Yan\'s Pixel Combat SFX (sparks, footsteps, interface).'],
  ['3D models', 'House Props PSX pack; PSX House Interior Pack (incl. teddy bear); PSX Tech by Pizza Doggy; PSX First-Person Arms (itch.io); PSX School Kit by heyheythere; Soviet Apartment Asset Pack by Ice Ching (PerdakGames); PSX Characters (itch.io), animated with the Universal Animation Library by Quaternius (CC0). Used under their game licences; the raw assets may not be redistributed.; Stylized Nature MegaKit by Quaternius (CC0)'],
  ['Pictures', 'The painted pictures in the phone and laptop episodes were made for this game by its teacher with an image generator.'],
  ['Textures', 'Screaming Brain Studios Tiny Texture Pack 2 (CC0). Classic64 Asset Library by Craig Snedeker (CC0).'],
  ['Sky', 'Free Sky with Clouds Background Pixel Art Set by CraftPix.net.'],
  ['Interface', 'UI Variations (HD horror UI pack). Pixel font m5x7 by Daniel Linssen.'],
  ['Lépcsőház', 'Stairwell textures from the PSX Soviet Block Kit by heyheythere; Liminal PSX Textures sampler by Cordatix (cordatix.itch.io); PSX Liminal Textures by LESED (lesed.itch.io); drones and signals from the Liminal Sound Pack Essential; stickers from the Urban Grunge decal pack by Designsoup; the subway car from the Metro_PSX pack; Low Poly Subway Free and PSX Metro Kit Free by heyheythere (CC BY 4.0); station sounds by Okutasan (okutasan.itch.io); paintings and sticker sheets by Mark Tremmel. Used under their game licences; the raw assets may not be redistributed.'],
  ['Engine', 'three.js (MIT licence).'],
  ['Fiction', 'All apps, companies, people and messages in this game are invented. Any resemblance is a coincidence.'],
  ['Easter egg', 'The field after the finale links to "Still Alive" by Jonathan Coulton, from the game Portal (Valve, 2007), on YouTube. The song itself is not part of this game.'],
];

export const CONTENT_NOTE = 'Atmospheric horror: darkness, sounds, tension. No gore, no violence. Quiet mode (csendes mód) removes the jump scares.';

// Turn [[key|label]] markup into tooltip spans (HTML-escaped).
export function rich(s) {
  const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return esc(s).replace(/\[\[([a-z0-9]+)(?:\|([^\]]+))?\]\]/g, (_, k, label) => {
    const g = GLOSSARY[k];
    if (!g) return label || k;
    const shown = label || g.term;
    const tip = `${g.term} (${g.hu}): ${g.tip}`;
    return `<span class="term" tabindex="0" data-tip="${esc(tip)}">${shown}</span>`;
  });
}
// Plain version for 3D-time captions (no tooltips while the mouse is captured).
export function plain(s) {
  return s.replace(/\[\[([a-z0-9]+)(?:\|([^\]]+))?\]\]/g, (_, k, label) => {
    const g = GLOSSARY[k];
    if (!g) return label || k;
    return `${label || g.term} (${g.hu})`;
  });
}
