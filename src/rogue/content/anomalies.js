// Landing anomalies for the descent (Exit 8 rules). DATA ONLY.
// A normal landing always looks exactly the same (apart from the floor and flat numbers), so players can learn it.
// To add an anomaly: give it a unique id, a theme from themes.js, a 'where' the landing builder understands,
// a lesson (shown when you catch it or miss it) and a notebook card. The content test checks every field.

/** The notices you can read on every landing. Normal versions first; anomalies swap one of them. */
export const NOTICES = {
  lift: ['LIFT INSPECTION (liftvizsgálat)', 'Thursday 9:00 to 12:00 the lift is out of service.', 'Questions: www.kozoskepviselo.hu/lift', 'The residents\' representative (közös képviselő)'],
  cat: ['LOST CAT (elveszett macska)', 'Ginger, answers to Bajusz.', 'Last seen in the courtyard.', 'Please knock at flat 14. Thank you!'],
  liftDoor: ['LIFT (felvonó)', 'Max. 4 people / 320 kg', 'In case of fault, press the alarm button.'],
  // anomalous versions
  lift_lookalike: ['LIFT INSPECTION (liftvizsgálat)', 'Thursday 9:00 to 12:00 the lift is out of service.', 'Questions: www.k0zoskepviselo.hu/lift', 'The residents\' representative (közös képviselő)'],
  lift_urgent: ['FINAL WARNING (utolsó figyelmeztetés)', 'Your water will be cut off TODAY at 18:00.', 'Pay the overdue 4 990 Ft now: scan the code and type in your card details.', 'Do not call the office. There is no time.'],
  cat_address: ['LOST CAT (elveszett macska)', 'Ginger, answers to Bajusz.', 'Send us your full address, your flat number and a photo of your front door', 'and we will come round to check if he is with you.'],
  liftDoor_wifi: ['FREE WI-FI FOR NEIGHBOURS', 'Network: Lepcsohaz_Free', 'To connect, sign in with your email address', 'and your email password.'],
};

export const ANOMALIES = [
  { id: 'flyer_lookalike', theme: 'T1', where: 'noticeboard', notice: 'lift_lookalike',
    lesson: 'The lift notice pointed to k0zoskepviselo.hu, with a zero instead of an o. Lookalike addresses (hasonmás címek) are the oldest phishing trick: read web addresses letter by letter.',
    card: { title: 'Read the address', text: 'Before you click or type anything, read the web address letter by letter. One swapped letter (0 for o, rn for m) makes it someone else\'s site.' } },
  { id: 'flyer_urgent', theme: 'T1', where: 'noticeboard', notice: 'lift_urgent',
    lesson: 'A final warning, a deadline today, card details and "don\'t call the office": that is the shape of a scam (csalás). Pressure and secrecy are the signals. Real offices let you call them.',
    card: { title: 'Pressure is the signal', text: 'Urgency, a payment, and being told not to check: three signs of a scam. Slow down and contact the sender another way.' } },
  { id: 'wifi_note', theme: 'T1', where: 'liftDoor', notice: 'liftDoor_wifi',
    lesson: 'Free Wi-Fi that wants your email password is a password trap. No network ever needs the password of a different account (fiók).',
    card: { title: 'One password, one place', text: 'A password belongs to one account and is only ever typed there. Anything else that asks for it is collecting it.' } },
  { id: 'cat_address', theme: 'T9', where: 'noticeboard', notice: 'cat_address',
    lesson: 'The lost-cat notice asked for your address, flat number and a photo of your door. Small details like these add up to where you live (lakcím). Strangers don\'t need them to find a cat.',
    card: { title: 'Small pieces add up', text: 'Your street, your school, a photo of your door: each one is harmless alone. Together they say where to find you.' } },
  { id: 'nameplate_you', theme: 'T9', where: 'door2',
    lesson: 'The neighbour\'s nameplate had your name on it. Somebody knows where you live. In real life that knowledge usually comes from what we post: tagged places, school uniforms, the view from a window.',
    card: { title: 'Your footprint (digitális lábnyom)', text: 'Every post leaves a trace. Before posting, ask: could a stranger work out where I live from this?' } },
  { id: 'lift_name', theme: 'T3', where: 'liftDisplay',
    lesson: 'The lift display greeted you by name. A device that knows who you are without being told is tracking (követés) you. Ask: who collected this, and who else can see it?',
    card: { title: 'Who is collecting?', text: 'When an app or device knows something you never told it, someone collected it. Check its permissions and switch off what it does not need.' } },
  { id: 'camera_extra', theme: 'T3', where: 'ceiling',
    lesson: 'There was a small camera above the doors with a red light. Cameras and trackers hide in ordinary places. Spotting them is the first step; tracker blockers do this job in your browser.',
    card: { title: 'Look up', text: 'Trackers are built to go unnoticed. A tracker blocker in your browser shows them and stops them, like a torch in a dark corner.' } },
  { id: 'phone_voice', theme: 'T2', where: 'door3sound',
    lesson: 'Behind the door a phone rang and someone answered in your voice. Voices can be cloned (hangklón) from a few seconds of video. If a voice you know asks for money or codes, hang up and call back on the number you already have.',
    card: { title: 'Call back', text: 'A familiar voice is not proof. Hang up and call the person back on the number you already have, or ask something only they would know.' } },
  { id: 'door_extra', theme: 'OBS', where: 'leftWall',
    lesson: 'There was a fourth door on the side wall. There are only ever three flats on a landing.',
    card: { title: 'Know the normal', text: 'You can only spot what is wrong if you know what normal looks like. The same is true of your accounts: know your usual logins and devices.' } },
  { id: 'number_mirror', theme: 'OBS', where: 'floorNumber',
    lesson: 'The floor number was painted back to front.',
    card: { title: 'Look twice', text: 'Mirrored letters and numbers are easy to read past. Fake sites and fake profiles rely on it.' } },
  { id: 'bulb_red', theme: 'OBS', where: 'lamp',
    lesson: 'The landing light was red.',
    card: { title: 'Trust the odd feeling', text: 'If something feels off, stop and look before you keep going.' } },
  { id: 'plant_gone', theme: 'OBS', where: 'plant',
    lesson: 'The rubber plant by the window was gone.',
    card: { title: 'What is missing?', text: 'Sometimes the clue is what is not there: a padlock, a sender, a name you expected.' } },
];

export const ANOMALY = Object.fromEntries(ANOMALIES.map(a => [a.id, a]));
