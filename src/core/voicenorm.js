// The same text on screen and in the voice index: lower case, letters and digits only.
// Shared by the game (core/voice.js) and the pack builder (tools/voice/build_voice.mjs), so they always agree.
export function norm(s) {
  return String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}
