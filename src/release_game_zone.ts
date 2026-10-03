import { InfraiDns } from "./infrai_dns.js";
import { releaseGameZone } from "./game_zone_release.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the release script");

const result = await releaseGameZone(new InfraiDns(apiKey), {
  domain: "play.example.com",
  asset: { slug: "guild-banner", origin: "assets.example.net", moderation: "approved" },
  liveEvent: { slug: "weekend-cup", address: "203.0.113.42" },
  moderationQueue: { name: "ugc-review", consumer: "moderation-worker" }
});

console.log(JSON.stringify(result, null, 2));
