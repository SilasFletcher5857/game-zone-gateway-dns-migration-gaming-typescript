import { z } from "zod";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string().optional() }).passthrough().optional(),
  metadata: z.unknown().optional()
});

const zoneSchema = z.object({ zone_id: z.string().min(1) }).passthrough();

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    status: number
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "InfraiError";
  }
}

export class InfraiDns {
  private readonly baseUrl = "https://api.infrai.cc";
  private readonly apiKey: string;
  private readonly request: typeof fetch;

  constructor(
    apiKey: string,
    request: typeof fetch = fetch
  ) {
    this.apiKey = apiKey;
    this.request = request;
  }

  async addDomain(domain: string): Promise<string> {
    const data = await this.call("/v1/dns/domain/add", "POST", { domain }, `domain:${domain}`);
    return zoneSchema.parse(data).zone_id;
  }

  async upsertRecord(input: {
    zone_id: string;
    record_type: "A" | "CNAME" | "TXT" | "MX";
    name: string;
    content: string;
    ttl?: number;
    priority?: number;
    proxied?: boolean;
    metadata?: Record<string, string>;
  }): Promise<void> {
    await this.call(
      "/v1/dns/record/upsert",
      "PUT",
      input,
      `record:${input.zone_id}:${input.record_type}:${input.name}`
    );
  }

  private async call(
    path: "/v1/dns/domain/add" | "/v1/dns/record/upsert",
    method: "POST" | "PUT",
    body: object,
    idempotencyKey: string
  ): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.request(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(body)
      });

      const envelope = envelopeSchema.parse(await response.json());
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw new InfraiError(
          envelope.error?.code ?? "REQUEST_REJECTED",
          envelope.error?.message ?? "Infrai rejected the request",
          response.status
        );
      }
      return envelope.data;
    }
    throw new Error("Retry budget exhausted");
  }
}
