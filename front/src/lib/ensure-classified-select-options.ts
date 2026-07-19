import { TABLES } from "./config";
import type { ClassifiedPending } from "./import-rules/types";
import { ensureSelectOptions } from "./ensure-select-options";
import type { NocoDbClient } from "./nocodb";
import { defaultIngresosOrigen } from "./pending-ingresos-origen";

function destinoTableId(tabla: NonNullable<ClassifiedPending["tablaDestino"]>): string {
  if (tabla === "Gastos") return TABLES.gastos;
  if (tabla === "Inversiones") return TABLES.inversiones;
  return TABLES.ingresos;
}

/** Registra en NocoDB las opciones SingleSelect que falten antes de insertar. */
export async function ensureClassifiedPendingSelectOptions(
  client: NocoDbClient,
  item: ClassifiedPending,
): Promise<void> {
  if (!item.tablaDestino || item.ignorar) return;

  const tableId = destinoTableId(item.tablaDestino);

  if (item.tablaDestino === "Gastos" || item.tablaDestino === "Ingresos") {
    const categoria = item.categoria?.trim();
    if (categoria) {
      await ensureSelectOptions(client, tableId, "Categoría", [categoria]);
    }
  }

  if (item.tablaDestino === "Ingresos") {
    const origenValues = [
      item.origen?.trim(),
      defaultIngresosOrigen(item),
      item.banco?.trim(),
    ].filter((v): v is string => Boolean(v));
    if (origenValues.length > 0) {
      await ensureSelectOptions(client, tableId, "Origen", origenValues);
    }
  }

  if (item.tablaDestino === "Inversiones") {
    const tipo = item.tipo?.trim();
    if (tipo) await ensureSelectOptions(client, tableId, "Tipo", [tipo]);
    const entidad = item.entidad?.trim() || item.banco?.trim();
    if (entidad) await ensureSelectOptions(client, tableId, "Entidad", [entidad]);
  }
}
