// T8 "Pressure to share, and getting help": jobs on the phone at home (v0.16).
// No monsters: a message arrives, you read the chat and choose a reply. The safe reply is then typed out (typing
// practice), and it earns a notebook card. A risky reply shows what could happen next, then you choose again.
// Each job: who and the chat so far, three replies (one safe), what happens after each risky one, and the card.
// Written for 13+: pressure to send photos is about selfies and other people's photos, never anything sexual.

export const HOME_JOBS = [
  { id: 'selfie', from: 'Zsófi_2011 (from the game)', chat: [
      ['them', 'heyy u play so good!!'], ['them', 'send me a selfie so i know ur real 😊 everyone does it'] ],
    replies: [
      { text: 'I do not send photos to people I have not met.', safe: true },
      { text: 'ok wait, sending one', next: 'They say thanks, then ask for another one, "a better one this time". You cannot take back the first one: it is on their phone now, and you do not know who they really are.' },
      { text: 'only if you send one first', next: 'A photo arrives. It could be anyone: a photo from the internet proves nothing. Now they say it is your turn.' } ],
    after: [['them', 'pff boring'], ['you', '(you block and report the account)']],
    card: { title: 'You can say no', text: 'You never owe anyone a photo, even if they say everyone does it. Someone who keeps pushing after a no is telling you who they are: block and report.' } },

  { id: 'grouppic', from: '7.B 🔥 (group chat)', chat: [
      ['Márk', 'LOOOL Dani fell asleep in maths'], ['Márk', 'u took the pic right? post it here 😂😂'], ['Gergő', 'post itttt'] ],
    replies: [
      { text: 'Not without asking Dani first.', safe: true },
      { text: 'haha ok posting', next: 'Thirty people see it in a minute. Someone screenshots it. By the next day it is in another school\'s group, and Dani does not come to the next lesson.' },
      { text: 'I will just send it to Márk', next: 'Márk posts it anyway. Sending it to one person is still sharing it.' } ],
    after: [['Gergő', 'ok fair'], ['Dani', '(later) thanks for asking. pls delete it']],
    card: { title: 'Ask before you post someone', text: 'A photo of someone else is theirs too. Ask first, and if they say no, it stays on your phone (or gets deleted).' } },

  { id: 'friend_help', from: 'Lili', chat: [
      ['Lili', 'can i tell u something'], ['Lili', 'someone says they will post my photo everywhere unless i send them 10 000 forints'], ['Lili', 'dont tell anyone pls. i dont know what to do'] ],
    replies: [
      { text: 'This is not your fault. Let us tell an adult together.', safe: true },
      { text: 'just pay them so it stops', next: 'Paying almost never makes it stop: people who threaten once usually ask again, for more.' },
      { text: 'ok I will not tell anyone', next: 'Lili is alone with it now, and so are you. Keeping a secret like this does not protect her: it protects the person threatening her.' } ],
    after: [['Lili', 'ok. can u come with me to the form teacher tomorrow'], ['you', 'yes. and do not reply to them, keep the messages']],
    card: { title: 'Getting help is not snitching', text: 'If someone threatens you or a friend online, do not pay and do not delete: keep the messages and tell an adult you trust. Kék Vonal (116-111) is free and anonymous.' } },

  { id: 'streak', from: 'Bence', chat: [
      ['Bence', 'ur going on holiday?? our streak is 212 days!!'], ['Bence', 'give me ur password ill keep it going for u'] ],
    replies: [
      { text: 'Passwords stay mine. The streak can end.', safe: true },
      { text: 'ok its bence2011', next: 'Now Bence can read all your messages, and so can anyone he shows it to. If you fall out one day, he still has it.' },
      { text: 'i will give it to my sister instead', next: 'A password shared with anyone is no longer only yours. Change it if you ever did.' } ],
    after: [['Bence', 'fine 😭 new streak when ur back'], ['you', 'deal']],
    card: { title: 'A password is not a gift', text: 'Not even a best friend gets your password. Apps are built to make streaks feel important: a streak is not worth your account.' } },

  { id: 'location', from: 'Szabi', chat: [
      ['Szabi', 'where r u rn'], ['Szabi', 'turn on live location, everyone in the group has it on, its fun'] ],
    replies: [
      { text: 'Only my family sees where I am.', safe: true },
      { text: 'sure turning it on', next: 'Everyone in the group can now see your home, your school and where you walk alone in the evening, every day, until you remember to turn it off.' },
      { text: 'ill turn it on just for today', next: 'Most people forget. Weeks later it is still on.' } ],
    after: [['Szabi', 'ok ok'], ['you', 'meet at the park at 4?']],
    card: { title: 'Your location is for family', text: 'Live location tells people where you live, where you go and when you are alone. Share it with family; with friends, just say where you will meet.' } },

  { id: 'dare', from: 'the squad 😈', chat: [
      ['Reka', 'ur turn for the dare'], ['Reka', 'film yourself drinking a whole bottle of soy sauce or ur out of the group'] ],
    replies: [
      { text: 'Not doing that. If I am out, I am out.', safe: true },
      { text: 'ok filming tomorrow', next: 'Dares like this land people in hospital. And the video stays online long after the group has forgotten it.' },
      { text: 'can I do a smaller one', next: 'They say yes, then the next dare is bigger. A group that throws you out for saying no is not your group.' } ],
    after: [['Reka', 'whatever'], ['Noémi', '(to you only) honestly respect. that dare was stupid']],
    card: { title: 'Saying no to a dare', text: 'If a group only keeps you for doing risky things, you lose nothing by saying no. Usually someone else in the group was relieved you did.' } },
];
export const HOME_JOB = Object.fromEntries(HOME_JOBS.map(j => [j.id, j]));
