# Pawfront

A playable browser survival shooter. Move one cat along a forest, desert, and frost trail while it automatically fires at approaching enemies. Earn cash, buy Power, Speed, and Money upgrades, equip different guns, claim missions, and defeat a tree boss every tenth substage. Failed encounters restart automatically with your earnings intact.

## Play over Tailscale

Open **https://m1-asahi.taila125ad.ts.net:8445/** while connected to the same tailnet. The production build is served by the persistent user service `pawfront-web.service` through private Tailscale Serve. No public hosting or account is required.

```sh
npm install
npm run dev
```

Use Vite's printed address for development. WASD or arrow keys move on desktop. On mobile, touch and drag inside the battlefield. Shooting and aiming are automatic. Pause with the on-screen button, Escape, or P. Resume explicitly from the pause overlay. Settings and cat selection are available there; weapon management and missions also pause combat. The three main upgrades can be bought during combat.

```sh
npm test
npm run typecheck
npm run build
npm run preview
npm run pace
npm run assets
```

`npm run build` updates `dist/`, which is also what the Tailscale service serves. Browser saves belong to an origin; localhost, IP addresses, and the Tailscale hostname have separate saves.

## Progression

Power increases shot damage. Speed increases shots per second, capped at six. Money increases enemy and boss cash payouts, from ×1 up to ×6. Prices and next values are visible before purchase. Cash is the only currency. Green banknotes are visual feedback; cash is credited immediately and requires no collection.

| Gun              | Price | Damage multiplier | Firing multiplier |
| ---------------- | ----: | ----------------: | ----------------: |
| Wooden blaster   |  Free |                ×1 |                ×1 |
| Coral blaster    |   $90 |              ×1.7 |             ×0.72 |
| Fish-can blaster |  $260 |              ×0.8 |              ×1.8 |

Purchased guns remain owned. Equipping changes actual damage and firing speed; displayed stats include upgrades. Gun swaps preserve reload progress. Missions track defeated enemies, upgrades purchased, and stages cleared, awarding the displayed cash once per claimed tier.

Ten substages form a numbered chapter, such as 1-1 through 1-10. Each substage has a 1,200-unit diagonal trail with three encounter locations. Traveling reveals new terrain and activates finite enemy groups. Clear every group and reach the marked exit to advance. The percentage combines 80% combat progress with 20% travel, and cannot reach 100% before clearing the exit. Terrain changes every five substages. Encounters and bosses have no countdown or timeout. At the unlocked exit, a final enemy and cat dying in the same simulation step counts as a stage clear. Standing still still fires automatically, but cannot advance through the trail. Sprouts commit to a straight dash after a 1.1-second warning; acorns mark your current ground position for a 1.25-second delayed attack. Boss stomps give 1.35 seconds to dodge. Boss quarter-health payouts make failed attempts useful.

## Structure

TypeScript, React, Vite, Canvas 2D, and plain modules:

- `src/game/config.ts`: balance, gun stats, missions, and caps.
- `simulation.ts` and `geometry.ts`: deterministic combat, swept projectile collision, atomic economy, spawning, settlement, and poses.
- `world.ts` and `camera.ts`: stage-derived continuous routes, world boundaries, coordinate transforms, and camera following.
- `engine.ts`: fixed-step clock, independent manual/menu/focus pauses, compact HUD snapshots, and save checkpoints.
- `render.ts` and `terrain.ts`: upright sprites, depth ordering, cached world terrain, culling, and bounded feedback.
- `cat-render.ts`, `cat-motion.ts`, and `assets.ts`: viewer-facing layered cats with head tilts, ear/tail follow-through, eight-frame walking bodies, directional enemies/bosses, and shared gun/paw hold points.
- `input.ts`, `audio.ts`, and `save.ts`: keyboard/pointer input, synthesized audio, and validated local persistence.
- `src/App.tsx`, `src/style.css`, and `src/game/strings.ts`: accessible DOM controls and centralized copy.

The logical canvas remains 480 × 640, uniformly scaled across devices. The viewport looks into world coordinates, with a small camera dead zone and restrained following. Reduced motion removes smoothing while preserving necessary camera movement. Collision, spawn positions, and drawn cliffs share the same diagonal trail. Each next substage starts at the previous exit; reloads and retries start at the saved substage entrance. Combat runs at 60 fixed steps per second with at most six catch-up steps. HUD updates are limited to ten per second outside immediate actions. Canvas pixel density is capped at two. Rendering and audio pause while hidden, with no catch-up on return.

Caps: 32 active enemies, 32 projectiles, 90 effects, 60 drawn banknotes per frame, and five overlapping sounds. Full spawn/projectile capacity defers work; visual caps do not suppress damage or earnings. Numeric values saturate at one trillion, stage numbers at one million, and upgrade levels have explicit caps.

## Artwork

All 15 original images in `Assets/` are preserved. The new production art uses simple original vector redraws with flat fills, warm outlines, and the same recognizable cat accessories, enemies, tree boss, guns, and scenery. These are simplified interpretations, not exact tracings of the supplied images or video.

`npm run assets` runs `scripts/prepare-flat-art.mjs`, writes editable SVGs to `public/art/flat/`, and rasterizes PNGs to `public/art/`. There are 210 frames packed into 11 sprite sheets totaling 1.44 MiB: 39 cat layers/frames, 144 enemy/boss frames, 12 gun views, and 15 UI/scenery frames. Originals are preserved. All frames have transparent padding.

Cats always show their face and front torso, including upward and sideways shooting. Each has a walking body, separate head, two ears, and tail. Small head tilts, ear flicks, and tail sway use simulation time; a damped follow-through starts only when a shot fires. Body proportions stay fixed. Pausing freezes every layer, and reduced motion removes cosmetic movement while retaining combat. Enemies and bosses retain four directional views with eight gait frames, driven by distance traveled.

Combat bodies have no embedded paws. Two tapered arms start at fixed opposite shoulders, with separate paws over the trigger grip and barrel support. Compact guns sit across the torso, and the fish-can tab folds close to its rim. The physical barrel, flash, and paws share one pose calculation; bulky gun receivers sit below the mouth. Smooth aiming keeps the muzzle aligned before firing. Upward guns and flashes are foreshortened; away-going projectiles share actor depth and pass behind the head. Recoil moves the gun and both hands together. Runners and ground attacks retain their committed direction during warnings.

`npm run assets:original` reproduces the previous trimmed original-art runtime copies for comparison; run `npm run assets` afterward to restore the release art.

## Saves and settings

Version 2 JSON is stored under `pawfront.progress.v2`. A version 1 save is migrated when no v2 save exists, preserving currency, upgrade levels, stage, selected cat, audio/motion settings, and previously earned weapon appearances as owned guns. New fields include Money, owned/equipped weapons, mission counters, and claimed tiers.

Purchases, equips, claims, selection, settings, and stage transitions save immediately. Changed combat earnings checkpoint every five seconds and on hiding/page exit. Reload starts the saved encounter with full health and fresh enemies. Corrupt or unavailable storage does not prevent play. Reset requires confirmation. Mute and system/reduced/full motion options are available in Settings.

## Verification

See [VERIFICATION.md](VERIFICATION.md) for measured pacing, Chromium checks, screenshots, and limitations. [REFERENCE-CHECK.md](REFERENCE-CHECK.md) maps each requested change to the video evidence and implementation. Development-only `window.__pawfront` controls support accelerated verification and are removed from production.
