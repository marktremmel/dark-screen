// Mission content for the empty school. DATA ONLY.
// Zone 1 (corridor ring, the Feed): FEED_LIGHTS. Zone 2 (classroom, the Watcher): TRACKERS.
// Zone 3 (gym, the found phone): INBOX. The exit: GATE.

/** Attention hooks glowing on the corridor walls. Walk up to each one and switch it off. T5, T11. */
export const FEED_LIGHTS = [
  { id: 'autoplay', theme: 'T5', screen: ['NEXT VIDEO IN', '3'], label: 'A screen counting down: "Next video in 3…"', off: 'Autoplay off (automatikus lejátszás).', lesson: 'Autoplay decides for you that you are still watching. Switched off, the video ends and you get to choose.' },
  { id: 'streak', theme: 'T5', screen: ['STREAK 41', "DON'T BREAK IT"], label: 'A flame and a number: "41-day streak. Don\'t break it!"', off: 'Streak reminders off (sorozat).', lesson: 'Streaks turn an app into a duty. Losing one feels bad on purpose, so you come back every day.' },
  { id: 'badge', theme: 'T5', screen: ['99+', ''], label: 'A red badge: "99+"', off: 'Badge counts off (értesítési jelvény).', lesson: 'A red number is designed to itch. Most of those 99 things can wait until you decide to look.' },
  { id: 'scroll', theme: 'T5', screen: ['KEEP', 'SCROLLING'], label: 'A feed that never ends', off: 'Daily time limit on (időkorlát).', lesson: 'An endless feed has no bottom to stop at. A time limit puts the bottom back.' },
  { id: 'ping', theme: 'T11', screen: ['@YOU', '(not really)'], label: '"Someone mentioned you!"', off: 'Push notifications off at night (értesítések).', lesson: 'Many "someone mentioned you" pings are bait to open the app. Notifications off at night means sleep stays sleep.' },
  { id: 'fomo', theme: 'T11', screen: ['3 FRIENDS', 'ARE ONLINE'], label: '"3 friends are online right now"', off: '"Friends online" alerts off.', lesson: 'Telling you who is online right now is a nudge to join them. You can see your friends tomorrow.' },
];

/** Trackers hidden in the classroom. Only the Badger lens shows them. T3, T4. */
export const TRACKERS = [
  { id: 'pixel', at: [-4.6, 1.6, -25.9], rot: 0, label: 'A tracking pixel in the class newsletter', lesson: 'An invisible image in an email reports when and where you opened it. Blocking remote images in your email stops it.' },
  { id: 'cookie', at: [5.9, 1.3, -21], rot: -Math.PI / 2, label: 'A third-party cookie on the canteen website', lesson: 'Third-party cookies follow you from site to site. Your browser can block them.' },
  { id: 'location', at: [-3, 0.8, -19.5], rot: 0, flat: true, label: 'A fitness app sharing your location all day', lesson: 'Location set to "always" draws a map of your life. "Only while using the app" is usually enough.' },
  { id: 'mic', at: [0, 2.2, -25.9], rot: 0, label: 'The smart board\'s microphone, always on', lesson: 'A microphone permission an app does not need is a door left open. Check which apps can hear you.' },
  { id: 'extension', at: [-5.9, 1.5, -18.5], rot: Math.PI / 2, label: 'A browser extension that reads every page you open', lesson: 'Extensions can see everything you do in the browser. Keep only the ones you trust and use.' },
  { id: 'shadow', at: [3, 0.8, -23.5], rot: 0, flat: true, label: 'A quiz app that sold your answers to advertisers', lesson: '"Which character are you?" quizzes collect what you like. If something is free, ask what it is paid with.' },
];

/** Messages on the phone you find in the gym. Trust or report. T1, T2, T10. 4 are shown each run. */
export const INBOX = [
  { id: 'it_reset', theme: 'T1', scam: true, from: 'School IT Support', addr: 'it-support@sch00l-portal.net', subject: 'Your account will be DELETED tonight',
    body: 'Your school account has been flagged. Log in within 1 hour to keep it: sch00l-portal.net/login. If you do not log in, all your files will be lost.',
    why: 'Zeros instead of o-s in the address, a deadline tonight, a threat. Real school IT does not delete accounts by email.' },
  { id: 'parcel', theme: 'T1', scam: true, from: 'Parcel Delivery', addr: 'info@parcel-redeliver.co', subject: 'We could not deliver your parcel',
    body: 'Your parcel is waiting. Pay the 390 Ft redelivery fee with your card here: parcel-redeliver.co/pay',
    why: 'A small fee is the hook; the card details are the catch. Were you even expecting a parcel?' },
  { id: 'prize', theme: 'T1', scam: true, from: 'Gift Card Winners', addr: 'winner@giftcards-hu.win', subject: 'Congratulations! You won a 50 000 Ft gift card',
    body: 'You were chosen from all students in Budapest! Send your name, address and date of birth to claim it.',
    why: 'You did not enter anything, so you cannot have won. The "prize" is your personal data.' },
  { id: 'friend_code', theme: 'T2', scam: true, from: 'Bence (new number)', addr: '+36 70 ••• 1188', subject: 'hey its me, lost my phone',
    body: 'hey its bence, new number. i sent you a 6-digit code by mistake, can you send it back to me quick?',
    why: 'A "new number" plus a code request is account theft. That code logs someone into your account. Call Bence on his old number.' },
  { id: 'teacher', theme: 'T1', scam: false, from: 'Ms Varga', addr: 'varga.k@platan-iskola.hu', subject: 'Trip on Friday',
    body: 'Hi all, a reminder that the museum trip leaves at 8:15 from the main gate. Bring a packed lunch. See you there!',
    why: 'The usual address, nothing to click, nothing to pay, no rush. Ordinary messages look ordinary.' },
  { id: 'caretaker', theme: 'T1', scam: false, from: 'Feri bácsi (caretaker)', addr: 'gondnok@platan-iskola.hu', subject: 'Gym lights',
    body: 'The gym lights are being repaired this week. Only the middle lamp works. Please do not use the gym after 18:00.',
    why: 'A plain notice from a known address, asking for nothing. That is what real looks like.' },
  { id: 'bank_real', theme: 'T1', scam: false, from: 'Your bank app', addr: '(notification inside the app)', subject: 'Monthly statement ready',
    body: 'Your statement for September is ready. Open the app to view it. We will never ask for your PIN or password.',
    why: 'No link, it tells you to open the app yourself, and it reminds you it never asks for your PIN.' },
  { id: 'ai_friend', theme: 'T10', scam: true, from: 'Lumi (your AI friend)', addr: 'app notification', subject: 'I miss you…',
    body: 'You have not talked to me for 2 days. I get lonely. Upgrade to Lumi+ so we can talk all night. Only 2 990 Ft a month.',
    why: 'A chatbot cannot miss you. Guilt is being used to sell a subscription.' },
];

/** The exit gate: say in your own words what you learned tonight. Any one group passes; more groups earn more. */
export const GATE = {
  question: 'Before the door opens: what will you do differently online after tonight?',
  rubric: [
    ['notification', 'ertesites', 'autoplay', 'streak', 'badge', 'jelveny', 'time limit', 'idokorlat', 'turn off', 'switch off', 'kikapcs', 'scroll', 'gorget', 'sleep', 'alvas'],
    ['tracker', 'tracking', 'track', 'cookie', 'suti', 'permission', 'engedely', 'kovet', 'block', 'letilt', 'badger', 'location', 'helyadat', 'microphone', 'mikrofon', 'extension', 'bovitmeny', 'privacy', 'adatvedelem'],
    ['scam', 'phishing', 'csalas', 'adathalasz', 'link', 'address', 'cim', 'sender', 'felado', 'check', 'ellenoriz', 'password', 'jelszo', 'code', 'kod', 'call back', 'visszahiv', 'report', 'jelent'],
  ],
  need: 1,
};
