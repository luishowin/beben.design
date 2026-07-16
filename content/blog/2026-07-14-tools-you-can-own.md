---
title: A tool you can download and own
description: Our QR code generator is one HTML file that works offline forever. The engineering and the ethics of building tools people can take with them.
date: 2026-07-14
author: Luis
tags: tools, privacy, design
hero_image: /assets/images/blog/tools-you-can-own/hero.svg
hero_alt: A QR code pattern with a download arrow beside it
featured: true
---

The first free tool on this site is a QR code generator. Paste a URL, some text, a phone number, and it draws a clean, scannable code you can export as a crisp vector SVG. No watermark, no sign-up, no limits.

None of that is the interesting part. The interesting part is that the whole tool is one HTML file, and we tell people to download it.

## The disappearing free tool

Everyone has lived this story. You find a free converter or generator, it works, you bookmark it. A year later the bookmark leads to a pricing page, or a login wall, or a domain squatter. The tool did not break. Its business model did.

Web tools rot for a reason: as long as the tool runs on someone's server, it inherits that server's costs, and eventually those costs go looking for you. The watermark, the account requirement, the daily limit, the newsletter popup: each one is a server bill wearing a costume.

So the design brief for our generator was not make a QR tool. It was make a QR tool that cannot rot. That single requirement made most of the architecture decisions for us.

## One file, no server, nothing phoning home

The generator is a single self-contained HTML file: markup, styles, the QR encoding logic, all of it inline, no external requests. It runs entirely in your browser. Save the page to your laptop and it will work on a plane, in a village with no signal, and in ten years, exactly as it does today on our domain.

That construction has a privacy property that no policy document can match: your data never leaves the browser because there is nowhere for it to go. When a tool has no server, you do not have to trust it, and the distinction matters. A privacy policy is a promise; an offline file is a fact. Nothing you encode, URLs, contact details, Wi-Fi credentials, is visible to us or anyone else, and this is verifiable by anyone who opens the file and reads it.

There is a quieter benefit too. A tool with no backend has no uptime, no maintenance burden, no monthly bill nagging its owner to monetise it. The usual pressures that turn free tools hostile simply have no purchase on it.

## Small decisions that respect the person using it

A few choices inside the tool, and why they were made:

- **SVG as the primary export.** A QR code is geometry, not a picture, so it should ship as geometry. Vector output means the same file is right at business-card size and on the side of a building, with no anti-aliased mush in between.
- **Error correction you can actually choose.** QR codes carry adjustable redundancy, and the tool exposes it plainly, with one line of honest advice: pick the highest level if you plan to overlay a logo. Most tools hide this to seem simpler and quietly pick a poor default.
- **No watermark, at all.** A watermark on a QR code is worse than branding, it is added visual noise inside a machine-readable image. Removing it is not generosity, it is correctness.

## Why a studio gives tools away

Beben Design sells design and engineering work. Giving away a genuinely finished tool is not charity either, it is the most honest portfolio piece we can publish.

A case study says trust us, it went well. A tool you can download, inspect, and keep is different: it demonstrates positions we hold about software, that things should work offline, respect the person using them, and not decay into upsell machines, in a form you can test yourself. Anyone can evaluate our work by using it, with no meeting and no deck.

And the constraint is good practice. Building software that has to survive without a server, without updates, and without us is a sharpening exercise for client work, where longevity and low maintenance are what most businesses actually need but rarely know to ask for.

## Own your tools

The generator is free to use at [the tools page](/tools/), and the whole point is that you do not have to keep coming back: download it, keep it, share the file itself if you like. More tools built on the same principle are on the way.

If your business depends on a workflow of rented web tools that keep sprouting login walls, that is fixable. Building small, durable, offline-capable tools is exactly the kind of work we enjoy, [talk to us](/contact/).
