---
title: Codex - an offline library that answers in milliseconds
description: We had 180GB of offline archives that worked and were almost unusable. Codex rebuilds them into plain SQLite, 25x smaller, searchable in single-digit milliseconds, readable by any language. What it is, why it exists, and how it was built.
date: 2026-07-27
author: Luis
tags: engineering, offline, search, python
hero_image: /assets/images/blog/codex-offline-library/hero.svg
hero_alt: A stack of offline archives narrowing into a single SQLite file, with a search box returning ranked results
featured: true
pinned: true
---

Somewhere on a drive here sits about 180GB of ZIM archives: Wikipedia, iFixit, a few others. They are the offline internet in a box, downloaded for exactly the situation this studio keeps designing around, the moment the connection is not there.

They work. They are also close to unusable. The reader is slow, the built-in search index cannot be reranked, and nothing can query them programmatically. You have the knowledge and no good way to ask it a question.

Codex is the fix: a build pipeline that reads a ZIM archive read-only and streams it into a compact knowledge store that both a person and a language model can search. On the iFixit archive, 3.3GB and 894,836 entries becomes a 133MB file holding 82,269 documents, built in about three minutes, answering queries in 4 to 10 milliseconds.

## What a codex actually is

A codex is plain SQLite. Not a custom container, not a proprietary framing, not a compiled extension.

That choice does most of the work. Any SQLite binding in any language can open one, and the only thing a reader needs to know beyond standard SQL is that the document body is zstd-compressed JSON with the dictionary sitting in its own table. A few lines of Python read a codex without importing this project at all.

It splits into two files. `codex.db` holds documents, lead text, redirects, the link-derived neighbours, and a quick title index. It is self-sufficient: copy that one file to a stick and it works. `codex-deep.db` holds the full-body index and an embedding table, and is attached only if it happens to be there.

The same instinct is behind the [QR generator](/blog/tools-you-can-own/) and [Beben Arcade](/blog/beben-arcade-offline/). A format you can read without the tool that wrote it cannot be taken away from you later.

## Why not just use the archives

The honest answer is that we tried, and the failure was structural rather than cosmetic.

A ZIM is a compressed web archive. It is a superb distribution format and a poor query substrate: the text is locked inside HTML, the index that ships with it ranks how it ranks, and there is no way to blend in a second signal or hand results to anything else. Rebuilding is what buys the ability to rank differently, and ranking is the entire problem.

The size collapse is a side effect, not the goal. 25.6x smaller happens because a codex stores the text and throws away the presentation: the navboxes, the citation furniture, the duplicated markup, and the images.

## The images, and the measurement that killed them

Version 0.1 shipped 408,876 images in a 2GB sidecar file. All of it is gone now, deleted along with its pipeline, its storage, its schema, and its UI.

The reason is a number. Sampled across the full Wikipedia archive, the median image is 0.05 megapixels, the largest found was 0.395, and not one of 220 sampled reached 2MP. iFixit's are about 300x225. Kiwix downsamples everything on the way in, so the archives simply cannot supply a usable picture. We were paying gigabytes for thumbnails nobody could read.

Deleting them created a second problem, which is more interesting than the first. With no pictures, a repair guide saying "as shown in the first photo" points at nothing, and 16.5% of documents had at least one reference like that.

The tempting fix is a regular expression that strips any sentence mentioning an image. That version got built, and it destroyed spec sheets wholesale, because `Image Resolution: 1920x1080` is a field, `Figure out how to...` is not a figure, `picture-perfect` is an idiom, and `bootable images` are disks.

So the rules run in tiers. A pure pointer is dropped. A parenthetical clause is excised and the punctuation repaired. But a sentence like "the third pic is up against the plastic stop pointed to by the bottom yellow arrow" still tells a technician something real, so it is kept verbatim and the document is flagged instead. 13,243 documents carry that flag, which is 16.1% of the corpus. The loss is visible rather than silent, and you can query for it.

## How it is built: four passes

Pass 0 samples the archive and trains a shared zstd dictionary. Compressing small documents individually wastes most of the compression window; one trained dictionary gives every document a real context.

Pass 1 extracts. Ten worker processes each hold their own archive handle, parse HTML, and write document rows plus an outbound edge file. This is where the per-source adapters earn their place. iFixit `User/` pages are 56% of all HTML entries with a median length of three words, so they are rejected by path before anything is decompressed. iFixit also emits every guide step twice, once for desktop and once for mobile, which inflated the corpus to 67.8M words against the 49.1M it holds once deduplicated.

Pass 2 resolves the edges, drops dead ends, runs PageRank, and writes the importance score and the related lists.

Pass 3 builds the search indexes.

Every pass checkpoints, every 50,000 documents or every two minutes, whichever comes first. That matters because the Wikipedia build is projected at roughly six hours and an overnight job that cannot resume is an overnight job you run twice.

## Ranking is where the work is

BM25 on its own answers "which document contains these words most densely", which across a corpus of millions surfaces obscure stubs with confidence. Codex multiplies it by an importance score computed offline from the archive's own link graph. No usage data, no telemetry, no network.

Getting that graph honest took two corrections, both found by looking at results that were obviously wrong.

**Links are read from cleaned prose only, never the raw tree.** Collected before navboxes and citations are stripped, *The New York Times* and *Wayback Machine* win Wikipedia's ranking outright. Cited by everything, about nothing.

**Anything linked from more than 15% of the corpus is excluded.** iFixit's 404 interstitial page had 58,721 inbound links and ranked first before this rule existed. Removing it turned about 38% of all links into dead ends, which is why the dead-end rate reads 64.5% rather than 26.2%. Both numbers are correct. The higher one is the honest one.

After both corrections the top iFixit documents are *How To Solder and Desolder Connections*, *Electronics Skills*, and *Recognizing & Disconnecting Cable Connectors*, which is what a repair corpus should look like.

Search also relaxes progressively: title index with all terms, then full body with all terms, then either index with any term, with a coverage boost so three of four terms beats one of four. "nintendo switch joycon drift" matches no single title, and returning nothing is the worst possible answer.

## Three numbers that overruled the obvious guess

**Ten workers, not twelve.** Measured throughput on a six-core laptop: 212, 283, 320, 384, 370 documents per second at four, six, eight, ten and twelve workers. Ten is the plateau and it buys 5.6 times one core, not ten. An earlier calibration had claimed the Wikipedia build would take 2.1 hours by dividing a single-core rate by ten and assuming linear scaling. The real projection is about six.

**zstd level 15, not 19.** Level 19 costs 0.94ms per document against 0.55, a tenth of the entire per-document budget for the longest pass. Across 584 sampled articles it stored 31.05% of the JSON against 31.19%, roughly 30MB on a 7.9GB body store. On iFixit, where the dictionary is trained at the same level it compresses at, level 15 came out 0.13% *smaller* than 19.

**The same numpy call is right in one place and wrong in another.** `np.add.at` is the fast path for the float-weighted PageRank accumulation, at 0.42 seconds per 32 million edges. For the integer degree counts it is 4.74 seconds against 0.61 for `bincount`, eight times slower. Nothing about reading the code tells you that, which is why the comment explaining it sits directly above both.

The related-links pass has the same shape of lesson. The obvious implementation, a dictionary of per-source candidate lists trimmed as it goes, is fine at iFixit's 104,000 edges and fatal at Wikipedia's 170 million: 6.9KB per source is 46GB at seven million sources, on a 16GB machine. It does not fail quickly either, it fails about five hours in, after the expensive pass is already paid for. The replacement sorts each slice and folds the top twelve per group down as it goes, at 1.14 million edges per second and a flat 0.65GB. It is exact rather than approximate, and it was verified row for row against the old version: all 85,224 related rows and all 78,489 context labels identical.

## The interface is a hotkey

None of the above matters if querying it is a chore. A small daemon serves the codex files over local HTTP, and a launcher registers a global hotkey. `Alt+Space` from anywhere gives a search box, arrow keys move, Enter opens, Tab switches between the title index and the full body.

The hotkey is negotiated at startup rather than hardcoded. The launcher claims the first combination Windows will give it and prints what it got, because `Ctrl+Alt+Space` was already taken on this machine. Registration uses the Win32 API through ctypes rather than a keyboard hook, so it needs no admin rights and gives antivirus nothing to object to.

Serving it to a phone or a Pi on the same network is one flag. There is no authentication, which is stated plainly in the README and means trusted networks only.

## What it does not do yet

Wikipedia is calibrated and has never been run. The preflight projects 6.89 million documents into about 19GB across roughly six hours, and every build now prints that projection and checks the disk can hold it before starting.

Embeddings are scaffolded and empty. The plan is a small model, binary-quantised to 48 bytes per document, over the top 500,000 documents by importance, because there is no usable GPU on this machine.

A terminal client and an MCP server are both designed and unwritten. Both are clients of the daemon's JSON API, which is exactly why that API was built before either of them.

And the rough edges are written down rather than forgotten: 2.2% of leads still carry byline text, 5.9% have no lead at all so results show no preview, 4.4% of documents are orphans that nothing links to. They are findable, ranked last, and labelled as such in the README.

## What to steal

Two things, and neither is code.

The first is the format position. Rebuilding into plain SQLite rather than a clever container cost nothing and means the output outlives the project that made it. Every design decision after that got easier because the answer to "how will we read this in five years" was already settled.

The second is writing the measurement next to the decision. Every rule above looks arbitrary until you know the number behind it, and a rule whose reason has been forgotten is a rule the next person deletes. The comments in this codebase are mostly not explaining what the code does. They are explaining what we tried first and what it cost.

Both are the same habit as the [arcade's cache rule](/blog/beben-arcade-offline/) and the [QR generator's one-file constraint](/blog/tools-you-can-own/): find the thing that will silently rot if nobody remembers it, and write it down where it cannot be missed.

If your business runs on knowledge trapped in a format that cannot answer questions, that is fixable, and it is the kind of work we enjoy. [Talk to us](/contact/).
