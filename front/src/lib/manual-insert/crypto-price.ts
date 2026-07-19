const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur";

export interface BtcPrice {
  precioEur: number;
  fecha: string;
}

/**
 * Cotización BTC/EUR spot (CoinGecko, sin API key). Se usa para convertir
 * unidades de BTC a euros en el momento de guardar un snapshot de Patrimonio.
 */
export async function fetchBtcEurPrice(): Promise<BtcPrice> {
  let res: Response;
  try {
    res = await fetch(COINGECKO_URL, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Error("No se pudo consultar la cotización de BTC (red)");
  }
  if (!res.ok) {
    throw new Error(`No se pudo consultar la cotización de BTC (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { bitcoin?: { eur?: number } };
  const precioEur = json.bitcoin?.eur;
  if (typeof precioEur !== "number" || !Number.isFinite(precioEur) || precioEur <= 0) {
    throw new Error("Cotización de BTC no válida");
  }
  const fecha = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return { precioEur, fecha };
}
