import { TABLES } from "../config";
import { PATRIMONIO_FIELDS } from "../table-fields";
import { parseSelectOptions, selectOptionsList, sortOptionsAlpha } from "../table-select-options";
import type { NocoDbClient } from "../nocodb";
import type { Persona } from "../types";
import {
  buildPatrimonioRecords,
  buildRecordsFromRows,
  tableIdForInsert,
} from "./build-records";
import type {
  GastosRowInput,
  IngresosRowInput,
  InsertTable,
  InversionesRowInput,
  ManualInsertOptions,
  PatrimonioRowInput,
  PersonaValue,
} from "./types";
import {
  countValidPatrimonioRows,
  validateDate,
  validatePatrimonioSnapshot,
} from "./validation";

export class ManualInsertError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ManualInsertError";
  }
}

export async function loadManualInsertOptions(client: NocoDbClient): Promise<ManualInsertOptions> {
  const [gastosMeta, ingresosMeta, inversionesMeta, patrimonioMeta] = await Promise.all([
    client.getTableMeta(TABLES.gastos),
    client.getTableMeta(TABLES.ingresos),
    client.getTableMeta(TABLES.inversiones),
    client.getTableMeta(TABLES.patrimonio),
  ]);

  const gastosOptions = parseSelectOptions(gastosMeta.columns ?? []);
  const ingresosOptions = parseSelectOptions(ingresosMeta.columns ?? []);
  const inversionesOptions = parseSelectOptions(inversionesMeta.columns ?? []);
  const patrimonioOptions = parseSelectOptions(patrimonioMeta.columns ?? []);

  return {
    categoriaGastos: selectOptionsList(gastosOptions, "Categoría"),
    fuenteGastos: selectOptionsList(gastosOptions, "Fuente"),
    categoriaIngresos: selectOptionsList(ingresosOptions, "Categoría"),
    origenIngresos: selectOptionsList(ingresosOptions, "Origen"),
    tipoInversiones: selectOptionsList(inversionesOptions, "Tipo"),
    entidadInversiones: selectOptionsList(inversionesOptions, "Entidad"),
    tipoPatrimonio: selectOptionsList(patrimonioOptions, "Tipo"),
    entidadPatrimonio: selectOptionsList(patrimonioOptions, "Entidad"),
    persona: sortOptionsAlpha(["Santi", "Sandra", "Común"]) as PersonaValue[],
  };
}

export interface PatrimonioTemplateRow {
  entidad: string;
  nombre: string;
  valor: string;
  tipo: string;
  persona: PersonaValue | "";
}

export async function loadLastPatrimonioTemplate(
  client: NocoDbClient,
  persona: Persona,
): Promise<{ fecha: string; rows: PatrimonioTemplateRow[] } | null> {
  const where = `(Persona,in,${persona},Común)`;
  const bounds = await client.availableYears(TABLES.patrimonio, "Fecha", where);
  if (!bounds.max) return null;

  const raw = await client.listRecords(TABLES.patrimonio, {
    where: `(Fecha,eq,exactDate,${bounds.max.slice(0, 10)})~and${where}`,
    fields: [...PATRIMONIO_FIELDS, "Entidad"],
  });

  if (raw.length === 0) return null;

  return {
    fecha: bounds.max.slice(0, 10),
    rows: raw.map((r) => ({
      entidad: String(r.Entidad ?? ""),
      nombre: String(r.Nombre ?? ""),
      valor: String(r.Valor ?? ""),
      tipo: String(r.Tipo ?? ""),
      persona: (String(r.Persona ?? "") as PersonaValue) || "",
    })),
  };
}

async function getSelectOptions(client: NocoDbClient, table: InsertTable) {
  const tableId = tableIdForInsert(table);
  const meta = await client.getTableMeta(tableId);
  return parseSelectOptions(meta.columns ?? []);
}

export async function insertManualRecords(
  client: NocoDbClient,
  table: InsertTable,
  payload:
    | { rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[] }
    | { fecha: string; defaultPersona: PersonaValue | ""; rows: PatrimonioRowInput[] },
): Promise<{ inserted: number }> {
  const tableId = tableIdForInsert(table);
  const options = await getSelectOptions(client, table);

  if (table === "Patrimonio") {
    const { fecha, defaultPersona, rows } = payload as {
      fecha: string;
      defaultPersona: PersonaValue | "";
      rows: PatrimonioRowInput[];
    };
    const { fechaError, rowErrors } = validatePatrimonioSnapshot({
      fecha,
      defaultPersona,
      rows,
    });
    if (fechaError) {
      throw new ManualInsertError(fechaError, 422);
    }
    const invalidCount = rowErrors.filter((e) => Object.keys(e).length > 0).length;
    const validCount = countValidPatrimonioRows({ fecha, defaultPersona, rows });
    if (validCount === 0) {
      throw new ManualInsertError("No hay filas válidas para guardar", 422);
    }
    if (invalidCount > 0) {
      throw new ManualInsertError("Hay filas incompletas o con errores", 422);
    }

    const records = buildPatrimonioRecords(fecha, rows, defaultPersona, options);
    await client.createRecords(tableId, records);
    return { inserted: records.length };
  }

  const { rows } = payload as {
    rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[];
  };
  const records = buildRecordsFromRows(table, rows, options);
  if (records.length === 0) {
    throw new ManualInsertError("No hay filas válidas para guardar", 422);
  }

  const dateField = table === "Gastos" ? "Date" : "Fecha";
  for (const record of records) {
    const dateErr = validateDate(String(record[dateField] ?? ""));
    if (dateErr) {
      throw new ManualInsertError(dateErr, 422);
    }
  }

  await client.createRecords(tableId, records);
  return { inserted: records.length };
}
