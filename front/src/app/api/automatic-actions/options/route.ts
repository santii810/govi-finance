import { NextResponse } from "next/server";
import { getAppConfig, TABLES } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";
import { parseSelectOptions } from "@/lib/table-select-options";

export interface FieldOptions {
  categoriaGastos: string[];
  categoriaIngresos: string[];
  tipoInversiones: string[];
  entidadInversiones: string[];
  persona: string[];
  tablaDestino: string[];
}

export async function GET() {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);

    const [gastosMeta, ingresosMeta, inversionesMeta] = await Promise.all([
      client.getTableMeta(TABLES.gastos),
      client.getTableMeta(TABLES.ingresos),
      client.getTableMeta(TABLES.inversiones),
    ]);

    const gastosOptions = parseSelectOptions(gastosMeta.columns ?? []);
    const ingresosOptions = parseSelectOptions(ingresosMeta.columns ?? []);
    const inversionesOptions = parseSelectOptions(inversionesMeta.columns ?? []);

    const options: FieldOptions = {
      categoriaGastos: Array.from(gastosOptions["Categoría"] ?? []),
      categoriaIngresos: Array.from(ingresosOptions["Categoría"] ?? []),
      tipoInversiones: Array.from(inversionesOptions["Tipo"] ?? []),
      entidadInversiones: Array.from(inversionesOptions["Entidad"] ?? []),
      persona: ["Santi", "Sandra", "Común"],
      tablaDestino: ["Gastos", "Ingresos", "Inversiones"],
    };

    return NextResponse.json(options);
  } catch (err) {
    console.error("Options error:", err);
    return NextResponse.json({ error: "Error al cargar opciones" }, { status: 500 });
  }
}
