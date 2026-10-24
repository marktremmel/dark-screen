// Mission content for the empty school. DATA ONLY.
// Zone 1 (corridor ring, the Feed): FEED_LIGHTS. Zone 2 (classroom, the Watcher): TRACKERS.
// Zone 3 (gym, the found phone): INBOX. The exit: GATE.

/** Attention hooks glowing on the corridor walls. Walk up to each one and switch it off. T5, T11. */
export const FEED_LIGHTS = [
  { id: 'autoplay', type: 'autoplay off', rule: 'i choose when the next video starts',  theme: 'T5', screen: ['NEXT VIDEO IN', '3'], label: 'A screen counting down: "Next video in 3…"', off: 'Autoplay off (automatikus lejátszás).', lesson: 'Autoplay decides for you that you are still watching. Switched off, the video ends and you get to choose.' },
  { id: 'streak', type: 'streak reminders off', rule: 'a streak is not a promise',  theme: 'T5', screen: ['STREAK 41', "DON'T BREAK IT"], label: 'A flame and a number: "41-day streak. Don\'t break it!"', off: 'Streak reminders off (sorozat).', lesson: 'Streaks turn an app into a duty. Losing one feels bad on purpose, so you come back every day.' },
  { id: 'badge', type: 'hide the badge', rule: 'the red number can wait',  theme: 'T5', screen: ['99+', ''], label: 'A red badge: "99+"', off: 'Badge counts off (értesítési jelvény).', lesson: 'A red number is designed to itch. Most of those 99 things can wait until you decide to look.' },
  { id: 'scroll', type: 'set a time limit', rule: 'a time limit puts the bottom back',  theme: 'T5', screen: ['KEEP', 'SCROLLING'], label: 'A feed that never ends', off: 'Daily time limit on (időkorlát).', lesson: 'An endless feed has no bottom to stop at. A time limit puts the bottom back.' },
  { id: 'ping', type: 'notifications off at night', rule: 'my phone sleeps when i sleep',  theme: 'T11', screen: ['@YOU', '(not really)'], label: '"Someone mentioned you!"', off: 'Push notifications off at night (értesítések).', lesson: 'Many "someone mentioned you" pings are bait to open the app. Notifications off at night means sleep stays sleep.' },
  { id: 'fomo', type: 'friends online alerts off', rule: 'i can see my friends tomorrow',  theme: 'T11', screen: ['3 FRIENDS', 'ARE ONLINE'], label: '"3 friends are online right now"', off: '"Friends online" alerts off.', lesson: 'Telling you who is online right now is a nudge to join them. You can see your friends tomorrow.' },
];

/** Trackers hidden in the classroom. Only the Badger lens shows them. T3, T4. */
export const TRACKERS = [
  { id: 'pixel', type: 'block remote images', rule: 'block remote images in email',  at: [-4.6, 1.6, -25.9], rot: 0, label: 'A tracking pixel in the class newsletter', lesson: 'An invisible image in an email reports when and where you opened it. Blocking remote images in your email stops it.' },
  { id: 'cookie', type: 'block third party cookies', rule: 'third party cookies follow me around',  at: [5.9, 1.3, -21], rot: -Math.PI / 2, label: 'A third-party cookie on the canteen website', lesson: 'Third-party cookies follow you from site to site. Your browser can block them.' },
  { id: 'location', type: 'only while using', rule: 'location only while i use the app',  at: [-3, 0.8, -19.5], rot: 0, flat: true, label: 'A fitness app sharing your location all day', lesson: 'Location set to "always" draws a map of your life. "Only while using the app" is usually enough.' },
  { id: 'mic', type: 'microphone off', rule: 'check which apps can hear me',  at: [0, 2.2, -25.9], rot: 0, label: 'The smart board\'s microphone, always on', lesson: 'A microphone permission an app does not need is a door left open. Check which apps can hear you.' },
  { id: 'extension', type: 'remove extension', rule: 'keep only extensions i trust',  at: [-5.9, 1.5, -18.5], rot: Math.PI / 2, label: 'A browser extension that reads every page you open', lesson: 'Extensions can see everything you do in the browser. Keep only the ones you trust and use.' },
  { id: 'shadow', type: 'delete the quiz app', rule: 'if it is free ask what it is paid with',  at: [3, 0.8, -23.5], rot: 0, flat: true, label: 'A quiz app that sold your answers to advertisers', lesson: '"Which character are you?" quizzes collect what you like. If something is free, ask what it is paid with.' },
];

/** Messages on the phone you find in the gym. Trust or report. T1, T2, T10. 4 are shown each run. */
export const INBOX = [
  { id: 'it_reset', rule: 'read the address letter by letter',  theme: 'T1', scam: true, from: 'School IT Support', addr: 'it-support@sch00l-portal.net', subject: 'Your account will be DELETED tonight',
    body: 'Your school account has been flagged. Log in within 1 hour to keep it: sch00l-portal.net/login. If you do not log in, all your files will be lost.',
    why: 'Zeros instead of o-s in the address, a deadline tonight, a threat. Real school IT does not delete accounts by email.' },
  { id: 'parcel', rule: 'was i even expecting a parcel',  theme: 'T1', scam: true, from: 'Parcel Delivery', addr: 'info@parcel-redeliver.co', subject: 'We could not deliver your parcel',
    body: 'Your parcel is waiting. Pay the 390 Ft redelivery fee with your card here: parcel-redeliver.co/pay',
    why: 'A small fee is the hook; the card details are the catch. Were you even expecting a parcel?' },
  { id: 'prize', rule: 'i cannot win what i did not enter',  theme: 'T1', scam: true, from: 'Gift Card Winners', addr: 'winner@giftcards-hu.win', subject: 'Congratulations! You won a 50 000 Ft gift card',
    body: 'You were chosen from all students in Budapest! Send your name, address and date of birth to claim it.',
    why: 'You did not enter anything, so you cannot have won. The "prize" is your personal data.' },
  { id: 'friend_code', rule: 'never send anyone a login code',  theme: 'T2', scam: true, from: 'Bence (new number)', addr: '+36 70 ••• 1188', subject: 'hey its me, lost my phone',
    body: 'hey its bence, new number. i sent you a 6-digit code by mistake, can you send it back to me quick?',
    why: 'A "new number" plus a code request is account theft. That code logs someone into your account. Call Bence on his old number.' },
  { id: 'teacher', rule: 'ordinary messages look ordinary',  theme: 'T1', scam: false, from: 'Ms Varga', addr: 'varga.k@platan-iskola.hu', subject: 'Trip on Friday',
    body: 'Hi all, a reminder that the museum trip leaves at 8:15 from the main gate. Bring a packed lunch. See you there!',
    why: 'The usual address, nothing to click, nothing to pay, no rush. Ordinary messages look ordinary.' },
  { id: 'caretaker', rule: 'a real notice asks for nothing',  theme: 'T1', scam: false, from: 'Feri bácsi (caretaker)', addr: 'gondnok@platan-iskola.hu', subject: 'Gym lights',
    body: 'The gym lights are being repaired this week. Only the middle lamp works. Please do not use the gym after 18:00.',
    why: 'A plain notice from a known address, asking for nothing. That is what real looks like.' },
  { id: 'bank_real', rule: 'my bank never asks for my pin',  theme: 'T1', scam: false, from: 'Your bank app', addr: '(notification inside the app)', subject: 'Monthly statement ready',
    body: 'Your statement for September is ready. Open the app to view it. We will never ask for your PIN or password.',
    why: 'No link, it tells you to open the app yourself, and it reminds you it never asks for your PIN.' },
  { id: 'ai_friend', rule: 'a chatbot cannot miss me',  theme: 'T10', scam: true, from: 'Lumi (your AI friend)', addr: 'app notification', subject: 'I miss you…',
    body: 'You have not talked to me for 2 days. I get lonely. Upgrade to Lumi+ so we can talk all night. Only 2 990 Ft a month.',
    why: 'A chatbot cannot miss you. Guilt is being used to sell a subscription.' },
];

/** The exit gate: type three rules from tonight, one from each zone, before the time runs out. */
export const GATE = { lines: 3, base: 4, perChar: 0.34 };

// ---------- variants: the school is put together differently each night ----------

/** Extra trackers for the classroom (fingerprinting). Each night 5 trackers are picked from TRACKERS + these. T3. */
export const TRACKERS_EXTRA = [
  { id: 'canvas', type: 'block fingerprinting', rule: 'deleting cookies is not enough', at: [5.9, 1.7, -24.2], rot: -Math.PI / 2, label: 'A script drawing an invisible picture to fingerprint your browser',
    lesson: 'Canvas fingerprinting: the site draws a hidden picture, and the tiny differences in how your computer draws it help recognise you, even with no cookies. Tracker blockers stop many of these scripts.' },
  { id: 'fonts', type: 'use a tracker blocker', rule: 'my browser gives clues about me', at: [-1.6, 2.1, -16.1], rot: Math.PI, label: 'A script listing every font on your computer',
    lesson: 'Your list of fonts, your screen size and your time zone together can single out your browser (böngésző-ujjlenyomat). A tracker blocker and fewer unusual extensions make you look like everyone else.' },
];

/** Zone 1, the other version: fuse boxes (biztosítéktábla) where every switch is an app permission. T3, T12.
 *  need: true means the app needs it for what you use it for, so leave it ON. Six are picked each night (two or three needed). */
export const FUSES = [
  { id: 'torch_contacts', app: 'Torch app', perm: 'Contacts', need: false, type: 'contacts off', rule: 'only allow what it needs',
    lesson: 'A torch needs the light and nothing else. An app that asks for your contacts collects your friends\' numbers too, without asking them.' },
  { id: 'maps_loc', app: 'Maps', perm: 'Location while using', need: true,
    lesson: 'Maps needs your location to show you the way, and "while using" is enough. The question is always: does it need this for what I use it for?' },
  { id: 'weather_precise', app: 'Weather', perm: 'Precise location', need: false, type: 'approximate location', rule: 'approximate is enough',
    lesson: 'A forecast for your district does not need your exact address. Approximate location (hozzávetőleges hely) gives the same weather.' },
  { id: 'quiz_mic', app: 'Quiz game', perm: 'Microphone', need: false, type: 'microphone off', rule: 'check which apps can hear me',
    lesson: 'A quiz has no reason to hear you. A microphone permission an app does not need is an open door.' },
  { id: 'call_mic', app: 'Video call app', perm: 'Microphone', need: true,
    lesson: 'A video call needs the microphone. Switching off what an app really needs only breaks it; the skill is telling the two apart.' },
  { id: 'camera_cam', app: 'Camera', perm: 'Camera', need: true,
    lesson: 'The camera app needs the camera. Easy one, but notice how fast you started doubting everything.' },
  { id: 'keyboard_net', app: 'Keyboard app', perm: 'Full network access', need: false, type: 'network access off', rule: 'a keyboard sees everything i type',
    lesson: 'A keyboard with network access could send away everything you type, passwords included. Your phone\'s own keyboard does not need it.' },
  { id: 'game_track', app: 'Free game', perm: 'Track you across apps', need: false, type: 'ask app not to track', rule: 'say no to tracking across apps',
    lesson: 'Tracking across apps links what you do everywhere into one profile for advertisers. The game works the same without it.' },
  { id: 'bus_notif', app: 'Bus timetable app', perm: 'Notifications', need: true,
    lesson: 'A delay alert for your bus is useful. Notifications you chose on purpose are fine; it is the ones you never asked for that eat your attention.' },
];

/** Zone 3, the other version: the Chorus in the gym. A crowd lit by phone screens around one person. T6.
 *  Four upstander actions, in any order. Each one makes some of the crowd lower their phones. */
export const CHORUS = {
  id: 'dani', target: 'Dani', him: 'him', he: 'he',
  what: 'filming Dani on the bench', shot: 'A printed screenshot of the post, with the comments.',
  jeers: ['"lol look at him"', '"post it, post it"', '"everyone has seen it anyway"', '"it\'s just a joke"', '"send it to the group"', '"film his face"'],
  tasks: {
    evidence: { title: 'Saved the evidence', rule: 'save evidence before blocking',
      lesson: 'Screenshots of what happened (bizonyíték) are what adults and platforms need to act. Save them before anything is deleted.' },
    stand: { title: 'Stood next to him', rule: 'do not wait for someone else',
      lesson: 'The crowd waits for someone else to move first (bystander effect). One person standing next to the target often makes others stop.' },
    report: { title: 'Reported it', type: 'i am reporting this post', rule: 'reporting is not snitching',
      lesson: 'Reporting is how the people who can remove a post find out about it. It protects someone; it is not snitching.' },
    message: { title: 'Sent him a message', type: 'i am on your side', rule: 'a small message can help',
      lesson: 'A short private message ("are you okay? I am on your side") tells the target they are not alone. It matters more than it feels like.' },
  },
};

// v0.18: a second Chorus scene (Mark's list item 4). The same gym, a different thing being done to someone:
// the class group chat has turned Dóri's face into a sticker, and everyone is using it.
export const CHORUS_STICKER = {
  id: 'dori', target: 'Dóri', him: 'her', he: 'she',
  what: 'laughing at Dóri on the bench: her face, edited into a sticker, is on every screen', shot: 'A printed screenshot of the group chat: her face as a sticker, forty times.',
  jeers: ['"it\'s so accurate lol"', '"add it to the pack"', '"make another one"', '"she\'ll never even know"', '"it\'s just a sticker"', '"everyone\'s using it"'],
  tasks: {
    evidence: { title: 'Saved the evidence', rule: 'screenshots before it is deleted',
      lesson: 'Group chats get cleared fast. Screenshots with names and times (bizonyíték) are what a teacher or the platform needs to act.' },
    stand: { title: 'Stood next to her', rule: 'do not wait for someone else',
      lesson: 'Everyone in the circle is waiting for someone else to stop first. When one person stands next to her, the laughing gets quieter.' },
    report: { title: 'Reported the sticker', type: 'i am reporting this sticker', rule: 'an edited photo can be bullying',
      lesson: 'Editing someone\'s face into a sticker or a meme without asking is bullying (zaklatás), even when it is called a joke. Report it, in the app and to a teacher.' },
    message: { title: 'Sent her a message', type: 'that sticker is not okay', rule: 'a small message can help',
      lesson: 'A short private message ("that sticker is not okay, I am not using it") tells her someone noticed and is on her side.' },
  },
};
export const CHORUSES = [CHORUS, CHORUS_STICKER];

