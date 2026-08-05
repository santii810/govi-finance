# Backup automático por Telegram — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tras cada backup programado exitoso, el `backup-manager` envía el ZIP a Santi por Telegram (o un aviso si supera 50 MB).

**Architecture:** Tras `run_backup(..., source="auto")` con éxito, un módulo `telegram_notify` usa la Bot API (`sendDocument` / `sendMessage`) con `TELEGRAM_BOT_TOKEN` + `TELEGRAM_OWNER_USER_ID`. Los backups `manual` no notifican. Fallos de Telegram no marcan el backup como fallido.

**Tech Stack:** Python 3.11+, httpx (ya en backup-manager), pytest, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-05-backup-telegram-auto-design.md`

## Global Constraints

- Destinatario: solo Santi (`TELEGRAM_OWNER_USER_ID`)
- Solo `source == "auto"` y backup exitoso
- Límite documento: `50 * 1024 * 1024` bytes
- Sin token/owner: no enviar; log; backup OK
- Error Telegram: no falla el job; log + mensaje de aviso si es posible
- Sin cambios de UI web ni comandos del bot
- **Commits:** solo si el usuario lo pide explícitamente (no auto-commit)

## File map

| Archivo | Responsabilidad |
|---------|-----------------|
| `backup-manager/src/backup_manager/telegram_notify.py` | Cliente Bot API + lógica tamaño/mensajes |
| `backup-manager/src/backup_manager/config.py` | Campos token + owner id |
| `backup-manager/src/backup_manager/runner.py` | Hook post-backup auto |
| `backup-manager/tests/test_telegram_notify.py` | Unit tests helper |
| `backup-manager/tests/test_runner_telegram.py` | Tests hook auto vs manual |
| `backup-manager/pyproject.toml` | pytest opcional |
| `infra/docker-compose.yml` | Env vars en servicio backup-manager |
| `backup-manager/.env.example` | Documentar vars |
| `backup-manager/README.md` | Sección Telegram |

---

### Task 1: Helper `telegram_notify` (TDD)

**Files:**
- Create: `backup-manager/src/backup_manager/telegram_notify.py`
- Create: `backup-manager/tests/test_telegram_notify.py`
- Modify: `backup-manager/pyproject.toml` (dev deps + pytest ini)

**Interfaces:**
- Produces:
  - `TELEGRAM_MAX_DOCUMENT_BYTES: int = 50 * 1024 * 1024`
  - `def is_telegram_configured(token: str, owner_user_id: int | None) -> bool`
  - `def format_success_caption(archive_name: str, size_bytes: int) -> str`
  - `def format_too_large_message(archive_name: str, size_bytes: int) -> str`
  - `def format_send_failure_message(archive_name: str) -> str`
  - `async def notify_auto_backup(*, token: str, owner_user_id: int, archive_path: Path) -> None`
    - Si `size <= TELEGRAM_MAX_DOCUMENT_BYTES`: `sendDocument`
    - Si no: `sendMessage` demasiado grande
    - Si `sendDocument` falla: log + intentar `sendMessage` de fallo
    - Nunca lanza al caller (swallow + log); tests pueden inspeccionar llamadas HTTP

- [ ] **Step 1: Añadir pytest al proyecto**

En `backup-manager/pyproject.toml`, añadir:

```toml
[project.optional-dependencies]
dev = [
  "pytest>=8.0",
  "pytest-asyncio>=0.24",
  "respx>=0.21",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Instalar deps de test**

```bash
cd /home/santi/dockerPortatil/nocodb/backup-manager
pip install -e ".[dev]"
```

Expected: instalación OK.

- [ ] **Step 3: Escribir tests que fallen**

Crear `backup-manager/tests/test_telegram_notify.py`:

```python
from __future__ import annotations

from pathlib import Path

import httpx
import pytest
import respx

from backup_manager.telegram_notify import (
    TELEGRAM_MAX_DOCUMENT_BYTES,
    format_send_failure_message,
    format_success_caption,
    format_too_large_message,
    is_telegram_configured,
    notify_auto_backup,
)


def test_is_telegram_configured() -> None:
    assert is_telegram_configured("tok", 123) is True
    assert is_telegram_configured("", 123) is False
    assert is_telegram_configured("tok", None) is False


def test_format_messages_contain_size_and_name() -> None:
    caption = format_success_caption("gastos-auto-2026.zip", 1_500_000)
    assert "Backup automático listo" in caption
    assert "gastos-auto-2026.zip" in caption or "MB" in caption

    big = format_too_large_message("big.zip", TELEGRAM_MAX_DOCUMENT_BYTES + 1)
    assert "50 MB" in big
    assert "Telegram" in big

    fail = format_send_failure_message("x.zip")
    assert "no pude enviarte" in fail.lower() or "Telegram" in fail


@pytest.mark.asyncio
@respx.mock
async def test_notify_sends_document_when_under_limit(tmp_path: Path) -> None:
    archive = tmp_path / "small-auto.zip"
    archive.write_bytes(b"zip-bytes")
    route = respx.post(
        "https://api.telegram.org/botTOKEN/sendDocument"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))

    await notify_auto_backup(
        token="TOKEN",
        owner_user_id=42,
        archive_path=archive,
    )

    assert route.called
    request = route.calls.last.request
    assert b"chat_id" in request.content or "chat_id" in str(request.url)


@pytest.mark.asyncio
@respx.mock
async def test_notify_sends_message_when_over_limit(tmp_path: Path) -> None:
    archive = tmp_path / "huge-auto.zip"
    # No hace falta un archivo real de 50MB+: stub del tamaño vía monkeypatch en el test
    archive.write_bytes(b"x")

    class FakeStat:
        st_size = TELEGRAM_MAX_DOCUMENT_BYTES + 10

    original_stat = Path.stat

    def fake_stat(self: Path, *args: object, **kwargs: object):  # noqa: ANN001
        if self == archive:
            return FakeStat()  # type: ignore[return-value]
        return original_stat(self, *args, **kwargs)

    monkey = pytest.MonkeyPatch()
    monkey.setattr(Path, "stat", fake_stat)

    msg_route = respx.post(
        "https://api.telegram.org/botTOKEN/sendMessage"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))
    doc_route = respx.post(
        "https://api.telegram.org/botTOKEN/sendDocument"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))

    try:
        await notify_auto_backup(
            token="TOKEN",
            owner_user_id=42,
            archive_path=archive,
        )
    finally:
        monkey.undo()

    assert msg_route.called
    assert not doc_route.called


@pytest.mark.asyncio
@respx.mock
async def test_notify_document_failure_sends_fallback_message(tmp_path: Path) -> None:
    archive = tmp_path / "small-auto.zip"
    archive.write_bytes(b"zip")
    respx.post("https://api.telegram.org/botTOKEN/sendDocument").mock(
        return_value=httpx.Response(400, json={"ok": False, "description": "fail"})
    )
    msg_route = respx.post(
        "https://api.telegram.org/botTOKEN/sendMessage"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))

    await notify_auto_backup(
        token="TOKEN",
        owner_user_id=42,
        archive_path=archive,
    )

    assert msg_route.called


@pytest.mark.asyncio
@respx.mock
async def test_notify_never_raises_on_network_error(tmp_path: Path) -> None:
    archive = tmp_path / "small-auto.zip"
    archive.write_bytes(b"zip")
    respx.post("https://api.telegram.org/botTOKEN/sendDocument").mock(
        side_effect=httpx.ConnectError("down")
    )
    # fallback message also fails
    respx.post("https://api.telegram.org/botTOKEN/sendMessage").mock(
        side_effect=httpx.ConnectError("down")
    )

    await notify_auto_backup(
        token="TOKEN",
        owner_user_id=42,
        archive_path=archive,
    )
```

- [ ] **Step 4: Correr tests → FAIL (módulo inexistente)**

```bash
cd /home/santi/dockerPortatil/nocodb/backup-manager
pytest tests/test_telegram_notify.py -v
```

Expected: FAIL import `telegram_notify`.

- [ ] **Step 5: Implementar `telegram_notify.py`**

Crear `backup-manager/src/backup_manager/telegram_notify.py`:

```python
from __future__ import annotations

import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

TELEGRAM_MAX_DOCUMENT_BYTES = 50 * 1024 * 1024
_API = "https://api.telegram.org"


def is_telegram_configured(token: str, owner_user_id: int | None) -> bool:
    return bool(token.strip()) and owner_user_id is not None


def _format_size(size_bytes: int) -> str:
    mib = size_bytes / (1024 * 1024)
    if mib < 0.1:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{mib:.2f} MB"


def format_success_caption(archive_name: str, size_bytes: int) -> str:
    return (
        "Backup automático listo.\n"
        f"{archive_name} · {_format_size(size_bytes)}"
    )


def format_too_large_message(archive_name: str, size_bytes: int) -> str:
    return (
        f"Backup automático listo, pero el ZIP supera 50 MB "
        f"({_format_size(size_bytes)}).\n"
        "No se puede enviar por Telegram. Descárgalo desde la web "
        "(o Drive/OneDrive si está configurado).\n"
        f"Archivo: {archive_name}"
    )


def format_send_failure_message(archive_name: str) -> str:
    return (
        "Backup automático generado, pero no pude enviarte el archivo "
        "por Telegram.\n"
        f"Está disponible en la web.\nArchivo: {archive_name}"
    )


async def _send_message(token: str, chat_id: int, text: str) -> None:
    url = f"{_API}/bot{token}/sendMessage"
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            json={"chat_id": chat_id, "text": text},
        )
    if response.status_code >= 400 or not response.json().get("ok", False):
        raise RuntimeError(f"sendMessage falló: {response.text}")


async def _send_document(
    token: str,
    chat_id: int,
    archive_path: Path,
    caption: str,
) -> None:
    url = f"{_API}/bot{token}/sendDocument"
    async with httpx.AsyncClient(timeout=120.0) as client:
        with archive_path.open("rb") as handle:
            response = await client.post(
                url,
                data={"chat_id": str(chat_id), "caption": caption},
                files={
                    "document": (
                        archive_path.name,
                        handle,
                        "application/zip",
                    )
                },
            )
    if response.status_code >= 400 or not response.json().get("ok", False):
        raise RuntimeError(f"sendDocument falló: {response.text}")


async def notify_auto_backup(
    *,
    token: str,
    owner_user_id: int,
    archive_path: Path,
) -> None:
    size = archive_path.stat().st_size
    try:
        if size > TELEGRAM_MAX_DOCUMENT_BYTES:
            await _send_message(
                token,
                owner_user_id,
                format_too_large_message(archive_path.name, size),
            )
            return
        await _send_document(
            token,
            owner_user_id,
            archive_path,
            format_success_caption(archive_path.name, size),
        )
    except Exception:
        logger.exception("Fallo al notificar backup por Telegram")
        try:
            await _send_message(
                token,
                owner_user_id,
                format_send_failure_message(archive_path.name),
            )
        except Exception:
            logger.exception("Tampoco se pudo enviar el aviso de fallo por Telegram")
```

- [ ] **Step 6: Correr tests → PASS**

```bash
cd /home/santi/dockerPortatil/nocodb/backup-manager
pytest tests/test_telegram_notify.py -v
```

Expected: todos PASS. Si el test de `chat_id` en multipart es frágil, ajustar aserción a `route.called` + comprobar que el body multipart incluye el nombre del archivo.

---

### Task 2: Config + hook en `runner`

**Files:**
- Modify: `backup-manager/src/backup_manager/config.py`
- Modify: `backup-manager/src/backup_manager/runner.py`
- Create: `backup-manager/tests/test_runner_telegram.py`

**Interfaces:**
- Consumes: `notify_auto_backup`, `is_telegram_configured` de Task 1
- Produces: `BackupConfig.telegram_bot_token: str`, `BackupConfig.telegram_owner_user_id: int | None`

- [ ] **Step 1: Tests del hook (fallan hasta cablear)**

Crear `backup-manager/tests/test_runner_telegram.py`:

```python
from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backup_manager.config import BackupConfig


def _config(**overrides: object) -> BackupConfig:
    base = dict(
        nocodb_url="http://nocodb:8080",
        nocodb_token="tok",
        base_id="base",
        staging_dir=Path("/tmp/backups-test"),
        provider="none",
        schedule="0 3 * * *",
        timezone="Europe/Madrid",
        local_retention=7,
        google_client_id="",
        google_client_secret="",
        google_refresh_token="",
        google_folder_id="",
        onedrive_client_id="",
        onedrive_client_secret="",
        onedrive_refresh_token="",
        onedrive_folder_path="/Finanzas/backups",
        trigger_secret="secret",
        trigger_port=8090,
        telegram_bot_token="BOT",
        telegram_owner_user_id=99,
    )
    base.update(overrides)
    return BackupConfig(**base)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_auto_backup_notifies_telegram(tmp_path: Path) -> None:
    archive = tmp_path / "auto.zip"
    archive.write_bytes(b"data")
    config = _config(staging_dir=tmp_path)

    notify = AsyncMock()
    with (
        patch("backup_manager.runner.export_base", new=AsyncMock(return_value=tmp_path / "export")),
        patch("backup_manager.runner.create_zip", return_value=archive),
        patch("backup_manager.runner.build_uploader", return_value=None),
        patch("backup_manager.runner.prune_local_backups"),
        patch("backup_manager.runner.compute_fingerprint", new=AsyncMock(return_value={})),
        patch("backup_manager.runner.save_fingerprint"),
        patch("backup_manager.runner.NocoDbClient"),
        patch("backup_manager.runner.notify_auto_backup", new=notify),
        patch("backup_manager.runner.is_telegram_configured", return_value=True),
    ):
        from backup_manager.runner import run_backup

        result = await run_backup(config, source="auto", upload=False)

    assert result == archive
    notify.assert_awaited_once()
    kwargs = notify.await_args.kwargs
    assert kwargs["token"] == "BOT"
    assert kwargs["owner_user_id"] == 99
    assert kwargs["archive_path"] == archive


@pytest.mark.asyncio
async def test_manual_backup_skips_telegram(tmp_path: Path) -> None:
    archive = tmp_path / "manual.zip"
    archive.write_bytes(b"data")
    config = _config(staging_dir=tmp_path)
    notify = AsyncMock()
    with (
        patch("backup_manager.runner.export_base", new=AsyncMock(return_value=tmp_path / "export")),
        patch("backup_manager.runner.create_zip", return_value=archive),
        patch("backup_manager.runner.build_uploader", return_value=None),
        patch("backup_manager.runner.prune_local_backups"),
        patch("backup_manager.runner.compute_fingerprint", new=AsyncMock(return_value={})),
        patch("backup_manager.runner.save_fingerprint"),
        patch("backup_manager.runner.NocoDbClient"),
        patch("backup_manager.runner.notify_auto_backup", new=notify),
    ):
        from backup_manager.runner import run_backup

        await run_backup(config, source="manual", upload=False)

    notify.assert_not_awaited()


@pytest.mark.asyncio
async def test_auto_backup_skips_when_not_configured(tmp_path: Path) -> None:
    archive = tmp_path / "auto.zip"
    archive.write_bytes(b"data")
    config = _config(
        staging_dir=tmp_path,
        telegram_bot_token="",
        telegram_owner_user_id=None,
    )
    notify = AsyncMock()
    with (
        patch("backup_manager.runner.export_base", new=AsyncMock(return_value=tmp_path / "export")),
        patch("backup_manager.runner.create_zip", return_value=archive),
        patch("backup_manager.runner.build_uploader", return_value=None),
        patch("backup_manager.runner.prune_local_backups"),
        patch("backup_manager.runner.compute_fingerprint", new=AsyncMock(return_value={})),
        patch("backup_manager.runner.save_fingerprint"),
        patch("backup_manager.runner.NocoDbClient"),
        patch("backup_manager.runner.notify_auto_backup", new=notify),
        patch("backup_manager.runner.is_telegram_configured", return_value=False),
    ):
        from backup_manager.runner import run_backup

        await run_backup(config, source="auto", upload=False)

    notify.assert_not_awaited()
```

- [ ] **Step 2: Correr → FAIL (campos config / imports)**

```bash
cd /home/santi/dockerPortatil/nocodb/backup-manager
pytest tests/test_runner_telegram.py -v
```

Expected: FAIL por `telegram_bot_token` desconocido o similar.

- [ ] **Step 3: Extender `BackupConfig`**

En `config.py`, añadir campos al dataclass:

```python
telegram_bot_token: str
telegram_owner_user_id: int | None
```

En `from_env`:

```python
owner_raw = os.environ.get("TELEGRAM_OWNER_USER_ID", "").strip()
owner_user_id = int(owner_raw) if owner_raw else None

return cls(
    # ...existing...
    telegram_bot_token=os.environ.get("TELEGRAM_BOT_TOKEN", "").strip(),
    telegram_owner_user_id=owner_user_id,
)
```

- [ ] **Step 4: Hook en `runner.py`**

Tras `tracker.complete(archive_path.name)` y **antes** del `return`, solo si `source == "auto"`:

```python
from backup_manager.telegram_notify import is_telegram_configured, notify_auto_backup

# dentro de run_backup, tras complete, antes de return:
if source == "auto":
    if is_telegram_configured(
        config.telegram_bot_token,
        config.telegram_owner_user_id,
    ):
        await notify_auto_backup(
            token=config.telegram_bot_token,
            owner_user_id=config.telegram_owner_user_id,  # type: ignore[arg-type]
            archive_path=archive_path,
        )
    else:
        logger.info("Telegram no configurado: se omite el envío del backup")
```

Importante: el `await notify_auto_backup` está **fuera** del `except` que hace `tracker.fail` — o bien dentro del `try` **después** de `complete`, de modo que una excepción de notify no puede ocurrir (notify no lanza). No llamar notify en el branch de error.

- [ ] **Step 5: Tests PASS**

```bash
cd /home/santi/dockerPortatil/nocodb/backup-manager
pytest tests/test_telegram_notify.py tests/test_runner_telegram.py -v
```

Expected: all PASS.

---

### Task 3: Docker + documentación

**Files:**
- Modify: `infra/docker-compose.yml` (servicio `backup-manager`)
- Modify: `backup-manager/.env.example`
- Modify: `backup-manager/README.md`

- [ ] **Step 1: Compose**

En el bloque `environment` de `backup-manager`, añadir:

```yaml
TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_OWNER_USER_ID: ${TELEGRAM_OWNER_USER_ID:-}
```

- [ ] **Step 2: `.env.example`**

Añadir al final:

```
# Envío automático del ZIP a Telegram (solo backups programados)
# Reutilizar las mismas vars del servicio bot
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_OWNER_USER_ID=
```

- [ ] **Step 3: README**

Añadir sección breve **Telegram** después de Programación:

```markdown
## Telegram (backups automáticos)

Si `TELEGRAM_BOT_TOKEN` y `TELEGRAM_OWNER_USER_ID` están definidos, tras cada backup **programado** exitoso el servicio envía el ZIP a ese chat (solo Santi).

- Límite: 50 MB. Si el ZIP es mayor, envía un aviso de texto.
- Los backups manuales (web/CLI) no se envían.
- Un fallo de Telegram no marca el backup como fallido.
```

Actualizar también el estado en la spec: `docs/superpowers/specs/2026-08-05-backup-telegram-auto-design.md` → «Implementado» solo **después** del rebuild y smoke OK (Task 4).

---

### Task 4: Rebuild + verificación

**Files:** ninguno nuevo (ops)

- [ ] **Step 1: Confirmar vars en `infra/.env`**

Comprobar que existen `TELEGRAM_BOT_TOKEN` y `TELEGRAM_OWNER_USER_ID` (las mismas que usa el bot). No imprimir el token en logs ni en la respuesta al usuario.

- [ ] **Step 2: Rebuild backup-manager**

```bash
cd /home/santi/dockerPortatil/nocodb
docker compose --env-file infra/.env up -d --build backup-manager
```

Expected: contenedor `finance-backup` healthy/running.

- [ ] **Step 3: Smoke forzado (auto path)**

Opción A — exec dentro del contenedor forzando un run con source auto (y provider none si no quieres subir):

```bash
docker compose --env-file infra/.env exec backup-manager \
  python -c "
from backup_manager.config import BackupConfig
from backup_manager.runner import run_backup_sync
run_backup_sync(BackupConfig.from_env(), upload=False, source='auto')
"
```

Expected: ZIP en staging + mensaje/documento en Telegram de Santi.

Opción B — si no se quiere un backup completo ahora: dejar el cron y verificar en el siguiente ciclo programado; documentar en el handoff.

- [ ] **Step 4: Verificar que manual no envía**

Desde la web, lanzar un backup manual y confirmar que **no** llega ZIP nuevo por Telegram (solo el de la prueba auto si se hizo).

- [ ] **Step 5: Marcar spec como implementada**

En `docs/superpowers/specs/2026-08-05-backup-telegram-auto-design.md`, cambiar Estado a:

```markdown
Aprobado e implementado (2026-08-05).
```

---

## Spec coverage checklist

| Requisito spec | Task |
|----------------|------|
| Envía backup-manager vía Bot API | 1, 2 |
| Solo Santi / OWNER_USER_ID | 1, 2, 3 |
| Solo source=auto exitoso | 2 |
| Manual no envía | 2 |
| Sin cambios → sin mensaje (scheduler ya omite run) | N/A (sin cambio; cubierto por scheduler actual) |
| Límite 50 MB + aviso | 1 |
| Fallo envío no falla backup + aviso | 1 |
| Compose + env | 3 |
| Sin UI / sin comandos bot | N/A (fuera de alcance) |

## Execution handoff

Plan listo en `docs/superpowers/plans/2026-08-05-backup-telegram-auto.md`.

**Opciones de ejecución:**

1. **Subagent-Driven (recomendada)** — un subagente por task, revisión entre tasks  
2. **Inline** — ejecutar en esta sesión con checkpoints  

¿Cuál prefieres?
