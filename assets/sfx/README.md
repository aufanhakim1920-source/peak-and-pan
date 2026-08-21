# Sound effects

Drop MP3s in here with these exact names. **Any file that is missing is
simply skipped** — the app never breaks or waits on audio, so you can add
them one at a time.

| File | Plays when | Wants to sound like |
|---|---|---|
| `tap.mp3` | confirming the sound toggle | a soft, short click |
| `gather.mp3` | picking up an ingredient | a light pick-up / pop |
| `lesson.mp3` | finishing a technique card | a small page-turn or chime |
| `step.mp3` | ticking off a cooking step | a very quiet tick |
| `served.mp3` | serving a dish to Glorb | a warm, satisfied flourish |
| `levelup.mp3` | reaching a new level | a short rising fanfare |
| `stage-clear.mp3` | clearing a whole country | the big one — a win sting |
| `unlock.mp3` | unlocking the Chef's Table | a bright unlock |
| `error.mp3` | something is blocked | a soft, non-punishing thud |

Keep them **short** (under ~1.5s, except `stage-clear`) and quiet — per-sound
volume is already set in `sfx.js`, so mix for "noticeable", not "loud".

## Where to get them

Free, commercial-use, no attribution required:

- **Mixkit** — <https://mixkit.co/free-sound-effects/game/>
- **Pixabay** — <https://pixabay.com/sound-effects/search/game/>
- **Kenney** (CC0 game audio packs) — <https://kenney.nl/assets/category:Audio>

Download, rename to the table above, drop in this folder. Done.

## Sound is OFF by default

Deliberate: someone opening the demo link on a train should not be
ambushed. The toggle lives in **Profile → Access**, and the first tap after
enabling it unlocks browser audio playback.
