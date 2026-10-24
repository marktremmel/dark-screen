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
];
export const CALL = Object.fromEntries(CALLS.map(c => [c.id, c]));
