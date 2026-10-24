// The design detective: an arcade cabinet in the underpass running "LOOT LEGENDS", a free game full of tricks.
// You get three screens; click every trick (dark pattern, sötét minta) before the timer runs out, leave the honest parts alone.
// T5 addictive and manipulative design. DATA ONLY. Each trick: what you see on the screen, its name, why it is a trick.
export const TRICKS = [
  { id: 'timer', ui: 'OFFER ENDS IN 00:59', name: 'Fake countdown', why: 'The timer resets every time you come back. A deadline is there to stop you thinking.' },
  { id: 'lootbox', ui: 'MYSTERY CHEST · 4,99 €', name: 'Loot box', why: 'You pay before you know what is inside. It works like a slot machine, and some countries treat it as gambling.' },
  { id: 'streak', ui: 'DON\'T LOSE YOUR 12-DAY STREAK!', name: 'Streak pressure', why: 'A streak turns playing into a duty. Missing one day feels like losing something, so you open the game when you did not want to.' },
  { id: 'scarcity', ui: 'ONLY 2 LEFT!', name: 'Fake scarcity', why: 'Digital items never run out. "Only 2 left" is there to make you hurry.' },
  { id: 'shame', ui: 'NO THANKS, I LIKE LOSING', name: 'Confirmshaming', why: 'The "no" button insults you so that saying no feels bad. You are allowed to say no without a joke at your expense.' },
  { id: 'gems', ui: '💎 1200 GEMS · 9,99 €', name: 'Fake currency', why: 'Gems hide what things really cost. 80 gems sounds small; in money it is not.' },
  { id: 'energy', ui: 'OUT OF ENERGY · WAIT 4 H OR PAY', name: 'Pay to skip waiting', why: 'The game is made slow on purpose, then sells you the speed back.' },
  { id: 'friends', ui: 'BENCE IS AHEAD OF YOU!', name: 'Social pressure', why: 'Comparing you with friends is used to make you play (and pay) more, not to make it more fun.' },
  { id: 'notify', ui: 'TURN ON NOTIFICATIONS FOR A FREE REWARD', name: 'Notification bait', why: 'A tiny reward now, and the game can pull you back with messages every day.' },
  { id: 'daily', ui: 'DAY 6 OF 7: COME BACK TOMORROW FOR THE BIG PRIZE', name: 'Daily login reward', why: 'The big prize is always one more day away. It trains you to open the game every day.' },
  { id: 'preticked', ui: '☑ SEND ME OFFERS AND SHARE MY DATA', name: 'Pre-ticked box', why: 'Someone ticked it for you, hoping you will not notice. A fair choice starts unticked.' },
  { id: 'hiddencost', ui: 'FREE TRIAL · then 7,99 €/week', name: 'Hidden cost', why: 'The price is there, but small and pale. "Free" in big letters, the weekly charge in tiny ones.' },
  // v0.21: written with the doc 07 prompt (24 Oct 2026), checked and added by Claude
  { id: 'disguised_ad', ui: 'TAP HERE TO CONTINUE', name: 'Disguised ad', why: 'The button looks like part of the game, but it opens an ad. Look for the small "Ad" label before you tap.' },
  { id: 'hard_to_cancel', ui: 'TO CANCEL, CALL US MON-FRI 9-10', name: 'Hard to cancel', why: 'Signing up took one tap, leaving takes a phone call. Easy in and hard out is built to keep you paying.' },
  { id: 'nagging', ui: 'ENJOYING THE GAME? RATE 5 STARS!', name: 'Nagging pop-ups', why: 'The same pop-up keeps coming back until you give in. Each time you close it, it wears down your patience a little more.' },
  { id: 'trial_to_paid', ui: 'FREE 3-DAY TRIAL, THEN 4990 FT/WEEK', name: 'Trial that turns paid', why: 'Free trials switch to paid by themselves if you forget to cancel. Write down the end date, or skip the trial.' },
  { id: 'fake_social_proof', ui: '9 482 PLAYERS BOUGHT THIS TODAY', name: 'Fake social proof', why: 'Big numbers make buying feel normal, and nobody can check them. What others buy is not a reason for you to buy.' },
  { id: 'hidden_close', ui: 'CLAIM YOUR BONUS!', name: 'Hidden close button', why: 'The claim button is huge and bright, the real close button is a tiny grey x in a corner. Look for the way out before you tap anything.' },
];
/** Honest parts of the screen: clicking them is a mistake (there is nothing wrong with them). */
export const FINE = [
  { id: 'play', ui: 'PLAY' }, { id: 'settings', ui: '⚙ SETTINGS' }, { id: 'help', ui: '? HELP' }, { id: 'volume', ui: '🔊 SOUND' },
  { id: 'level', ui: 'LEVEL 14' }, { id: 'map', ui: 'WORLD MAP' }, { id: 'quit', ui: 'QUIT' },
];
