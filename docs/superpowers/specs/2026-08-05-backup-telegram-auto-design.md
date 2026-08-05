# Diseño: Envío automático de backup por Telegram

## Estado

Aprobado e implementado (2026-08-05).

## Problema

Tras un backup programado, el ZIP queda en el volumen local (y opcionalmente en Drive/OneDrive) o se descarga desde la web. No hay entrega automática al móvil. Se quiere recibir el archivo por Telegram sin pedir nada a mano.

## Decisión

| Aspecto | Decisión |
|---------|----------|
| Quién envía | **backup-manager** (API Bot de Telegram vía HTTP) |
| Destinatario | Solo **Santi** (`TELEGRAM_OWNER_USER_ID`) |
| Cuándo | Solo backups con `source = auto` (programador) y **éxito** |
| Manuales | Web (`source=manual`) y CLI: **no** envían por Telegram |
| Sin cambios | Si el programador omite la copia (sin cambios desde el último fingerprint): **sin mensaje** |
| Límite | **50 MB** (límite Bot API de Telegram) |
| Si cabe | Adjuntar el ZIP + texto corto (fecha, tamaño, “backup automático”) |
| Si no cabe | Solo aviso de tamaño excesivo; el backup sigue disponible en web / nube |
| Fallo de envío | El backup **no** se marca fallido; error en logs + mensaje de aviso (si Telegram acepta el texto) |
| Web / bot | Sin cambios de UI ni comandos nuevos |

## Flujo

```
Programador (cron)
  → ¿hay cambios? no → fin (sin Telegram)
  → run_backup(source=auto) OK
  → ¿Telegram configurado? no → log + fin
  → ¿size ≤ 50 MB?
        sí → sendDocument(ZIP) a OWNER
        no → sendMessage(aviso de límite)
  → si send falla → log + sendMessage(aviso de fallo de envío) si es posible
```

Los backups disparados por `POST /backup` (web) usan `source=manual` y **no** entran en este flujo.

## Configuración

Reutilizar variables ya usadas por el bot:

| Variable | Uso |
|----------|-----|
| `TELEGRAM_BOT_TOKEN` | Token del mismo bot Finanzas |
| `TELEGRAM_OWNER_USER_ID` | Chat id de Santi |

Si falta token o owner id: no intentar envío; log informativo; el backup local/nube sigue igual.

Añadir ambas al servicio `backup-manager` en `infra/docker-compose.yml` (desde `infra/.env`).

Constante sugerida: `TELEGRAM_MAX_DOCUMENT_BYTES = 50 * 1024 * 1024`.

## Mensajes (texto orientativo)

**Éxito con adjunto**

```
Backup automático listo.
fecha · tamaño
```

**Demasiado grande**

```
Backup automático listo, pero el ZIP supera 50 MB (X MB).
No se puede enviar por Telegram. Descárgalo desde la web (o Drive/OneDrive si está configurado).
```

**Fallo de envío del archivo**

```
Backup automático generado, pero no pude enviarte el archivo por Telegram.
Está disponible en la web.
```

## Alcance fuera

- No enviar a Sandra.
- No comando `/backup` ni botones en el bot.
- No cambiar retención local, fingerprint ni proveedores cloud.
- No implementar Bot API local (límite 2 GB); solo el tope de 50 MB de la API pública.

## Criterios de aceptación

1. Tras un backup programado exitoso con ZIP ≤ 50 MB, Santi recibe el documento en Telegram.
2. Si el ZIP > 50 MB, recibe solo el aviso de límite; el archivo permanece en staging (y cloud si aplica).
3. Un backup manual desde la web no provoca envío por Telegram.
4. Sin token/owner configurados, el backup termina OK sin intentar Telegram.
5. Un error de la API de Telegram no hace fallar el job de backup.
