---
title: Rev Log - why the data format is the product
description: Our open source motorcycle telemetry project ships a ride-data format before it ships hardware. The reasoning behind that order, and what it changes about everything else.
date: 2026-07-15
author: Luis
tags: open-source, hardware, telemetry
hero_image: /assets/images/blog/rev-log-format-first/hero.svg
hero_alt: Telemetry traces for throttle, brake and revs drawn over a faint grid
featured: true
---

Rev Log is our open source telemetry project for motorcycles: a logger that records what the machine is doing, throttle, brakes, revs, lean, and how those change as a rider improves. The obvious way to build it is hardware first: design the box, sell the box, let the data be whatever the box happens to write.

We are building it in the opposite order. The ride-data format comes first, published as a versioned, openly licensed spec. The hardware is the reference implementation of that spec, not the product. This post is the reasoning, written down before the first prototype exists, so we can be held to it later.

## Hardware ages, formats compound

Every hardware revision is mortal. Components go out of stock, enclosures get redesigned, a better sensor makes last year's board a museum piece. If the value of the project lives in the box, the project restarts with every revision.

A data format has the opposite life cycle. Every ride logged in it makes it more valuable. Every tool that reads it makes it harder to abandon. A rider's year of progress, recorded in an open spec, survives the logger that recorded it, the phone it synced to, and frankly the company that designed it. When we say the format is the crown jewel, that is the mechanism: hardware depreciates, a good format compounds.

There is a proof of this pattern in an adjacent hobby. Fitness devices come and go, but activity files outlived every one of them, and whole ecosystems grew around reading and analysing them. Motorcycling deserves that layer, and it does not exist yet for what the machine itself is doing.

## What phones cannot see

The skeptical question is fair: phones already log rides. GPS, speed, lean angle from the IMU, route maps. If that were the whole picture, Rev Log would have no reason to exist.

What a phone cannot see is the bike's nervous system: revs, throttle position, which brake is being used and how hard, wheel speed. That is exactly the layer that describes how someone is riding rather than where they went. Smoother throttle, earlier and calmer braking, less coasting into corners: it is all in the vehicle inputs, and the vehicle inputs are why dedicated hardware exists at all. So the format treats them as first-class citizens, never as an optional extension.

## Analog first, on purpose

The reference hardware targets a carburetted 200cc single cylinder machine. No CAN bus, no diagnostic port, nothing modern to plug into. RPM comes off the ignition coil, brake signals from the brake-light switch, wheel speed from a hall sensor.

This looks like a limitation and is actually the discipline. If the system works on a bike with no electronics, it works on almost anything with a battery, which includes most of the small-displacement machines most riders actually learn on, and most of the bikes on roads outside the wealthy markets. CAN support arrives later as a module for modern bikes, a superset rather than a prerequisite. Designing for the oldest, simplest target keeps the format honest about what is essential.

## Progression, not lap times

Most motorsport data products are built for riders who are already fast. Lap timers assume you know what a good lap feels like. Rev Log starts at the other end: a novice who wants proof they are getting better.

That choice ripples into the spec itself. The format is designed to make month-over-month comparison natural, because the primary question is not how fast was I but am I smoother than March. And it shapes an ethical line we wrote down early: the numbers celebrate improvement, they do not push risk. No machine-generated advice to brake later. A beginner's telemetry should make them calmer, not braver.

## Open source before market

The whole stack goes public before any product does: schema, firmware, build notes, and a web visualiser that turns a memory card full of numbers into a ride you can watch. Success at this stage is measured in strangers. Ten people who build one. The first pull request from someone we have never met. Another tool, not ours, that reads the format.

That last one is the real finish line, and it is why openness is strategy rather than charity here. A format only becomes a format when a second implementation exists. Keeping the spec proprietary would protect exactly the thing that needs to spread.

## Built by a beginner, honestly

One more thing worth saying plainly: the person behind this project is a new rider, at the start of training, with the first bike still months away. The project is sequenced around that on purpose. Training first, proper gear second, data third, and the logger gets taped to a bike that is being ridden normally.

We think that is a feature of the project, not an embarrassing footnote. A progression-telemetry system designed by a beginner, logging real rides from day one and publishing them, is the honest test of whether the output means anything. If the data cannot show a novice getting better, the product has no reason to exist.

The project's public logbook lives on the [Rev Log page](/rev-log/), including the six bearings we navigate by and the current roadmap. If you are a rider who wants to own your data, or a firmware or hardware person who wants a project worth soldering, we would like to [hear from you](/contact/).
