# Muestras de exports bancarios (gitignored)

Los exports reales **no se commitean** — contienen datos personales.

Revolut y MyInvestor entregan **Excel** (a veces con extensión `.csv`). El worker los detecta por contenido.

## Trade Republic — Santi

Copia tu export aquí:

```
worker/samples/trade-republic-santi/exportacion-transaccion.csv
```

## Revolut — Santi

```
worker/samples/revolut-santi/
```

## MyInvestor — Santi

```
worker/samples/myinvestor-santi/
```

### Probar el análisis (sin insertar en NocoDB)

Desde la raíz del repo:

```bash
cd worker
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m worker analyze samples/trade-republic-santi/exportacion-transaccion.csv
```

El comando imprime un JSON de **preview** (cuenta detectada, fechas, conteos, ejemplos). No escribe en base de datos.
