---
title: Beben Arcade - twelve games that work with the wifi off
description: An installable arcade of twelve tiny games, shipped as 222KB of static files with no engine, no build step, and no network after the first visit. What offline-first costs and what it buys.
date: 2026-07-18
author: Luis
tags: engineering, games, offline
hero_image: /assets/images/blog/beben-arcade-offline/hero.svg
hero_alt: An arcade cabinet screen with a neon game grid inside, wired to a service worker cache
featured: true
pinned: true
---

[Beben Arcade](/games/) is twelve small games living at one address: snake, 2048, blockfall, brick bash, wingbeat, mines, pixel dash, skystack, paddle duel, star swarm, sudoku, four in a row. You can install it to a home screen, put the phone in airplane mode, and every one of them still opens.

The whole thing is 222KB of static files. No engine, no bundler, no framework, no analytics, no network call after the first visit. This post is about the rules that made that possible, because the games were the easy part.

## One rule, enforced ruthlessly

The arcade has a single hard constraint: nothing under `/games/` may reference anything outside `/games/`.

That sounds pedantic until you try it. It rules out the site's own stylesheet, the shared navigation, the Sprite widget, Google Fonts, a CDN, an icon set, an analytics snippet. Every one of those is a request that will fail on a plane, and a request that fails on a plane is a broken app in the only moment the arcade exists to serve.

So the arcade is a deliberate exception to our own design system. The main site has a shared `index.css`, a nav partial copied verbatim into every page, and a theme toggle. The arcade has none of them. It is a separate world with its own manifest, its own service worker scoped to `/games/`, and its own visual language. Every time someone suggests unifying the two, the answer is the same: unified means coupled, and coupled means the arcade goes down when the site does.

## A shared runtime, not an engine

Twelve games written independently would be twelve copies of the same three hundred lines. The obvious fix is a game engine, and the obvious fix is wrong at this scale. An engine wants you to model your game its way, and it arrives with a build step attached.

What we built instead is `arcade.js`, 35KB of plain JavaScript that does the boring things every game needed and nothing else:

- A fixed-timestep loop, so a 144Hz phone and a 60Hz laptop run the same physics.
- `fitCanvas`, which handles device pixel ratio and resize so no game ships its own blurry-canvas bug.
- An 8-bit Web Audio synth with a `jingle()` helper, so the sounds are generated rather than downloaded.
- Score and settings stores, namespaced `beben-arcade-*` and wrapped in try/catch because Safari private mode throws on `localStorage`.
- Top-bar chrome injected at load, so the back button and mute toggle sit in exactly the same pixel in all twelve games.

Each game is then one self-contained `<slug>/index.html` that loads the runtime and owns everything else. You can open any of them, read the whole game top to bottom, and change it without knowing how the other eleven work. That property is worth more than deduplication.

## Cache-first means stale forever

The service worker serves from cache first and only falls back to the network. That is the correct strategy for an offline arcade and it comes with one sharp edge: if you ship a fix without changing the cache name, returning visitors keep the bug indefinitely. Not for a while. Forever, until they clear site data.

The rule we wrote down after learning this: **every commit that touches `docs/games/` bumps the `CACHE` constant in `sw.js`**. The version badge on the hub moves with it, so the number on your screen tells you which build you are actually running. It is a small discipline that exists entirely to make a silent failure loud.

Adding a game touches four places on purpose: the precache list, a hub card, the hub's inline icon map, and the slug array the achievements read. There is no registry that generates those from a folder listing, because a registry would need a build step, and the build step is the thing we are refusing.

## Identity as a constraint

The arcade is dark only. There is no theme toggle, and it never reads the main site's theme key. Twelve games, twelve neon accents on a near-black `#080813`, one colour each for the card, the in-game chrome, the canvas art, and the game-over jingle. You learn which game you are in from the colour before you read a word.

The display type is Press Start 2P, self-hosted at 5KB. That number is the point. The full font is far larger; we subset it to uppercase glyphs only, which is why every use of it is paired with `text-transform: uppercase`. A web font you can afford offline is a web font you can subset until it is smaller than most tracking pixels.

The hero used to be a 168KB cover image. It is now drawn with CSS and SVG, which weighs nothing and scales to any screen.

## Achievements without a server

There are eight achievements: first play, twenty-five plays, playing all twelve, five personal bests, installing to the home screen, a three-day streak, playing after midnight, and turning on CRT mode. All of them evaluate against `localStorage` on the device.

Nobody can see your streak but you. That is not a limitation we apologise for, it is the same position we take on the [QR generator](/blog/tools-you-can-own/): if the feature does not need a server, it does not get one, and then there is no account, no leaderboard to moderate, and no database of who played what at 2am.

The rest of the extras follow the same logic. CRT scanline mode unlocks from the Konami code, seven taps on the logo, or the settings panel, and persists as a setting. One launch in seven shows an INSERT COIN flourish. Neither needs anything the device does not already have.

## What it cost, and what to steal

Offline-first is not free. We gave up the shared design system, hand-maintain four lists when adding a game, and cannot ship a hotfix without a cache bump. In exchange, the arcade has no runtime dependencies to break, no bill that scales with players, and no failure mode more interesting than a browser refusing to open a file it already has.

If you are building something similar, steal the boundary rather than the code. Draw a hard line around what must work offline, refuse every reference that crosses it, and write down the one rule that will silently rot if you forget it. The games take a weekend. The boundary is the product.

Twelve are live and eight slots are reserved on the hub. [Go play something](/games/), then turn the wifi off and play it again.
