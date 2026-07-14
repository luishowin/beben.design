# Sprite proxy - giving Sprite a live brain

The site is static (GitHub Pages), so the Fireworks API key can never go in
the site's JavaScript: anyone could read it from view-source and spend your
credits. This tiny Cloudflare Worker (free tier: 100,000 requests/day) holds
the key as a secret and forwards Sprite's chats to Fireworks.

```
visitor -> beben.design (sprite.js) -> your Worker -> Fireworks AI
                                       ^ key lives here only
```

## 1. Get a Fireworks API key

1. Sign in at https://app.fireworks.ai
2. Left sidebar -> API Keys -> Create API key. Copy it.

## 2. Deploy the Worker (no CLI needed)

1. Sign in at https://dash.cloudflare.com (free account is fine).
2. Workers & Pages -> Create -> Create Worker -> name it `sprite-proxy` -> Deploy.
3. Click "Edit code", delete the sample, paste the entire contents of
   `sprite-proxy.js`, then Deploy.
4. Back on the Worker page: Settings -> Variables and Secrets:
   - Add secret:   name `FIREWORKS_API_KEY`, value = your key from step 1.
   - (Optional) add variable `MODEL` with a Fireworks model id. The default
     is `accounts/fireworks/models/gpt-oss-20b` ($0.07/M input, $0.30/M
     output, serverless as of July 2026). If you pick another model from
     https://fireworks.ai/models, open its page and check it says
     "Serverless: supported" - many listed models (including Gemma 3 4B
     and Qwen3 8B) are on-demand only and the API returns 404 for them.
5. Copy the Worker URL, e.g. `https://sprite-proxy.YOURNAME.workers.dev`.

> Troubleshooting: if Cloudflare says "You attempted to upload a Service
> Worker syntax script... only supports ES Modules", you pasted the wrong
> file (probably the site's `sprite.js`). Paste `sprite-proxy.js` from this
> folder; it ends in `export default { ... }`, which is what Cloudflare wants.

## 3. Point Sprite at it

In `docs/assets/JS/sprite.js`, top of the file:

```js
const SPRITE_CONFIG = {
  apiUrl: 'https://sprite-proxy.YOURNAME.workers.dev',
  ...
};
```

Commit and push. That's the only site change; if the Worker is ever down or
`apiUrl` is empty, Sprite silently falls back to its built-in answers.

## 4. Test it

From a terminal:

```
curl -s -X POST https://sprite-proxy.YOURNAME.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://beben.design" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"what services do you offer?\"}],\"page\":{\"path\":\"/\"}}"
```

You should get `{"reply":"..."}` mentioning the services with a link.

## Costs and protections

- Small models on Fireworks run roughly $0.10-0.20 per million tokens.
  A chat turn is ~500-900 tokens, so about a hundredth of a cent.
  $50 in credits is on the order of hundreds of thousands of turns.
- The Worker already caps: 12 history messages, 1,000 chars per message,
  300 reply tokens, CORS locked to beben.design (+ localhost for testing).
- Optional hardening: in Cloudflare, Security -> WAF -> rate limiting rule
  on the Worker route (e.g. 20 requests/minute per IP).
- Watch spend at https://app.fireworks.ai -> Usage. If credits run out,
  the Worker returns an error and Sprite just falls back to built-in mode.
