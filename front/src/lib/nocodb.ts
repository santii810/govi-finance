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

export interface ListRecordsOptions {
  where?: string;
  fields?: string[];
  dateFrom?: { field: string; iso: string };
  dateTo?: { field: string; iso: string };
  limit?: number;
  offset?: number;
  sort?: string;
}

interface RecordsPage {
  list: NocoRecord[];
  pageInfo: { isLastPage: boolean; totalRows: number };
}

function buildWhere(options: ListRecordsOptions): string | undefined {
  const parts: string[] = [];
  if (options.where) parts.push(options.where);
  if (options.dateFrom) {
    parts.push(`(${options.dateFrom.field},ge,exactDate,${options.dateFrom.iso})`);
  }
  if (options.dateTo) {
    parts.push(`(${options.dateTo.field},le,exactDate,${options.dateTo.iso})`);
  }
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return parts.join("~and");
}

function normalizeListOptions(
  arg?: string | ListRecordsOptions,
  legacyFields?: string[],
): ListRecordsOptions {
  if (typeof arg === "string") {
    return { where: arg, fields: legacyFields };
  }
  return arg ?? {};
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

  private async fetchRecordsPage(
    tableId: string,
    options: ListRecordsOptions,
  ): Promise<RecordsPage> {
    const pageSize = options.limit ?? 500;
    const offset = options.offset ?? 0;
    const where = buildWhere(options);

    const params = new URLSearchParams({
      limit: String(pageSize),
      offset: String(offset),
    });
    if (where) params.set("where", where);
    if (options.fields?.length) params.set("fields", options.fields.join(","));
    if (options.sort) params.set("sort", options.sort);

    return this.request<RecordsPage>(`/api/v2/tables/${tableId}/records?${params}`);
  }

  async countRecords(tableId: string, where?: string): Promise<number> {
    const data = await this.fetchRecordsPage(tableId, {
      where,
      fields: ["Id"],
      limit: 1,
    });
    return data.pageInfo.totalRows;
  }

  /** Años disponibles con dos consultas (min/max fecha), sin cargar toda la tabla. */
  async availableYears(
    tableId: string,
    dateField: string,
    where?: string,
  ): Promise<{ min: string | null; max: string | null }> {
    const base = { where, fields: [dateField], limit: 1 };
    const [oldest, newest] = await Promise.all([
      this.fetchRecordsPage(tableId, { ...base, sort: dateField }),
      this.fetchRecordsPage(tableId, { ...base, sort: `-${dateField}` }),
    ]);

    const min = oldest.list[0]?.[dateField];
    const max = newest.list[0]?.[dateField];
    return {
      min: min ? String(min).slice(0, 10) : null,
      max: max ? String(max).slice(0, 10) : null,
    };
  }

  async listRecords(
    tableId: string,
    arg?: string | ListRecordsOptions,
    legacyFields?: string[],
  ): Promise<NocoRecord[]> {
    const options = normalizeListOptions(arg, legacyFields);

    if (options.limit !== undefined || options.offset !== undefined) {
      const page = await this.fetchRecordsPage(tableId, options);
      return page.list;
    }

    const pageSize = 500;
    const first = await this.fetchRecordsPage(tableId, { ...options, limit: pageSize, offset: 0 });
    const records = [...first.list];

    if (first.pageInfo.isLastPage || first.list.length === 0) {
      return records;
    }

    const total = first.pageInfo.totalRows;
    const offsets: number[] = [];
    for (let offset = pageSize; offset < total; offset += pageSize) {
      offsets.push(offset);
    }

    const pages = await Promise.all(
      offsets.map((offset) =>
        this.fetchRecordsPage(tableId, { ...options, limit: pageSize, offset }),
      ),
    );

    for (const page of pages) {
      records.push(...page.list);
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

  async getTableMeta(tableId: string): Promise<{ columns?: { title: string; colOptions?: { options?: { title?: string }[] } }[] }> {
    return this.request(`/api/v2/meta/tables/${tableId}`);
  }

  async getRecord(tableId: string, id: string): Promise<NocoRecord | null> {
    const data = await this.request<{ list: NocoRecord[] }>(
      `/api/v2/tables/${tableId}/records?where=(Id,eq,${id})&limit=1`,
    );
    return data.list[0] ?? null;
  }

  async createRecord(tableId: string, fields: NocoRecord): Promise<NocoRecord> {
    return this.request(`/api/v2/tables/${tableId}/records`, {
      method: "POST",
      body: JSON.stringify(fields),
    });
  }

  async createRecords(tableId: string, records: NocoRecord[]): Promise<NocoRecord[]> {
    if (records.length === 0) return [];
    const data = await this.request<NocoRecord | NocoRecord[]>(
      `/api/v2/tables/${tableId}/records`,
      {
        method: "POST",
        body: JSON.stringify(records),
      },
    );
    return Array.isArray(data) ? data : [data];
  }

  async updateRecord(tableId: string, id: string, fields: NocoRecord): Promise<void> {
    await this.request(`/api/v2/tables/${tableId}/records`, {
      method: "PATCH",
      body: JSON.stringify({ Id: id, ...fields }),
    });
  }

  async deleteRecord(tableId: string, id: string): Promise<void> {
    await this.request(`/api/v2/tables/${tableId}/records`, {
      method: "DELETE",
      body: JSON.stringify([{ Id: id }]),
    });
  }
}

export function yearsFromDateBounds(
  minIso: string | null,
  maxIso: string | null,
  timezone: string,
  fallbackYear: string,
): string[] {
  if (!minIso || !maxIso) return [fallbackYear];

  const minDate = new Date(`${minIso.slice(0, 10)}T12:00:00`);
  const maxDate = new Date(`${maxIso.slice(0, 10)}T12:00:00`);
  const minYear = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric" }).format(minDate),
  );
  const maxYear = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric" }).format(maxDate),
  );

  const years: string[] = [];
  for (let y = minYear; y <= maxYear; y += 1) {
    years.push(String(y));
  }
  return years.length > 0 ? years : [fallbackYear];
}
