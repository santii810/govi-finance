import { TABLES } from "./config";
import { NocoDbClient } from "./nocodb";
import { isVisible, personaFilter } from "./persona";
import type { NocoRecord, Persona } from "./types";

export interface AccountRow {
  id: number;
  slug: string;
  label: string;
  banco: string;
  persona: string;
  estado: string;
}

export interface AccountDumpRow {
  id: number;
  nombreFichero: string;
  accountId: number | null;
  accountSlug: string | null;
  accountLabel: string | null;
  fechaPrimerRegistro: string | null;
  fechaUltimoRegistro: string | null;
  numRegistros: number;
  numInsertados: number;
  numOmitidos: number;
  importedAt: string | null;
}

export interface AccountImportStatus {
  slug: string;
  label: string;
  banco: string;
  persona: string;
  ultimoMovimiento: string | null;
  ultimaImportacion: string | null;
  pendingCount: number;
}

export interface ImportacionesPayload {
  accounts: AccountImportStatus[];
  dumps: AccountDumpRow[];
}

function readLinkId(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const id = Number((value as { Id?: unknown }).Id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function readNestedAccount(record: NocoRecord): { id: number | null; label: string | null; slug: string | null } {
  const nested = record.Account;
  if (!nested || typeof nested !== "object") {
    return { id: null, label: null, slug: null };
  }
  const row = nested as NocoRecord;
  return {
    id: readLinkId(row),
    label: row.Label ? String(row.Label) : null,
    slug: row.Slug ? String(row.Slug) : null,
  };
}

function parseAccount(record: NocoRecord): AccountRow {
  return {
    id: Number(record.Id),
    slug: String(record.Slug ?? ""),
    label: String(record.Label ?? record.Slug ?? ""),
    banco: String(record.Banco ?? ""),
    persona: String(record.Persona ?? ""),
    estado: String(record.Estado ?? "Active"),
  };
}

function parseDump(record: NocoRecord, accountsById: Map<number, AccountRow>): AccountDumpRow {
  const account = readNestedAccount(record);
  const accountRow = account.id ? accountsById.get(account.id) : undefined;
  return {
    id: Number(record.Id),
    nombreFichero: String(record.NombreFichero ?? ""),
    accountId: account.id,
    accountSlug: account.slug ?? accountRow?.slug ?? null,
    accountLabel: account.label ?? accountRow?.label ?? null,
    fechaPrimerRegistro: record.FechaPrimerRegistro ? String(record.FechaPrimerRegistro).slice(0, 10) : null,
    fechaUltimoRegistro: record.FechaUltimoRegistro ? String(record.FechaUltimoRegistro).slice(0, 10) : null,
    numRegistros: Number(record.NumRegistros ?? 0),
    numInsertados: Number(record.NumInsertados ?? 0),
    numOmitidos: Number(record.NumOmitidos ?? 0),
    importedAt: record.CreatedAt ? String(record.CreatedAt) : null,
  };
}

export async function loadImportaciones(
  client: NocoDbClient,
  userPersona: Persona,
): Promise<ImportacionesPayload> {
  const [accountRecords, dumpRecords, pendingRecords] = await Promise.all([
    client.listRecords(TABLES.accounts, {
      where: "(Estado,eq,Active)",
      fields: ["Id", "Slug", "Label", "Banco", "Persona", "Estado"],
      sort: "Label",
    }),
    client.listRecords(TABLES.accountDumps, {
      fields: [
        "Id",
        "NombreFichero",
        "FechaPrimerRegistro",
        "FechaUltimoRegistro",
        "NumRegistros",
        "NumInsertados",
        "NumOmitidos",
        "CreatedAt",
        "Account",
      ],
      sort: "-CreatedAt",
      limit: 200,
    }),
    client.listRecords(TABLES.automaticActions, {
      where: `(Estado,eq,pending)~and${personaFilter(userPersona)}`,
      fields: ["Id", "Metadatos"],
    }),
  ]);

  const accounts = accountRecords
    .map(parseAccount)
    .filter((account) => isVisible(account.persona, userPersona));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const dumps = dumpRecords.map((record) => parseDump(record, accountsById));

  const pendingBySlug = new Map<string, number>();
  for (const record of pendingRecords) {
    const meta = record.Metadatos;
    const slug =
      meta && typeof meta === "object" && !Array.isArray(meta)
        ? String((meta as { account_id?: unknown }).account_id ?? "").trim()
        : "";
    if (!slug) continue;
    pendingBySlug.set(slug, (pendingBySlug.get(slug) ?? 0) + 1);
  }

  const dumpsByAccountId = new Map<number, AccountDumpRow[]>();
  for (const dump of dumps) {
    if (!dump.accountId) continue;
    const bucket = dumpsByAccountId.get(dump.accountId);
    if (bucket) bucket.push(dump);
    else dumpsByAccountId.set(dump.accountId, [dump]);
  }

  const accountStatuses: AccountImportStatus[] = accounts.map((account) => {
    const accountDumps = dumpsByAccountId.get(account.id) ?? [];
    const ultimoMovimiento = accountDumps.reduce<string | null>((max, dump) => {
      if (!dump.fechaUltimoRegistro) return max;
      if (!max || dump.fechaUltimoRegistro > max) return dump.fechaUltimoRegistro;
      return max;
    }, null);
    const ultimaImportacion = accountDumps.reduce<string | null>((max, dump) => {
      if (!dump.importedAt) return max;
      if (!max || dump.importedAt > max) return dump.importedAt;
      return max;
    }, null);

    return {
      slug: account.slug,
      label: account.label,
      banco: account.banco,
      persona: account.persona,
      ultimoMovimiento,
      ultimaImportacion,
      pendingCount: pendingBySlug.get(account.slug) ?? 0,
    };
  });

  return {
    accounts: accountStatuses,
    dumps: dumps.filter((dump) => dump.accountId && accountsById.has(dump.accountId)),
  };
}
