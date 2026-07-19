import { NextResponse } from "next/server";
import { getAppConfig, TABLES } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";
import { parseSelectOptions, selectOptionsList, sortOptionsAlpha } from "@/lib/table-select-options";

export interface FieldOptions {
  categoriaGastos: string[];
  categoriaIngresos: string[];
  origenIngresos: string[];
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

    const [gastosMeta, ingresosMeta, inversionesMeta, entidadInversiones] = await Promise.all([
      client.getTableMeta(TABLES.gastos),
      client.getTableMeta(TABLES.ingresos),
      client.getTableMeta(TABLES.inversiones),
      client.distinctFieldValues(TABLES.inversiones, "Entidad"),
    ]);

    const gastosOptions = parseSelectOptions(gastosMeta.columns ?? []);
    const ingresosOptions = parseSelectOptions(ingresosMeta.columns ?? []);
    const inversionesOptions = parseSelectOptions(inversionesMeta.columns ?? []);

    const options: FieldOptions = {
      categoriaGastos: selectOptionsList(gastosOptions, "Categoría"),
      categoriaIngresos: selectOptionsList(ingresosOptions, "Categoría"),
      origenIngresos: selectOptionsList(ingresosOptions, "Origen"),
      tipoInversiones: selectOptionsList(inversionesOptions, "Tipo"),
      entidadInversiones: sortOptionsAlpha(
        new Set([
          ...selectOptionsList(inversionesOptions, "Entidad"),
          ...entidadInversiones,
        ]),
      ),
      persona: sortOptionsAlpha(["Santi", "Sandra", "Común"]),
      tablaDestino: sortOptionsAlpha(["Gastos", "Ingresos", "Inversiones"]),
    };

    return NextResponse.json(options);
  } catch (err) {
    console.error("Options error:", err);
    return NextResponse.json({ error: "Error al cargar opciones" }, { status: 500 });
  }
}
