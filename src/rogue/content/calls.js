// The payphone on the walk: a familiar voice in a hurry. How do you check before you act? T1, T2. DATA ONLY.
// Each call: who it sounds like, what the voice says and wants, the number you already have for the real person,
// a question only the real person could answer, and what the real person says when you call back.
export const CALLS = [
  { id: 'mum_code', who: 'Mum', say: 'It is me, Mum! I dropped my phone, this is a stranger\'s. A code just came to your phone, read it to me, quick!', wants: 'Read out the code',
    number: '+36 30 418 2290', question: 'What did we call our first cat?', real: '"Hello? I am at home, my phone is right here. Who called you? Don\'t tell anyone any code!"',
    lesson: 'A familiar voice in a hurry, a "new" phone, and a code: the code logs someone into your account. Hang up and call the number you already have.' },
  { id: 'bence_money', who: 'Bence', say: 'Hey, it\'s Bence. I\'m stuck at Keleti, my card is blocked. Can you send me 8 000 forints? I\'ll pay you back tomorrow!', wants: 'Send the money',
    number: '+36 70 255 6013', question: 'What did we do after school on Friday?', real: '"What? I\'m at home playing. I never called you. That\'s so creepy."',
    lesson: 'Voices can be cloned from a few seconds of video (hangklón). Money plus urgency is the signal: call back on the number you know.' },
  { id: 'bank_pin', who: 'Your bank (security team)', say: 'This is your bank\'s security team. Someone is spending your money right now. To stop it, tell us your PIN.', wants: 'Say your PIN',
    number: '+36 1 366 6777', question: 'Which branch did I open my account at?', real: '"We did not call you. We never ask for your PIN. Thank you for checking: we will block that number."',
    lesson: 'Banks never ask for your PIN or full card details on the phone. Hang up, and call the number on the back of your card.' },
  // v0.18
  { id: 'nagyi_card', who: 'Nagyi', say: 'Szia, drágám, it is Nagyi. I am at the hospital and the nurse needs 20 000 forints for my medicine. Take your mum\'s card and read me the numbers, quick!', wants: 'Read out the card numbers',
    number: '+36 1 241 7735', question: 'What do you always bake for my birthday?', real: '"Hello, darling! I am at home watching the quiz show. Hospital? I am perfectly fine. Don\'t give anyone mum\'s card!"',
    lesson: 'A cloned voice of a grandparent in trouble is one of the most common scams (unokázós csalás, turned around). Hang up and call Nagyi on her own number.' },
  { id: 'teacher_kreta', cardTitle: 'Nobody needs your password', who: 'Your form teacher', say: 'This is your form teacher. The school system was hacked tonight. Tell me your e-Kréta password now so I can save your grades.', wants: 'Say your password',
    number: '+36 1 312 4580', question: 'Which room is our classroom?', real: '"I would never ask for your password, not even in an emergency. If you told anyone, change it tonight."',
    lesson: 'No teacher, admin or company needs your password. Someone who asks for it, in any voice, wants your account.' },
  { id: 'dori_photos', cardTitle: 'Never pay, never keep it secret', who: 'Dóri', say: 'It\'s Dóri, on a friend\'s phone. Someone has my photos and says they\'ll post them unless I pay 5 000 forints. Please send it, and don\'t tell anyone!', wants: 'Send the money and keep it secret',
    number: '+36 20 377 1904', question: 'Where did we sit on the school trip?', real: '"What? I\'m fine, my phone is right here. But if that ever really happens, we tell someone, okay? We don\'t pay."',
    lesson: 'Threats to post photos unless someone pays (zsarolás) are a crime. Never pay and never keep it secret: keep the messages and tell an adult. Kék Vonal: 116-111.' },
];
export const CALL = Object.fromEntries(CALLS.map(c => [c.id, c]));
