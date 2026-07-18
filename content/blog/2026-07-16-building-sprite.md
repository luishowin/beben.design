---
title: Building Sprite - a chat widget with two brains
description: How we built a zero-dependency site guide that answers from an LLM when it can and from a pattern engine when it can't, on a static site with no backend and no keys in the repo.
date: 2026-07-16
author: Luis
tags: engineering, javascript, ai
hero_image: /assets/images/blog/building-sprite/hero.svg
hero_alt: Diagram of Sprite's two brains, an offline pattern engine and a Cloudflare Worker proxy, both feeding one chat bubble
featured: true
---

Sprite is the small pixel character that lives in the corner of every page on this site. Visitors ask it about pricing, services, or the projects, and it answers in character. It looks like the kind of feature that needs a platform behind it. It runs on none.

This site is static HTML on GitHub Pages: no build step, no server, no database. That constraint was the design brief. Whatever Sprite became, it had to ship as two files, a stylesheet and a script, and keep working if everything else failed.

## The constraint is the architecture

A chat widget on a static site has three classic problems.

First, there is nowhere to put an API key. Anything in the repo is public, and anything the browser downloads is public, so the browser can never talk to an LLM provider directly.

Second, there is nowhere to hide slow failures. If the model is down, a static site has no ops page, no queue, no retry worker. The widget itself has to decide what happens next, instantly.

Third, nobody wants a dependency tree for a mascot. Pulling a chat SDK plus a framework onto every page of a portfolio site is backwards. Sprite is written in plain JavaScript, injects its own DOM, and a page that wants it adds exactly two includes.

The answer to all three was to give Sprite two brains and a strong opinion about which one to trust.

## Brain one: the pattern engine

The first brain is a dialogue table that ships inside the script: a list of intents, each a set of regular expressions mapped to a pool of written replies. Ask about pricing and a pricing pattern matches; ask for a joke and you get one of the jokes; ask something it cannot place and it says so honestly and offers the sections it knows.

This engine is deliberately unfashionable, and it has properties the fashionable option cannot match. It costs nothing per message. It answers in zero network round trips. It never hallucinates a discount. And it works on a train, in a demo, and on the day the API provider has an incident.

Every reply in the table was written by hand, in Sprite's voice, with suggestion chips attached so a visitor can keep moving with one tap. The pattern engine is not the fallback that shipped because we ran out of time. It is the floor the whole feature stands on.

## Brain two: a Worker in front of an LLM

The second brain is a small Cloudflare Worker that sits between the site and Fireworks AI. The browser sends the conversation to the Worker; the Worker holds the API key, builds the system prompt, forwards the exchange upstream, and returns the reply. The key never appears in the repo or in the browser.

The Worker is also where the safety rails live:

- CORS is locked to the site's own origins, so other pages cannot borrow the proxy.
- History is capped at twelve messages and a thousand characters each, so one visitor cannot burn the budget.
- Replies are capped in tokens, which keeps Sprite concise by force rather than by prompt engineering alone.

The interesting part is how the Worker knows things. Sprite's knowledge base is a markdown file that lives in the site repo and is served like any other page. The Worker fetches it, caches it for five minutes, and folds it into the system prompt. Updating the mascot's brain is a git push, the same motion as updating any page on the site. No dashboard, no retraining, no deploy beyond the one we were already doing.

## Failure is a feature boundary

The rule that makes the two-brain design work: any failure of the live brain, timeout, non-200, CORS mismatch, malformed reply, silently routes the message to the pattern engine. The visitor sees an answer either way. There is no error state in the UI at all, because the offline brain means we never need one.

That rule earns its keep constantly. Run the site on a local port the Worker does not allow, and Sprite quietly answers offline. Break the proxy config, same. The demo never dies in front of a client.

## Three small lessons that cost us something

**Links need an allowlist.** When an LLM writes markdown links, it will eventually write one you do not want rendered. Sprite's renderer escapes everything first, then linkifies only paths on this site, WhatsApp, mailto, and tel. Anything else stays plain text. Trust the model with tone, never with hrefs.

**Continuity beats memory.** Chat history is kept in sessionStorage, so the conversation follows a visitor from the services page to the contact page and dies when the tab closes. That is the right lifespan for a site guide: helpful across a visit, forgetful by design.

**Browsers cache harder than you think.** Both Sprite files carry a version query string, and every change bumps it on every page. We learned this the way everyone does: shipping a fix and watching returning visitors keep the bug for a week.

## What to steal

If you are adding an assistant to a static site, steal the shape, not the code. Put the key in a tiny proxy you control. Cap everything at that proxy. Write an offline answer set by hand and treat it as the primary experience, then let the LLM be the upgrade rather than the dependency. The result reads as one brain to visitors, and that is the point.

Sprite has a full case study on the [work page](/sprite/), and it is probably in the corner of your screen right now if you would rather interview it directly.
