#!/usr/bin/env python3
"""Completa setup de Google Drive con el code OAuth (pegar tras autorizar)."""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
from pathlib import Path

import httpx

TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
REDIRECT_URI = "http://localhost:8765/callback"
FOLDER_NAME = "Finanzas Backups"


def resolve_env_path() -> Path:
    if env := os.environ.get("BACKUP_ENV_FILE"):
        return Path(env)
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "infra" / ".env"
        if candidate.exists():
            return candidate
    raise RuntimeError("No se encontro infra/.env")


def upsert_env(env_path: Path, values: dict[str, str]) -> None:
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    keys = set(values)
    kept: list[str] = []
    seen: set[str] = set()
    for line in lines:
        key = line.split("=", 1)[0] if "=" in line and not line.startswith("#") else ""
        if key in keys:
            if key not in seen:
                kept.append(f"{key}={values[key]}")
                seen.add(key)
            continue
        kept.append(line)
    missing = [key for key in values if key not in seen]
    if missing:
        if kept and kept[-1].strip():
            kept.append("")
        if not any(line.startswith("## BACKUP") for line in kept):
            kept.append("## BACKUP MANAGER")
        for key in missing:
            kept.append(f"{key}={values[key]}")
    env_path.write_text("\n".join(kept) + "\n", encoding="utf-8")


def ensure_folder(access_token: str) -> str:
    headers = {"Authorization": f"Bearer {access_token}"}
    query = urllib.parse.urlencode(
        {
            "q": f"name='{FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            "fields": "files(id,name)",
        }
    )
    with httpx.Client(timeout=60.0) as client:
        existing = client.get(f"{DRIVE_FILES_URL}?{query}", headers=headers)
        existing.raise_for_status()
        files = existing.json().get("files", [])
        if files:
            return str(files[0]["id"])
        created = client.post(
            DRIVE_FILES_URL,
            headers={**headers, "Content-Type": "application/json"},
            json={"name": FOLDER_NAME, "mimeType": "application/vnd.google-apps.folder"},
        )
        created.raise_for_status()
        return str(created.json()["id"])


def main() -> None:
    code = os.environ.get("OAUTH_CODE", "").strip()
    if not code and len(sys.argv) > 1:
        code = sys.argv[1].strip()
    if not code:
        raise SystemExit("Uso: OAUTH_CODE=... python finish_google_drive.py")

    client_id = os.environ.get("GOOGLE_DRIVE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_DRIVE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise SystemExit("Define GOOGLE_DRIVE_CLIENT_ID y GOOGLE_DRIVE_CLIENT_SECRET")

    response = httpx.post(
        TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=60.0,
    )
    response.raise_for_status()
    payload = response.json()
    refresh_token = payload.get("refresh_token")
    access_token = payload.get("access_token")
    if not refresh_token or not access_token:
        raise RuntimeError(f"Respuesta OAuth incompleta: {json.dumps(payload)}")

    folder_id = ensure_folder(str(access_token))
    env_path = resolve_env_path()
    upsert_env(
        env_path,
        {
            "BACKUP_PROVIDER": "google_drive",
            "GOOGLE_DRIVE_CLIENT_ID": client_id,
            "GOOGLE_DRIVE_CLIENT_SECRET": client_secret,
            "GOOGLE_DRIVE_REFRESH_TOKEN": str(refresh_token),
            "GOOGLE_DRIVE_FOLDER_ID": folder_id,
            "BACKUP_SCHEDULE": "0 3 * * *",
            "BACKUP_TIMEZONE": "Europe/Madrid",
            "BACKUP_LOCAL_RETENTION": "7",
            "NOCODB_BASE_ID": "pnf173not1wvzg0",
        },
    )
    print(f"OK: {env_path}")
    print(f"Carpeta Drive: {FOLDER_NAME} ({folder_id})")


if __name__ == "__main__":
    main()
