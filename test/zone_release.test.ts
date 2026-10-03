import assert from "node:assert/strict";
import test from "node:test";
import { planGameRecords, releaseSchema } from "../src/game_zone_release.js";

test("pending player assets stay out of the public record set", () => {
  const input = releaseSchema.parse({
    domain: "play.example.com",
    asset: { slug: "unreviewed-skin", origin: "assets.example.net", moderation: "pending" },
    liveEvent: { slug: "final", address: "203.0.113.10" },
    moderationQueue: { name: "ugc-review", consumer: "moderation-worker" }
  });

  const records = planGameRecords(input);
  assert.deepEqual(records.map((record) => record.record_type), ["A", "TXT"]);
  assert.equal(records.some((record) => record.name === "asset-unreviewed-skin"), false);
});
