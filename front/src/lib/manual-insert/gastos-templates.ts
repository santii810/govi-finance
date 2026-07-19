import type { GastosRowInput, PersonaValue } from "./types";

export interface GastosPlantillaSummary {
  id: string;
  name: string;
  description?: string;
  itemCount: number;
}

export function currentMonthValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function dateFromMonthDay(month: string, dayOfMonth: number): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const day = Math.min(Math.max(1, dayOfMonth), lastDay);
  return `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
}

export function expandPlantillaRows(
  items: Array<{
    dayOfMonth: number;
    cantidad: string;
    destino: string;
    fuente: string;
    persona: PersonaValue;
    categoria: string;
  }>,
  month: string,
): GastosRowInput[] {
  return items.map((item) => ({
    fecha: dateFromMonthDay(month, item.dayOfMonth),
    cantidad: item.cantidad,
    destino: item.destino,
    fuente: item.fuente,
    persona: item.persona,
    categoria: item.categoria,
  }));
}
