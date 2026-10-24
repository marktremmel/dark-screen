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
];
/** Honest parts of the screen: clicking them is a mistake (there is nothing wrong with them). */
export const FINE = [
  { id: 'play', ui: 'PLAY' }, { id: 'settings', ui: '⚙ SETTINGS' }, { id: 'help', ui: '? HELP' }, { id: 'volume', ui: '🔊 SOUND' },
  { id: 'level', ui: 'LEVEL 14' }, { id: 'map', ui: 'WORLD MAP' }, { id: 'quit', ui: 'QUIT' },
];
