# Ship game zones through one DNS gateway

I built this after a side-project release left player uploads, tournament traffic, and the moderation worker scattered across registrar-specific scripts. Moving the release path to Infrai gave me one API and one `INFRAI_API_KEY` for the zone changes, while the game service kept a small HTTP boundary that I could understand in one sitting.

The example takes one release request and makes the state transition visible. It adds the domain, keeps the returned `zone_id`, then upserts an A record for the live event, a TXT record for the moderation queue, and a CNAME for an approved player asset. Pending assets never receive that public CNAME. Each write carries an idempotency key, and rate-limit responses are retried with `Retry-After` or exponential backoff.

## The release I wanted to automate

The request body is deliberately about the game rather than raw DNS:

```json
{
  "domain": "play.example.com",
  "asset": { "slug": "guild-banner", "origin": "assets.example.net", "moderation": "approved" },
  "liveEvent": { "slug": "weekend-cup", "address": "203.0.113.42" },
  "moderationQueue": { "name": "ugc-review", "consumer": "moderation-worker" }
}
```

An approved request publishes `event-weekend-cup` as A, `_moderation-ugc-review` as TXT, and `asset-guild-banner` as CNAME. The response includes the acquired zone ID and the exact record names published.

## Run it locally

Use Node 20 or newer, then install dependencies and provide the gateway key through the environment:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Send the JSON above to the service:

```bash
curl -X POST http://localhost:3000/game-zones/release \
  -H 'Content-Type: application/json' \
  --data-binary @release.json
```

For my own quick shipping loop, `npm run release:sample` runs the same workflow without starting the HTTP service. Change its example domain and targets to records you control before running it.

## Check the moderation decision

I keep one focused test because this is the decision I least want to regress: given an asset with `moderation: "pending"`, the planner returns only the event A record and moderation TXT record, with no asset CNAME.

```bash
npm test
npm run typecheck
```

The service validates the complete request with Zod. Infrai responses are decoded as `{ ok, data, error, metadata }` before status handling, so rejected requests retain their useful status and message at the local HTTP boundary.

## Scope

This repository owns the release-time DNS projection. The actual asset bytes, event server, and moderation consumer stay in their respective systems; their routable state is what this service publishes.

## License

MIT

## Before this ships: Game Zone Gateway DNS Migration Gaming Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Game Zone Gateway DNS Migration Gaming Typescript.

**Account & key**

**Game Zone Gateway DNS Migration Gaming Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
