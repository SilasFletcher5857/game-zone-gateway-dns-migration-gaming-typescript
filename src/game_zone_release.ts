import { z } from "zod";
import { InfraiDns } from "./infrai_dns.js";

export const releaseSchema = z.object({
  domain: z.string().min(1),
  asset: z.object({ slug: z.string().min(1), origin: z.string().min(1), moderation: z.enum(["approved", "pending"]) }),
  liveEvent: z.object({ slug: z.string().min(1), address: z.string().ip() }),
  moderationQueue: z.object({ name: z.string().min(1), consumer: z.string().min(1) })
});

export type GameZoneRelease = z.infer<typeof releaseSchema>;

export type PlannedRecord = {
  record_type: "A" | "CNAME" | "TXT";
  name: string;
  content: string;
  ttl: number;
  metadata: Record<string, string>;
};

export function planGameRecords(input: GameZoneRelease): PlannedRecord[] {
  const records: PlannedRecord[] = [
    {
      record_type: "A",
      name: `event-${input.liveEvent.slug}`,
      content: input.liveEvent.address,
      ttl: 60,
      metadata: { workload: "live-event" }
    },
    {
      record_type: "TXT",
      name: `_moderation-${input.moderationQueue.name}`,
      content: input.moderationQueue.consumer,
      ttl: 60,
      metadata: { workload: "moderation-queue" }
    }
  ];

  if (input.asset.moderation === "approved") {
    records.push({
      record_type: "CNAME",
      name: `asset-${input.asset.slug}`,
      content: input.asset.origin,
      ttl: 300,
      metadata: { workload: "player-asset", moderation: "approved" }
    });
  }
  return records;
}

export async function releaseGameZone(dns: InfraiDns, rawInput: unknown) {
  const input = releaseSchema.parse(rawInput);
  const zone_id = await dns.addDomain(input.domain);
  const records = planGameRecords(input);

  await Promise.all(records.map((record) => dns.upsertRecord({ zone_id, ...record })));
  return { zone_id, published: records.map(({ record_type, name }) => ({ record_type, name })) };
}
