# Pawfront: reference-driven playable overhaul

## Implementation brief

Kego initially requested a new task, then explicitly asked to continue here without approval while away. This brief was executed as an active goal in the existing task. Work remains in the existing `/home/kevin/Projects/Pawfront` working tree. Do not create a worktree or discard existing uncommitted work.

The goal was created without a token budget. Its completion criteria include implementation, actual-game inspection, repairs, and verification. See README.md, REFERENCE-CHECK.md, and VERIFICATION.md for the delivered behavior and evidence.

**Objective:** Finish and polish Pawfront's reference-driven overhaul: traveling terrain with diagonal cliffs, one controllable cat dodging approaching enemies while automatically firing, bold shooting and banknote feedback, distinct equipable guns, Power/Speed/Money upgrades, cash-only progression, numbered substages and route progress, functional weapon and mission interfaces, flatter cartoon artwork, and bright integrated controls. Preserve working untimed encounters, bosses, retries, local saves, accessible keyboard/touch controls, and mobile performance. Verify the result in Chromium and keep its production build reachable from Kego's Mac over Tailscale.

## Authority and scope

Kego explicitly requests these changes and authorizes useful tool discovery and installation, image generation/editing when needed, Blender if useful, and subagents for independent work. Use the smallest practical implementation. Preserve original artwork files even if new runtime artwork is needed for the flatter direction.

The reference direction is already selected. Kego previously explicitly waived HTML mocks and visual approval. Build and inspect the actual game, without another mock-selection checkpoint. These revisions supersede the original restrictions on cosmetic-only weapons, two upgrades, coins, one unchanging clearing, and no mission interface. Keep unaffected behavior working.

No accounts, backend, cloud saves, ads, payments, analytics, runtime AI, extra currencies, offline earnings, or installation requirements for players. One player cat is sufficient; do not add companions. Existing cat selection can remain if it fits, but is not a requirement for additional active cats.

## Reference and fidelity contract

Primary video: https://www.youtube.com/watch?v=KrsVtIz43Xg

Title previously observed: “Idle Cat Gunner - First Day in Game - Gameplay Part 01,” SanDo, approximately 15:43. The older reference https://www.youtube.com/watch?v=CjMA6usCH2E is secondary.

For **each** requested feature, check whether it appears in the primary video before implementing it. Where it does, make the UI and UX as close as practical: composition, relative scale, placement, colors, button shape, motion, and feedback rhythm. Where Kego deliberately differs, follow Kego's instructions. Keep a concise feature-by-feature fidelity record with observed timestamps/screenshots, implementation decisions, and final screenshot evidence. Distinguish direct observations from assumptions. Do not claim to have watched inaccessible footage.

Existing reference captures are in `outputs/ref-010.png`, `outputs/ref-45.png`, `outputs/ref-180.png`, `outputs/ref-780.png`, and `outputs/ref-782.png`. Inspect them, and inspect the video directly where available. Prior viewing was sampled, not continuous; playback sometimes failed. Firefox could view sampled reference footage, while Chromium had media errors. This does not authorize non-Chromium game compatibility testing.

Previously observed evidence to recheck:

- Opening/45 seconds: small upright brown cat, diagonal cliffs, pale green ground, stage 1-1, route dots and percentage bar, long yellow shots, white damage numbers, green banknotes and large green income figures, chunky Power/Speed/Money buttons.
- Around 3 minutes: stage 1-2, separate weapon entries with different damage/fire intervals, equip slots, drag-to-equip copy, weapon grid, and a Mission control. A partial merge label was visible, but a working merge interaction was not observed. Do not infer or add an elaborate merging economy from that label alone.
- Around 13 minutes: desert/cactus terrain, two cats, yellow streaks, damage and income numbers, and a countdown/Exit control. Multiple cats, gems, and timed challenges are deliberate exclusions for Pawfront.

## Required changes

| # | Requested result | Reference relationship and implementation requirement |
| --- | --- | --- |
| 1 | Diagonal cliffs and changing terrain that feel like traveling through a world | Match the reference's diagonal composition and terrain transitions. Keep combat readable and movement coordinates consistent across devices. Terrain progression must be visible during ordinary play, not only in a menu. |
| 2 | Dodge approaching enemies | Deliberate difference from sampled tree-shooting footage. Preserve active keyboard/touch movement, automatic targeting, approaching enemies, and dodgeable boss warnings. |
| 3 | One cat | Deliberate difference from later footage. One player-controlled cat is sufficient. |
| 4 | Bright yellow shot streaks, prominent impacts, visible damage numbers | Match observed feedback while keeping effects bounded and combat legible. Shots must visually originate at the equipped weapon's muzzle. |
| 5 | Scattered green banknotes and large income numbers | Match observed reward feedback. Credit cash exactly once immediately; scattered notes are visual feedback and require no collection. |
| 6 | Separate guns with individual stats and an equip interface | Replace cosmetic-only weapon milestones with real, understandable weapon choices and functioning equip controls. Show actual stats. Support touch and keyboard interaction, not drag-only input. Keep any acquisition rules simple, visible, and cash-only. |
| 7 | Power, Speed, Money | Three functioning main upgrade controls. Power improves damage, Speed improves firing, Money improves earnings. Show current/next values and costs, apply immediately, reject stale duplicate purchases and insufficient funds, and cap rates safely. |
| 8 | Cash-style currency only | Replace coin presentation consistently across gameplay, labels, upgrades, missions, and weapons. Do not copy the video's gems. |
| 9 | Numbered substages, route indicator, percentage progress | Match the reference's visual hierarchy. Derive truthful progress from encounter completion, including pending spawns and bosses. Preserve retry and advancement correctness. |
| 10 | Keep current timed-encounter behavior | Existing Pawfront encounters are untimed. Keep them untimed, including bosses; do not introduce a countdown, timeout, or timed-challenge mode. |
| 11 | Chunkier, brighter buttons integrated into the game screen | Match the reference's placement and visual weight. Keep the battlefield prominent and all controls reachable on narrow mobile. No decorative cards, pills, empty navigation, or unnecessary copy. |
| 12 | Simpler, flatter cartoon shapes | Bring the production game's artwork and environment toward the reference. Keep a coherent cat/enemy/boss/weapon style and recognizable silhouettes at mobile size. Preserve source files. Generated assets are allowed if useful. |
| 13 | Visible weapon-management and mission UI | Implement working interfaces, not placeholder buttons. Missions need understandable objectives, real progress, and exactly-once cash rewards. Keep the system compact, locally saved, and grounded in the existing play loop. |

## Existing implementation and constraints

Read `README.md`, `VERIFICATION.md`, the source, and relevant available skills. Do not read `PROJECT_AGENTS.md` unless Kego asks. Inspect current artwork and actual game before editing. Existing source is largely uncommitted; preserve unrelated work.

- TypeScript, React, Vite; Canvas 2D combat with DOM controls. Plain modules separate simulation, rendering, input, audio, persistence, and copy. Continue this architecture without an engine rewrite.
- Logical arena currently 480 × 640 with uniform scaling, fixed 60 Hz simulation, bounded catch-up, HUD updates at most 10 Hz, capped pixel density, and bounded enemies/projectiles/effects/sounds.
- Three approaching enemy types and a telegraphed tree boss every tenth stage. Scheduled enemies must all spawn and die before stage clear. Same-step final-enemy/player death counts as clear. Fresh stage/retry restores safe position and health and clears all transient combat state.
- Retries preserve currency/upgrades; solo bosses currently award partial-damage earnings to make failures useful. Preserve useful failed-attempt earnings in the revised economy.
- Keyboard WASD/arrows and single captured-pointer floating joystick. Preserve normalized movement, resize mapping, dead zone, pointer cancellation, UI isolation, and focus/visibility/modal input clearing. Combat pauses for blocking menus, while upgrades remain buyable during combat.
- Preserve mute, restrained sound, reduced-motion system preference/override, hidden-tab suspension without catch-up, local save checkpoints, and reset confirmation.
- Version 1 save uses `pawfront.progress.v1`, with coins, damage/rate levels, selected cat, stage, and audio/motion settings. Implement and test a versioned migration for revised currency, upgrades, weapons, and missions; preserve earned progress sensibly. Validate corrupt/unavailable storage and avoid per-frame writes.
- Original 15 PNGs remain in `Assets/`; prepared art and crop report are in `public/art/`. Existing fish-can/small-rock/bush runtime copies have targeted exterior-alpha cleanup. Review any new art against actual scene colors and preserve aspect ratios, feet, attachment anchors, and upright aiming.

## Verification and completion

Build in connected playable increments. Inspect actual screenshots and interact with each feature, comparing it to the reference as you go. Fix discovered issues and rerun affected checks.

Run `npm test`, `npm run typecheck`, and `npm run build`. Update meaningful tests for the new economy, equipped weapon stats, purchases, mission progress/reward idempotency, old-save migration, new-save round trips, pending spawns, boss warnings, same-step deaths, retries, and visual-capacity invariants. Retain relevant existing tests without preserving deliberately removed cosmetic-only behavior.

Update deterministic pacing checks with documented purchase/equip strategies and stationary, loop, and threat-avoidance movement. Retain targets of roughly 20–30 seconds for the first affordable upgrade and 3–5 minutes for the first boss unless evidence justifies tuning. Measure new weapon and mission access during normal play. Report measurements and unverified targets, not old results as new validation.

Game browser testing is authorized for Chromium only. Existing tested environment was Chromium 151 on Fedora Asahi Remix 44 aarch64, using Playwright CLI. Inspect desktop, 390 × 844, and 320 × 640 layouts; emulate touch and explicitly distinguish it from real-device testing. Check controls, all gun poses/aim directions, terrain transitions, ordinary combat, upgrades, weapon management, missions, boss/retry behavior, save/reload, menus and pauses, mute/motion, and console errors. Inspect release builds too. Keep any accelerators development-only.

Existing `outputs/verify-*.js`, `outputs/capture-final.js`, and `outputs/chromium.config.json` may help but must be adapted to the revised game. Capture actual final desktop/mobile gameplay and the new interfaces. Check performance under a representative capped combat load; do not sacrifice damage/reward correctness to visual budgets. Update run instructions and verification notes, inspect the final diff, and report limitations honestly.

## Tailscale delivery

Kego's Mac previously got connection refused at `http://100.84.91.81:4174`. The working private URL established afterward is:

**https://m1-asahi.taila125ad.ts.net:8445/**

Current arrangement to inspect and preserve:

- User systemd unit `~/.config/systemd/user/pawfront-web.service` serves this project's `dist/` with `/usr/bin/python3 -m http.server 4175 --bind 127.0.0.1 --directory /home/kevin/Projects/Pawfront/dist` and restart-on-failure.
- Tailscale Serve on HTTPS 8445 proxies to `http://127.0.0.1:4175`, configured with `tailscale serve --bg --https=8445 http://127.0.0.1:4175`.
- Rebuilding `dist/` updates the served game. Verify service health and the HTTPS game/art responses after the final build. Preserve unrelated routes on 443, 8443, and 8444.
- This is private tailnet access, not public deployment. Do not claim to have verified access from the actual Mac unless you did.

Deliver the polished playable build, working Tailscale link, actual screenshots, per-feature reference comparison, checks/pacing results, asset notes, and remaining limitations. Finish the goal only after the required work is complete.
