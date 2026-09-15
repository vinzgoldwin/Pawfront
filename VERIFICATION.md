# Verification

Tested September 14, 2026 on Fedora Asahi Remix 44 aarch64, Node.js 22.23.1, and headless Chromium 151.0.7922.173 through Playwright CLI. Desktop viewports: 1280 × 900 and 1280 × 720. Narrow viewports: 390 × 844 and 320 × 640. Touch used Chromium CDP emulation, not a physical phone. No remote Mac, Safari, or Firefox was controlled.

## Automated checks

`npm test`: **69 passing tests**. Coverage includes targeting/range, swept collision, duplicate rewards, atomic/stale/unaffordable purchases, gun rate caps and reload conservation, mission claims, pending spawns and caps, final-enemy settlement, retries, simultaneous deaths at the exit, boss warnings and partial payouts, v1/v2 saves and corrupt/blocked storage, and numeric limits.

New motion tests cover actual-distance gait clocks, stopped and paused motion, smooth shortest-arc turns, committed attack directions, target stability, forward-only point-blank shots, shared projected gun geometry, and sprite-sheet coverage/transparent padding. New world boundaries include route continuity, safe entrances and world clamping at the maximum stage, world/screen round trips, camera dead zones and reduced motion, finite travel-activated packs, no AFK advancement, clearing enemies without reaching the exit, reaching the exit with enemies outstanding, offscreen active enemies, fresh retry/reload state, nondecreasing travel progress, camped warning relocation, committed runner dashes, and captured tank attack positions. Pose tests sweep 3,240 cat/gun/angle combinations.

`npm run typecheck`, production build, and `git diff --check` pass. Production JavaScript is approximately 280 kB (89 kB gzip); CSS 13.7 kB (3.9 kB gzip). Original `Assets/` files are unchanged. Source modules, new files, and the tracked diff were reviewed; the repository remains uncommitted.

## Chromium behavior checks

**80 assertions passed across five focused scripts:**

- `outputs/verify-trail.js`: 23 desktop checks covering actual keyboard scrolling, camera position, pack activation, Pause/P/Escape, editable fields, settings/manual pause, hidden state, boss windup and projectile pause, transition pause, existing save restoration, retries, ten stationary minutes, exit gating, stage continuity, and offscreen simulation.
- `outputs/verify-trail-touch.js`: 21 checks for one-pointer control, unrelated fingers, actual scrolling, camera-independent joystick direction, no page scrolling, release/cancel/resize, new coordinate mapping, narrow layout, audio/motion settings, cat switching, combat purchases, visibility checkpoints, and denied storage.
- `outputs/verify-trail-combat.js`: eight checks for full warning duration, dodging runner/tank/boss attacks, automatic stationary firing, gun management, mission claims, and console errors. Includes a 32-enemy performance sample.
- `outputs/verify-trail-production.js`: 15 checks through the private Tailscale HTTPS URL: successful loading, no development controls, pause/settings, actual keyboard travel, naturally earned and saved cash, an affordable Power purchase, no stationary stage skip, reload/settings, narrow layout, and weapon/mission controls.

- `outputs/verify-directional-motion.js`: 13 checks for all eight actual rendered gait frames, stopped/reduced idle poses, 210 frames loaded through 11 sheets, four-way enemy/boss facing, enemy contact stops, pause freezing the new motion state, and upward torso-hold firing. Recorded an actual gameplay clip and inspected 12 sequential frames.

There were no page or console errors in the passing runs. Latest scrolling, touch, combat, and production logs have `-hold.log` suffixes; the directional script uses `outputs/verify-hold-motion.log`. Visibility checks used a synthetic `document.hidden` override and browser events. They exercise lifecycle handlers, not physical OS sleep behavior. Audio state was checked programmatically; listening quality was not evaluated.

## Visual and asset inspection

Compared the reference opening frame again with actual scrolling desktop/mobile captures. The trail now reveals new cliffs, ground details, props, and enemy groups through camera movement. It no longer substitutes a decorative ground slide for walking. The exit is marked, and offscreen objectives receive an edge chevron. Nearby terrain is cached, and scenery is depth sorted and culled. Trees and bushes sit outside the combat corridor where they could cover the cat.

All three cats keep their front torso and both eyes visible in every gun direction. Head, left/right ears, tail, and eight walking body frames are separate authored layers. Head tilts remain under five degrees; shot follow-through settles without stretching the body. Lowered the bulky gun receivers to clear the mouth. Enemies and the boss retain four directions and eight articulated walking frames. Gun grip, two paws, recoil, flash, and physical shots still share geometry.

Inspected **72 Chromium cat/gun aiming-and-recoil captures** and 12 sampled frames from a new actual-game recording, `outputs/viewer-facing-motion.webm`. The new **288-case pixel audit** checks that both eyes and the nose remain readable for every cat/gun/direction across four shooting phases. It also verifies distinct head/ear/tail shot follow-through and stationary cosmetic transforms under reduced motion (`outputs/verify-hold-face.log`). Earlier inspection of the 144 enemy/boss frames remains applicable; their artwork is unchanged, and current gameplay checks reverified their facing and gait.

All **210 runtime frames** pass sheet-coverage and alpha-boundary tests. Eleven cached sheets total **1.44 MiB**, down from 1.81 MiB by removing superseded cat directional frames. Original `Assets/` files and UI portraits are unchanged. Blender 5.2.1 is installed; authored 2D SVG layers, Sharp, and Chromium suit this performance without a 3D pipeline.

A **1,152-case Chromium Canvas transform audit** verifies all cats/guns/angles across idle, walking, recoil, reduced motion, and intermediate holding sides. Projected grip/support/muzzle, both paws, recoil, flash position, and raised-gun depth agree within 0.000092 canvas pixels (`outputs/verify-hold-contract.log`). Upward firing no longer waits for the removed shoulder-lifting motion. Pose sheets use the production renderer, not HTML mocks.

Additional unit coverage checks the small head-tilt bound, stopped gait follow-through, reduced motion, smooth shot response/settling, and shot-age reset on retry. Animation uses simulation time, so existing pause/hiding checks include the new transient shot-age state. Continuous video playback of the reference remained unreliable; an exact 1:1 timing match is unverified.

## Pacing

`npm run pace` runs production simulation at 60 fixed steps/second for ten minutes with seeds 7, 42, and 2026. It claims completed missions, tries purchases in ascending price order among Power/Speed/Money and unowned guns, then equips the highest-DPS owned gun. Upgrades win price ties in Power, Speed, Money order.

Stationary never moves. Route following heads toward the next objective, stopping 115 units from active enemies/spawn warnings. Dodging chooses among 24 directions and standing still, aiming to remain about 130 units from targets while avoiding enemy bodies, committed attack areas, warnings, and trail walls.

| Strategy | First upgrade | First boss substage | First boss cleared | Retries in 10 minutes |
| --- | --- | --- | --- | --- |
| Stationary at entrance | None | Never | Never | 0 |
| Route following | 24.6–27.2 s | 226.6–241.7 s | 240.1–254.8 s | 18–19 |
| Route + dodging | 23.8–24.2 s | 216.9–220.9 s | 231.9–235.5 s | 0 |

Both moving strategies meet the 20–30 second upgrade and 3–5 minute boss-substage targets in these seeds. Removing the obsolete upward shoulder-transfer delay improves non-dodging progress, while later failures still favor active dodging. The boss appears after traveling through its substage. The stationary entrance control remains at stage 1 with no activated enemies or earnings; it is a travel-gate check, not proof of combat difficulty.

A separate matched six-enemy encounter uses identical stage-5 stats (Power 2, Speed 1, wooden gun) and seeds. Stationary loses all three runs in **3.3–3.5 seconds**, defeating one enemy. Dodging clears all three runs in **17.7–18.3 seconds**, defeating all six with **100 HP** remaining. This demonstrates a survival advantage without changing auto-fire or adding an inactivity penalty.

Route-only failures earned **$4–276 per attempt** in these runs. Route following reached stage 20, while dodging reached stages 25–26. Coral was bought at 186.2–197.3 seconds and fish at 290.5–298.8 seconds across moving strategies. Raw output: `outputs/pacing-hold.jsonl`.

These are deterministic automated strategies. Human learning time, physical touch difficulty, and extended late-game balance beyond the ten-minute runs remain unverified.

## Performance and delivery

A three-second Chromium sample with 32 active enemies recorded 180 frame intervals: median **16.7 ms**, p95 **16.7 ms**. Canvas drawing: median **0.8 ms**, p95 **0.9 ms**. The terrain cache remained at eight chunks after traveling/drawing through 40 chunks. These are short local synthetic measurements, not real-phone benchmarks.

The persistent `pawfront-web.service` serves the rebuilt `dist/` on loopback port 4175. Private Tailscale Serve exposes **https://m1-asahi.taila125ad.ts.net:8445/**. Chromium loaded and played that address on this host. Access from Kego's Mac remains unverified; the Mac needs the same tailnet. Unrelated Tailscale routes were preserved.

## Actual game screenshots

- `outputs/hold-game-closeup.png`: actual-game capture at the reported left-down angle after anatomical hold correction.
- `outputs/hold-oblique.png`: renderer QA sheet for 150–170° and upward holds, idle and recoil.

- `outputs/viewer-facing-motion.webm`: real-time arena recording with directional movement, shots, and committed attacks.
- `outputs/directional-mushroom.png`, `directional-sprout.png`, `directional-acorn.png`, `directional-boss.png`: each enemy approaching from four sides.
- `outputs/trail-mobile-touch.png`: movement, joystick, approaching enemies, damage feedback, and scrolling forest.
- `outputs/trail-desktop.png`: desktop scrolling encounter.
- `outputs/trail-boss-warning.png`: tree boss, aimed gunfire, and dodge warning.
- `outputs/trail-combat.png`: ordinary combat and cash feedback.
- `outputs/trail-mobile-pause.png`: narrow Pause overlay.
- `outputs/trail-production-desktop.png` and `trail-production-narrow.png`: production build with ordinary controls and naturally earned progress.

Development captures use accelerated encounter setup where needed. Production gameplay captures use no development controls. See [REFERENCE-CHECK.md](REFERENCE-CHECK.md) for reference matches and deliberate adaptations.


## Anatomical hold QA correction

The earlier coordinate and face-pixel checks did not establish a believable hold. The reported screenshot showed a fish-can tab touching the chin, oversized guns, and arms starting near the center of the chest. Fixed both shoulder roots at opposite torso edges; changed the arm contours to tapered, outward elbows; placed both paws over actual grip/support contacts; reduced gun sizes; folded the fish tab down; raised the hold to the waist; and foreshortened upward flashes. Projectiles now use actor depth so away-going streaks do not paint over the face. Original artwork files remain unchanged.

Visual QA inspected all 72 cat/gun/direction poses plus explicit 150°, 160°, and 170° idle/recoil poses matching the report (`outputs/hold-oblique.png`). Independent visual review rejected the initial overly low hold and full-size upward flash, which were corrected before delivery. A 12-second actual-simulation capture circles a target around the cat using each gun; 12 enlarged frames were inspected (`outputs/hold-turns.webm`, `outputs/hold-turns-frames.png`). A separate moving-combat capture is `outputs/hold-qa-motion.webm`. Upward weapon silhouettes remain intentionally compressed by perspective. These observations supplement, rather than derive from, numerical test results.

`outputs/verify-hold-depth.log` verifies away/forward projectile depth; `outputs/verify-hold-face.log` and `outputs/verify-hold-contract.log` verify face readability and physical muzzle/paw agreement. They are regression checks, not proof of subjective visual quality.
