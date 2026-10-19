---
title: Beben Arcade - twelve games that work with the wifi off
description: Beben Arcade is a pocket arcade of tiny games. No ads, no account, works offline, and plays on anything with a browser.
date: 2026-10-19
author: Luis
tags: engineering, games, offline
hero_image: /assets/images/blog/beben-arcade-offline/hero.svg
hero_alt: An arcade cabinet screen with a neon game grid inside, wired to a service worker cache
featured: true
---

## What it is

Beben Arcade is a pocket arcade of twelve tiny games living at one address: snake, 2048, blockfall, brick bash, wingbeat, mines, pixel dash, skystack, paddle duel, star swarm, sudoku, four in a row, and more. You install it to your home screen, put your phone in airplane mode, and every game still opens.

It is a web app, so there is nothing to download from an app store. It plays on anything with a browser - a phone, a laptop, a tablet. No account is needed. No telemetry is collected.

## How it works

The whole arcade is about 222KB of static files: plain HTML, CSS, and JavaScript. There is no engine, no bundler, no framework, and no build step. Each game is a single self-contained HTML file that loads a small shared runtime (arcade.js) and owns everything else.

A service worker caches every file on the first visit. After that, the arcade works entirely offline - no network call is ever made. When a new build is released, updates roll out automatically because it is a web app: the next time you open it, you get the latest version.

Each game uses simple, ubiquitous technologies - HTML, CSS, and JavaScript - with canvas rendering and an 8-bit sound synth built in. The display type is Press Start 2P, self-hosted and subsetted to just the glyphs we need.

## Why it was built

I built Beben Arcade because I hate ads. Almost every game you install today is stuffed with ads, tracking, and prompts to create an account. I wanted something cleaner.

I also built it because I find myself in places without internet very often - on planes, in basements, anywhere the signal drops. Most games stop working the moment you lose a connection. Beben Arcade does not. Once installed, it keeps working forever, offline.

A key enabler has been AI. Frontier models like Opus 5.5 and GPT Astra write much better code than I can by miles. Not only in code, but also in UX planning and engineering. With AI, these games went from idea to working reality far faster than I could have done alone.

The games are very light. They use simple ubiquitous technologies like HTML, CSS, and JavaScript. They can be downloaded for offline play. Updates roll out automatically once built because it is a web app. There is no telemetry and no account needed. They play on anything with a browser.

Twelve are live and eight slots are reserved on the hub. [Go play something](/games/), then turn the wifi off and play it again.
