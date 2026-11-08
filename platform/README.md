# platform/: the phone and app layer

Plain scripts that sit next to game.js in the public build (tools/build_public.sh). They were written for the
Capacitor app (iOS/Android) and talk to the game only through window hooks the game sets up:
SK_GAME (scenes, openPause), SK_INPUT (keys and look), SK_AUDIO (context, play, music), SK_STATE (settings),
SK_TOUCH / SK_GYRO / SK_HAPTICS / SK_KEYBOARD (set by these scripts, read by the game).

- touch_controls.js + touch.css: joysticks, Use / Pause buttons, panel close buttons, orientation
- gyro_aim.js: look by tilting (needs permission on iOS)
- virtual_keyboard.js: on-screen keyboard and suggestion chips for the typing parts
- audio_haptics.js: vibration from sounds, waking audio after the phone sleeps
- splash_screen.js + assets/: loading screen art

The school build (game/index.html) does not load them.
