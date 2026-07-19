import { TABLES } from "../config";
import { ensureSelectOptions } from "../ensure-select-options";
import { PATRIMONIO_FIELDS } from "../table-fields";
import { parseSelectOptions, selectOptionsList, sortOptionsAlpha } from "../table-select-options";
import type { NocoDbClient } from "../nocodb";
import type { Persona } from "../types";
import {
  buildPatrimonioDetalle,
  computeStoredPatrimonioValor,
  isHipotecaTipo,
  isInmobiliarioTipo,
  parseDetallePatrimonio,
  parsePorcentajeTitularidad,
  usesTitularidad,
} from "../patrimonio-helpers";
import {
  expandPlantillaRows,
  type GastosPlantillaSummary,
} from "./gastos-templates";
import {
  buildPatrimonioRecord,
  buildRecordsFromRows,
  tableIdForInsert,
  type PatrimonioComputed,
} from "./build-records";
import { fetchBtcEurPrice } from "./crypto-price";
import type { NocoRecord } from "../types";
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
  isPatrimonioRowValid,
  usesUnidades,
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

function mergeTextFieldSuggestions(selectValues: string[], distinctValues: string[]): string[] {
  return sortOptionsAlpha(new Set([...selectValues, ...distinctValues]));
}

export function parseDetalle(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function loadPatrimonioPropiedades(client: NocoDbClient): Promise<string[]> {
  const raw = await client.listRecords(TABLES.patrimonio, { fields: ["Detalle"] });
  const set = new Set<string>();
  for (const record of raw) {
    const detalle = parseDetalle(record.Detalle);
    const propiedad = detalle && typeof detalle.propiedad === "string" ? detalle.propiedad.trim() : "";
    if (propiedad) set.add(propiedad);
  }
  return sortOptionsAlpha(set);
}

export async function loadManualInsertOptions(client: NocoDbClient): Promise<ManualInsertOptions> {
  const [
    gastosMeta,
    ingresosMeta,
    inversionesMeta,
    patrimonioMeta,
    entidadInversiones,
    entidadPatrimonio,
    propiedadesPatrimonio,
  ] = await Promise.all([
    client.getTableMeta(TABLES.gastos),
    client.getTableMeta(TABLES.ingresos),
    client.getTableMeta(TABLES.inversiones),
    client.getTableMeta(TABLES.patrimonio),
    client.distinctFieldValues(TABLES.inversiones, "Entidad"),
    client.distinctFieldValues(TABLES.patrimonio, "Entidad"),
    loadPatrimonioPropiedades(client),
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
    entidadInversiones: mergeTextFieldSuggestions(
      selectOptionsList(inversionesOptions, "Entidad"),
      entidadInversiones,
    ),
    tipoPatrimonio: sortOptionsAlpha(
      new Set([...selectOptionsList(patrimonioOptions, "Tipo"), "Hipoteca"]),
    ),
    entidadPatrimonio: mergeTextFieldSuggestions(
      selectOptionsList(patrimonioOptions, "Entidad"),
      entidadPatrimonio,
    ),
    propiedadesPatrimonio,
    persona: sortOptionsAlpha(["Santi", "Sandra", "Común"]) as PersonaValue[],
  };
}

export interface PatrimonioTemplateRow {
  entidad: string;
  nombre: string;
  valor: string;
  tipo: string;
  persona: PersonaValue | "";
  unidades: string;
  propiedad: string;
  porcentaje: string;
}

export async function loadGastosPlantillas(
  client: NocoDbClient,
): Promise<GastosPlantillaSummary[]> {
  const raw = await client.listRecords(TABLES.gastosPlantillas, { sort: "Orden" });
  const active = raw.filter((row) => row.Activa !== false);
  const groups = new Map<string, GastosPlantillaSummary & { description?: string }>();

  for (const row of active) {
    const id = String(row.Plantilla ?? "").trim();
    if (!id) continue;
    const existing = groups.get(id);
    if (existing) {
      existing.itemCount += 1;
      continue;
    }
    groups.set(id, {
      id,
      name: String(row.Nombre ?? id).trim() || id,
      description: String(row.Descripcion ?? "").trim() || undefined,
      itemCount: 1,
    });
  }

  return [...groups.values()].map(({ id, name, description, itemCount }) => ({
    id,
    name,
    description,
    itemCount,
  }));
}

export async function expandGastosPlantilla(
  client: NocoDbClient,
  plantillaId: string,
  month: string,
): Promise<GastosRowInput[]> {
  const raw = await client.listRecords(TABLES.gastosPlantillas, {
    where: `(Plantilla,eq,${plantillaId})`,
    sort: "Orden",
  });

  const items = raw
    .filter((row) => row.Activa !== false)
    .map((row) => ({
      dayOfMonth: Number(row.DiaMes),
      cantidad: String(row.Cantidad ?? ""),
      destino: String(row.Destino ?? ""),
      fuente: String(row.Fuente ?? ""),
      persona: String(row.Persona ?? "") as PersonaValue,
      categoria: String(row.Categoria ?? ""),
    }))
    .filter((item) => item.dayOfMonth >= 1 && item.cantidad && item.persona);

  return expandPlantillaRows(items, month);
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

  const rows = raw
    .map((r) => {
      const detalleRaw = parseDetalle(r.Detalle);
      const detalle = parseDetallePatrimonio(r.Detalle);
      const unidades =
        detalleRaw && typeof detalleRaw.unidades === "number" ? String(detalleRaw.unidades) : "";
      const propiedad = detalle.propiedad ?? "";
      const storedValor = Number(r.Valor ?? 0);
      let tipo = String(r.Tipo ?? "");
      let valor = "";
      const porcentaje = detalle.porcentaje != null ? String(detalle.porcentaje) : "";

      if (unidades) {
        valor = "";
      } else if (detalle.valorTotal != null) {
        valor = String(detalle.valorTotal);
      } else if (isInmobiliarioTipo(tipo) && storedValor < 0) {
        tipo = "Hipoteca";
        valor = String(Math.abs(storedValor));
      } else if (isHipotecaTipo(tipo)) {
        valor = String(Math.abs(storedValor));
      } else {
        valor = String(r.Valor ?? "");
      }

      return {
        entidad: String(r.Entidad ?? ""),
        nombre: String(r.Nombre ?? ""),
        valor,
        tipo,
        persona: (String(r.Persona ?? "") as PersonaValue) || "",
        unidades,
        propiedad,
        porcentaje,
      };
    })
    .sort((a, b) => {
      const byEntidad = a.entidad.localeCompare(b.entidad, "es");
      if (byEntidad !== 0) return byEntidad;
      return a.nombre.localeCompare(b.nombre, "es");
    });

  return {
    fecha: bounds.max.slice(0, 10),
    rows,
  };
}

async function getSelectOptions(client: NocoDbClient, table: InsertTable) {
  const tableId = tableIdForInsert(table);
  const meta = await client.getTableMeta(tableId);
  return parseSelectOptions(meta.columns ?? []);
}

async function ensureManualInsertSelectOptions(
  client: NocoDbClient,
  table: InsertTable,
  payload:
    | { rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[] }
    | { fecha: string; defaultPersona: PersonaValue | ""; rows: PatrimonioRowInput[] },
): Promise<void> {
  const tableId = tableIdForInsert(table);

  if (table === "Patrimonio") {
    const { rows } = payload as { rows: PatrimonioRowInput[] };
    const tipos = rows.map((r) => r.tipo.trim()).filter(Boolean);
    const entidades = rows.map((r) => r.entidad.trim()).filter(Boolean);
    if (tipos.length > 0) await ensureSelectOptions(client, tableId, "Tipo", tipos);
    if (entidades.length > 0) await ensureSelectOptions(client, tableId, "Entidad", entidades);
    return;
  }

  const { rows } = payload as {
    rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[];
  };

  if (table === "Gastos") {
    const categorias = (rows as GastosRowInput[]).map((r) => r.categoria.trim()).filter(Boolean);
    if (categorias.length > 0) {
      await ensureSelectOptions(client, tableId, "Categoría", categorias);
    }
    return;
  }

  if (table === "Ingresos") {
    const categorias = (rows as IngresosRowInput[]).map((r) => r.categoria.trim()).filter(Boolean);
    const origenes = (rows as IngresosRowInput[]).map((r) => r.origen.trim()).filter(Boolean);
    if (categorias.length > 0) {
      await ensureSelectOptions(client, tableId, "Categoría", categorias);
    }
    if (origenes.length > 0) {
      await ensureSelectOptions(client, tableId, "Origen", origenes);
    }
    return;
  }

  const tipos = (rows as InversionesRowInput[]).map((r) => r.tipo.trim()).filter(Boolean);
  const entidades = (rows as InversionesRowInput[]).map((r) => r.entidad.trim()).filter(Boolean);
  if (tipos.length > 0) await ensureSelectOptions(client, tableId, "Tipo", tipos);
  if (entidades.length > 0) await ensureSelectOptions(client, tableId, "Entidad", entidades);
}

export async function insertManualRecords(
  client: NocoDbClient,
  table: InsertTable,
  payload:
    | { rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[] }
    | { fecha: string; defaultPersona: PersonaValue | ""; rows: PatrimonioRowInput[] },
): Promise<{ inserted: number }> {
  const tableId = tableIdForInsert(table);
  await ensureManualInsertSelectOptions(client, table, payload);
  const options = await getSelectOptions(client, table);

  if (table === "Patrimonio") {
    const { fecha, defaultPersona, rows } = payload as {
      fecha: string;
      defaultPersona: PersonaValue | "";
      rows: PatrimonioRowInput[];
    };
    const { fechaError } = validatePatrimonioSnapshot({
      fecha,
      defaultPersona,
      rows,
    });
    if (fechaError) {
      throw new ManualInsertError(fechaError, 422);
    }
    const validCount = countValidPatrimonioRows({ fecha, defaultPersona, rows });
    if (validCount === 0) {
      throw new ManualInsertError("No hay filas válidas para guardar", 422);
    }

    // Solo inserta filas válidas; las incompletas quedan en el formulario del cliente.
    const validRows = rows.filter((row) => isPatrimonioRowValid(row, defaultPersona));

    // La cotización de BTC se pide una sola vez por snapshot, solo si hace falta.
    let btc: { precioEur: number; fecha: string } | null = null;
    if (validRows.some((row) => usesUnidades(row))) {
      try {
        btc = await fetchBtcEurPrice();
      } catch (err) {
        throw new ManualInsertError(
          err instanceof Error ? err.message : "No se pudo obtener la cotización de BTC",
          502,
        );
      }
    }

    const records: NocoRecord[] = [];
    for (const row of validRows) {
      let computed: PatrimonioComputed | undefined;
      if (usesUnidades(row) && btc) {
        const unidades = Number((row.unidades ?? "").replace(",", "."));
        computed = {
          valor: Number((unidades * btc.precioEur).toFixed(2)),
          detalle: {
            unidades,
            activo: "BTC",
            precio_eur: btc.precioEur,
            fecha_precio: btc.fecha,
          },
        };
      } else if (usesTitularidad(row.tipo) || isHipotecaTipo(row.tipo)) {
        const valorTotal = Number(row.valor.replace(",", "."));
        const porcentaje = parsePorcentajeTitularidad(row.porcentaje);
        computed = {
          valor: computeStoredPatrimonioValor(valorTotal, porcentaje, row.tipo),
          detalle: buildPatrimonioDetalle({
            valorTotal,
            porcentaje,
            propiedad: row.propiedad,
          }),
        };
      }
      records.push(buildPatrimonioRecord(fecha, row, defaultPersona, options, computed));
    }

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
