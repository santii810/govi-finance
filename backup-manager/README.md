# Backup manager

Servicio Docker que exporta **toda la base Gastos de NocoDB** a CSV legible, lo comprime en ZIP (DEFLATE nivel 9) y lo sube a Google Drive u OneDrive.

## Contenido del backup

Cada ZIP incluye:

```
manifest.json          # resumen: fecha, tablas, filas
tables/
  Gastos.csv
  Ingresos.csv
  ...
meta/
  tables.json          # metadatos NocoDB de la base
  Gastos.json          # esquema de columnas por tabla
  ...
```

- CSV con **UTF-8 BOM** (se abre bien en Excel).
- Campos JSON (p. ej. `Metadatos`) serializados como texto JSON.
- Incluye **todas** las tablas de la base, incluida `Users` (contiene `PasswordHash`).

## Uso rápido

1. Añade las variables de `backup-manager/.env.example` a `infra/.env`.
2. Deja `BACKUP_PROVIDER=none` para probar solo export local.
3. Levanta el servicio:

```bash
docker compose --env-file infra/.env up -d backup-manager
```

4. Ejecuta un backup manual:

```bash
docker compose --env-file infra/.env run --rm backup-manager python -m backup_manager run
```

Los ZIP quedan en el volumen `backup_staging` (`/data/backups` dentro del contenedor).

## Programación

Por defecto el contenedor ejecuta `scheduler` con cron `0 3 * * *` (03:00, zona `BACKUP_TIMEZONE`).

Variables:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BACKUP_PROVIDER` | `none` | `none`, `google_drive`, `onedrive` |
| `BACKUP_SCHEDULE` | `0 3 * * *` | Expresión cron |
| `BACKUP_TIMEZONE` | `Europe/Madrid` | Zona horaria del cron |
| `BACKUP_LOCAL_RETENTION` | `7` | ZIPs locales a conservar |
| `NOCODB_BASE_ID` | `pnf173not1wvzg0` | Base Gastos |

Reutiliza `NOCODB_URL` y `NOCODB_API_TOKEN` del compose raíz.

## Telegram (backups automáticos)

Si `TELEGRAM_BOT_TOKEN` y `TELEGRAM_OWNER_USER_ID` están definidos, tras cada backup **programado** exitoso el servicio envía el ZIP a ese chat (solo Santi).

- Límite: 50 MB. Si el ZIP es mayor, envía un aviso de texto.
- Los backups manuales (web/CLI) no se envían.
- Un fallo de Telegram no marca el backup como fallido.

## Google Drive

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Activa **Google Drive API**.
3. Crea credenciales **OAuth 2.0** (tipo *Desktop* o *Web* con redirect `http://localhost`).
4. Obtén un **refresh token** (una sola vez):

```bash
pip install httpx
python scripts/oauth_google_drive.py
```

5. Crea una carpeta en Drive y copia su ID (parte final de la URL).
6. En `infra/.env`:

```
BACKUP_PROVIDER=google_drive
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=...
```

## OneDrive

1. Registra una app en [Azure Portal](https://portal.azure.com/) → App registrations.
2. Permisos delegados: `Files.ReadWrite`, `offline_access`.
3. Obtén refresh token:

```bash
pip install httpx
python scripts/oauth_onedrive.py
```

4. En `infra/.env`:

```
BACKUP_PROVIDER=onedrive
ONEDRIVE_CLIENT_ID=...
ONEDRIVE_CLIENT_SECRET=...
ONEDRIVE_REFRESH_TOKEN=...
ONEDRIVE_FOLDER_PATH=/Finanzas/backups
```

La carpeta se crea automáticamente en OneDrive si no existe.

## Desarrollo local

```bash
cd backup-manager
pip install -e .
export NOCODB_URL=http://localhost:23456
export NOCODB_API_TOKEN=...
export BACKUP_STAGING_DIR=/tmp/finanzas-backups
python -m backup_manager run
```
