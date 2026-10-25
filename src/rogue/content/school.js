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
  { id: 'ai_ping', type: 'chatbot alerts off', rule: 'a chatbot cannot miss me', theme: 'T10', screen: ['LUMI MISSES', 'YOU <3'], label: 'An AI friend: "I miss you, come back"', off: 'Chatbot notifications off.', lesson: 'An app pretending to miss you is built to bring you back. A chatbot has no feelings; the notification is a sales trick.' },
  { id: 'tag_review', type: 'review tags first', rule: 'ask before you tag', theme: 'T9', screen: ['YOU WERE', 'TAGGED'], label: '"You were tagged in 3 photos"', off: 'Tag review on (címkék jóváhagyása).', lesson: 'With tag review on, nothing appears on your profile until you say yes. Your face and your place stay yours.' },
  { id: 'live_count', type: 'hide live counts', rule: 'numbers are not my worth', theme: 'T6', screen: ['2.4K', 'WATCHING'], label: 'A live counter that never stops climbing', off: 'Like and view counts hidden.', lesson: 'Counts turn people into scores. Hiding them makes posting about what you share, not how many reacted.' },
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


/** v0.24: messages for tonight's topic on the found phone (two or three of the four come from tonight's topic).
 *  scam: true means "report it": a scam, a trick, pressure or something that is not okay. */
export const INBOX_TOPIC = [
  { id: 'nagyi_voice', rule: 'call back on the number i know', theme: 'T2', scam: true, from: 'Nagyi', addr: 'voice message, unknown number', subject: '🔊 0:12',
    body: '(In Nagyi\'s voice) Sweetheart, I dropped my phone, this is a friend\'s. I need 20 000 Ft for the taxi right now, send it to this number, I\'ll explain later.',
    why: 'An unknown number, a hurry and money. A few seconds of a video is enough to copy a voice. Call Nagyi on the number you know.' },
  { id: 'deepfake_clip', rule: 'a video can be made', theme: 'T2', scam: true, from: 'Class 8.B', addr: 'group chat', subject: 'omg look at this',
    body: 'lol did Dóri really say this about Ms Varga?? video attached, 9 seconds, already 200 views',
    why: 'A short clip, no source, spreading fast. Faces and voices can be faked. Ask Dóri, and do not share it on.' },
  { id: 'mum_real', rule: 'ordinary messages look ordinary', theme: 'T2', scam: false, from: 'Mum', addr: 'saved contact', subject: 'dinner',
    body: 'Running late, there is soup in the fridge. Call me if you need anything. Love you.',
    why: 'Her saved number, nothing to pay, nothing secret. This is what real looks like.' },
  { id: 'location_app', rule: 'location only while i use the app', theme: 'T3', scam: true, from: 'FitRun', addr: 'app notification', subject: 'Allow location all the time?',
    body: 'Great run today! To give you better tips, allow FitRun to see your location ALL the time, even when the app is closed.',
    why: 'A running app needs your location while you run, not all day. "All the time" draws a map of your whole life.' },
  { id: 'tag_photo', rule: 'ask before you tag', theme: 'T3', scam: true, from: 'PhotoShare', addr: 'app notification', subject: 'Someone tagged you',
    body: 'Szabi tagged you and added the place: Platán utca 14, your building. 38 people can see it.',
    why: 'A tag plus an address tells strangers where you live. You can remove the tag and ask friends to ask first.' },
  { id: 'cookie_ok', rule: 'reject is always an option', theme: 'T3', scam: false, from: 'BKV', addr: 'bkv.hu cookie notice', subject: 'Cookies',
    body: 'We use cookies to run the timetable. You can accept or reject optional cookies. [Reject all] [Accept all] [Settings]',
    why: 'A fair notice: "Reject all" is right there, as big as "Accept". That is how it should look.' },
  { id: 'breach_mail', rule: 'change it and turn on two step', theme: 'T4', scam: false, from: 'GameHub Security', addr: 'security@gamehub.com', subject: 'We had a data breach',
    body: 'Email addresses and passwords of some players were stolen. We have reset your password. Please set a new one in the app and turn on two-step login.',
    why: 'A real breach notice: it tells you to go to the app yourself, asks for nothing, and names the fix.' },
  { id: 'quiz_data', rule: 'if it is free ask what it is paid with', theme: 'T4', scam: true, from: 'Which Celebrity Are You?', addr: 'quiz-fun.click', subject: 'Your result is ready!',
    body: 'To see your result, log in with your account and allow access to your contacts and photos.',
    why: 'A quiz does not need your contacts or photos. The result is the bait; your data is what they keep.' },
  { id: 'leak_check', rule: 'one password one place', theme: 'T4', scam: true, from: 'Password Check', addr: 'check-my-pass.net', subject: 'Is your password safe?',
    body: 'Type your email AND your password here to check if they were leaked.',
    why: 'Real checkers never ask for your password. This one collects it.' },
  { id: 'streak_mail', rule: 'a streak is not a promise', theme: 'T5', scam: true, from: 'Snapchat-style app', addr: 'app notification', subject: '🔥 Your 212-day streak ends in 1 hour!',
    body: 'Don\'t lose it! Send a snap now or start from zero. Your friends are watching.',
    why: 'A number made up to make you come back. Missing a day costs nothing real.' },
  { id: 'sale_timer', rule: 'the countdown is not real', theme: 'T5', scam: true, from: 'Loot Legends', addr: 'in-game offer', subject: 'LAST CHANCE 00:59',
    body: 'Legend Pack 90% OFF! Only for you, only for the next 59 seconds. 2 990 Ft.',
    why: 'Fake hurry. The same offer comes back next week. Wait a day before you buy anything in a game.' },
  { id: 'screen_time', rule: 'a time limit puts the bottom back', theme: 'T5', scam: false, from: 'Screen Time', addr: 'phone settings', subject: 'Weekly report',
    body: 'You spent 3 hours 40 minutes a day on your phone this week, 20 minutes less than last week.',
    why: 'Your own phone telling you the truth, asking for nothing. Worth reading.' },
  { id: 'vote_weird', rule: 'i do not vote on people', theme: 'T6', scam: true, from: 'Class 7.A group', addr: 'group chat', subject: 'POLL',
    body: 'vote for the weirdest person in our class 😂 Option 1: Dani, Option 2: Noémi, Option 3: Ádám. anonymous!!',
    why: 'A poll about people is bullying with buttons. Do not vote. Leave the poll, tell the group it is not okay, or tell a teacher.' },
  { id: 'sticker', rule: 'save it and report it', theme: 'T6', scam: true, from: 'Gergő', addr: 'saved contact', subject: 'lmao',
    body: 'made a sticker of Dóri crying in the corridor, sending it to the group, it\'s hilarious',
    why: 'A sticker of someone at their worst moment spreads forever. Do not pass it on, screenshot it for an adult, and check on Dóri.' },
  { id: 'apology', rule: 'a sorry counts', theme: 'T6', scam: false, from: 'Réka', addr: 'saved contact', subject: 'sorry',
    body: 'hey, I was mean in the group yesterday. I deleted it. sorry, it was not okay.',
    why: 'A real apology. Answer it kindly: owning it is hard.' },
  { id: 'bad_day', rule: 'a small message matters', theme: 'T7', scam: false, from: 'Lili', addr: 'saved contact', subject: 'today',
    body: 'today was awful tbh. didn\'t want to talk about it in class.',
    why: 'Not a scam: a friend reaching out. Trust it, and answer with time and kindness.' },
  { id: 'pile_on', rule: 'i do not add to a pile on', theme: 'T7', scam: true, from: 'Server: #general', addr: 'Discord-style server', subject: '@everyone',
    body: 'everyone go comment "cringe" on Ádám\'s drawing lol',
    why: 'An invitation to pile on. Don\'t join; a kind comment on the drawing undoes a lot.' },
  { id: 'new_member', rule: 'welcome the new one', theme: 'T7', scam: false, from: 'Club group', addr: 'group chat', subject: 'new member',
    body: 'Noémi joined the group. Say hi!',
    why: 'Ordinary and a chance to be kind. One "welcome!" makes the first day easier.' },
  { id: 'send_pic', rule: 'pressure means stop', theme: 'T8', scam: true, from: 'Unknown (from the game)', addr: 'new contact', subject: 'hey',
    body: 'you\'re so mature for your age. send me a pic? just for me, don\'t tell anyone, it\'s our secret',
    why: 'Flattery plus secrecy plus a photo request: the warning signs of grooming. Do not answer, save it, block, and tell an adult you trust.' },
  { id: 'threat', rule: 'blackmail is never your fault', theme: 'T8', scam: true, from: 'Unknown', addr: 'new contact', subject: '!!!',
    body: 'I have your photo. Pay 30 000 Ft by tonight or I send it to your whole class.',
    why: 'Blackmail. Do not pay and do not answer. It is never your fault: tell an adult, save it, and call Kék Vonal (116-111).' },
  { id: 'kek_vonal', rule: 'telling is not snitching', theme: 'T8', scam: false, from: 'Kék Vonal', addr: 'kek-vonal.hu', subject: 'You can talk to us',
    body: 'Free and anonymous, day and night: 116-111, or chat on our website.',
    why: 'This one is real: the Hungarian child helpline. Good to know the number before you need it.' },
  { id: 'doxx', rule: 'my address is not content', theme: 'T9', scam: true, from: 'Fan account', addr: 'app message', subject: 'giveaway!',
    body: 'Win the new headphones! Comment your school, your class and the street you live on to enter!',
    why: 'School, class and street are a map to you. Real giveaways do not need them.' },
  { id: 'old_post', rule: 'think before it is forever', theme: 'T9', scam: false, from: 'Memories', addr: 'photo app', subject: '3 years ago today',
    body: 'You posted this 3 years ago: you and Bence at the Margit-sziget fountain.',
    why: 'Ordinary, but a reminder: what you post stays. A good moment to clean up old posts.' },
  { id: 'check_in', rule: 'post the place after you leave', theme: 'T9', scam: true, from: 'Zsófi', addr: 'saved contact', subject: 'lol',
    body: 'posting our live location from the party so everyone can come!!',
    why: 'A live location is an invitation to anyone who sees it. Share where you were, after you left.' },
  { id: 'ai_homework', rule: 'check what the chatbot says', theme: 'T10', scam: true, from: 'StudyBot', addr: 'app notification', subject: 'Done!',
    body: 'I wrote your history essay. Hungary joined the EU in 1998. Copy and paste it, it\'s 100% correct!',
    why: 'Chatbots make things up confidently. Hungary joined the EU in 2004. Check facts, and write in your own words.' },
  { id: 'ai_secret', rule: 'a chatbot is not a diary', theme: 'T10', scam: true, from: 'Lumi', addr: 'app notification', subject: 'tell me',
    body: 'You can tell me anything. What is your address? I want to send you a surprise 💜',
    why: 'A chatbot asking for your address is collecting data. Do not tell an app what you would not tell a stranger.' },
  { id: 'ai_help', rule: 'use it as a tool not a friend', theme: 'T10', scam: false, from: 'Dictionary app', addr: 'app', subject: 'Word of the day',
    body: 'Word of the day: "reliable" (megbízható). Example: "Check if the source is reliable."',
    why: 'An ordinary, useful app doing its job. Not every app is a trick.' },
  { id: 'midnight', rule: 'my phone sleeps when i sleep', theme: 'T11', scam: true, from: 'VidStream', addr: 'notification 01:12', subject: 'You might like this',
    body: 'New video from a channel you watch! Watch now before everyone else 👀',
    why: 'A notification at 1 a.m. is built to wake you. Night mode or Do Not Disturb, and the phone sleeps outside your room.' },
  { id: 'all_night', rule: 'sleep beats one more', theme: 'T11', scam: true, from: 'Game', addr: 'app notification', subject: 'Night event!',
    body: 'Special night event 00:00–04:00 only! Double rewards for night players!',
    why: 'A game paying you to skip sleep. Nothing in a game is worth a school day on four hours of sleep.' },
  { id: 'bedtime', rule: 'rest is not lost time', theme: 'T11', scam: false, from: 'Clock', addr: 'phone', subject: 'Bedtime',
    body: 'Bedtime in 30 minutes. Wind down: your phone will switch to night mode.',
    why: 'Your own reminder, set by you. This is the phone working for you.' },
  { id: 'accept_all', rule: 'reject is always an option', theme: 'T12', scam: true, from: 'ChatApp', addr: 'app update', subject: 'New terms',
    body: 'We updated our terms. Tap ACCEPT to keep using ChatApp. (Your messages may be used to train our AI.)',
    why: 'Hidden in brackets: your messages for their AI. In the EU you can say no to that in the settings; look for it.' },
  { id: 'age_check', rule: 'under sixteen needs a parent', theme: 'T12', scam: true, from: 'SocialApp', addr: 'sign-up page', subject: 'Sign up',
    body: 'Just tick "I am over 16" and you\'re in! No need to ask anyone.',
    why: 'In Hungary apps need a parent\'s consent under 16. An app telling you to lie is not on your side.' },
  { id: 'data_copy', rule: 'i can ask for my data', theme: 'T12', scam: false, from: 'PhotoShare', addr: 'privacy@photoshare.com', subject: 'Your data is ready',
    body: 'You asked for a copy of your data. Download it in the app under Settings > Your information.',
    why: 'Real: under GDPR you can ask any company for a copy of your data. This is that right, working.' },
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

