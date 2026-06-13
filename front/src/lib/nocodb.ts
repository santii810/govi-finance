import { TABLES } from "./config";
import type { NocoRecord } from "./types";

export class NocoDbError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "NocoDbError";
  }
}

export class NocoDbClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "xc-token": this.token,
        ...init?.headers,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new NocoDbError(body || res.statusText, res.status);
    }

    return res.json() as Promise<T>;
  }

  async listRecords(tableId: string, where?: string): Promise<NocoRecord[]> {
    const records: NocoRecord[] = [];
    let page = 1;
    const pageSize = 500;

    while (true) {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (where) params.set("where", where);

      const data = await this.request<{ list: NocoRecord[]; pageInfo: { isLastPage: boolean } }>(
        `/api/v2/tables/${tableId}/records?${params}`,
      );

      records.push(...data.list);
      if (data.pageInfo.isLastPage || data.list.length === 0) break;
      page += 1;
    }

    return records;
  }

  async findUserByUsername(username: string): Promise<NocoRecord | null> {
    const normalized = username.trim().toLowerCase();
    const data = await this.request<{ list: NocoRecord[] }>(
      `/api/v2/tables/${TABLES.users}/records?limit=100`,
    );
    return (
      data.list.find((row) => String(row.Username ?? "").toLowerCase() === normalized) ?? null
    );
  }
}
