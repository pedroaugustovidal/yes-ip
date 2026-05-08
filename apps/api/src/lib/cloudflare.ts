const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CloudflareDnsRecord {
  id: string;
  type: 'A' | 'AAAA' | string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
}

export class CloudflareError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: Array<{ code: number; message: string }> = [],
  ) {
    super(message);
    this.name = 'CloudflareError';
  }
}

export interface CloudflareClientOptions {
  token: string;
  zoneId: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class CloudflareClient {
  private readonly token: string;
  private readonly zoneId: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: CloudflareClientOptions) {
    this.token = opts.token;
    this.zoneId = opts.zoneId;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  async listRecords(name: string, type: 'A' | 'AAAA'): Promise<CloudflareDnsRecord[]> {
    const url = new URL(`${CF_API_BASE}/zones/${this.zoneId}/dns_records`);
    url.searchParams.set('name', name);
    url.searchParams.set('type', type);
    const res = await this.request<CloudflareDnsRecord[]>('GET', url.toString());
    return res;
  }

  async createRecord(input: {
    name: string;
    type: 'A' | 'AAAA';
    content: string;
    ttl: number;
    proxied?: boolean;
  }): Promise<CloudflareDnsRecord> {
    return this.request<CloudflareDnsRecord>(
      'POST',
      `${CF_API_BASE}/zones/${this.zoneId}/dns_records`,
      {
        name: input.name,
        type: input.type,
        content: input.content,
        ttl: input.ttl,
        proxied: input.proxied ?? false,
      },
    );
  }

  async updateRecord(
    recordId: string,
    input: { content: string; ttl?: number },
  ): Promise<CloudflareDnsRecord> {
    return this.request<CloudflareDnsRecord>(
      'PATCH',
      `${CF_API_BASE}/zones/${this.zoneId}/dns_records/${recordId}`,
      input,
    );
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        method,
        headers: {
          authorization: `Bearer ${this.token}`,
          'content-type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });

      const text = await res.text();
      let parsed: CloudflareApiResponse<T>;
      try {
        parsed = JSON.parse(text) as CloudflareApiResponse<T>;
      } catch {
        throw new CloudflareError(`invalid JSON from cloudflare (status ${res.status})`, res.status);
      }

      if (!res.ok || !parsed.success) {
        const msg = parsed.errors?.[0]?.message ?? `cloudflare ${method} ${url} failed`;
        throw new CloudflareError(msg, res.status, parsed.errors ?? []);
      }
      return parsed.result;
    } finally {
      clearTimeout(timer);
    }
  }
}
