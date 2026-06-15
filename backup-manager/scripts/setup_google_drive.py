#!/usr/bin/env python3
"""Autoriza Google Drive, crea carpeta y actualiza infra/.env."""

from __future__ import annotations

import json
import os
import time
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import httpx

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
SCOPE = "https://www.googleapis.com/auth/drive.file"
REDIRECT_URI = "http://localhost:8765/callback"
FOLDER_NAME = "Finanzas Backups"


def resolve_env_path() -> Path:
    if env := os.environ.get("BACKUP_ENV_FILE"):
        return Path(env)
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "infra" / ".env"
        if candidate.exists():
            return candidate
    raise RuntimeError("No se encontro infra/.env; define BACKUP_ENV_FILE")


ENV_PATH = resolve_env_path()


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    code: str | None = None
    error: str | None = None

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            self.send_error(404)
            return

        params = urllib.parse.parse_qs(parsed.query)
        if "error" in params:
            OAuthCallbackHandler.error = params["error"][0]
            body = b"Error de autorizacion. Puedes cerrar esta ventana."
        elif "code" in params:
            OAuthCallbackHandler.code = params["code"][0]
            body = b"Autorizacion correcta. Puedes cerrar esta ventana."
        else:
            self.send_error(400)
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return


def wait_for_code(timeout: float = 300) -> str:
    OAuthCallbackHandler.code = None
    OAuthCallbackHandler.error = None
    server = HTTPServer(("127.0.0.1", 8765), OAuthCallbackHandler)
    server.timeout = 1
    deadline = time.time() + timeout
    while time.time() < deadline:
        server.handle_request()
        if OAuthCallbackHandler.error:
            server.server_close()
            raise RuntimeError(f"Google OAuth error: {OAuthCallbackHandler.error}")
        if OAuthCallbackHandler.code:
            server.server_close()
            return OAuthCallbackHandler.code
    server.server_close()
    raise RuntimeError("No se recibio codigo OAuth a tiempo")


def exchange_code(client_id: str, client_secret: str, code: str) -> dict[str, object]:
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
    return response.json()


def ensure_folder(access_token: str, folder_name: str) -> str:
    headers = {"Authorization": f"Bearer {access_token}"}
    query = urllib.parse.urlencode(
        {
            "q": f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
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
            json={"name": folder_name, "mimeType": "application/vnd.google-apps.folder"},
        )
        created.raise_for_status()
        return str(created.json()["id"])


def upsert_env(values: dict[str, str]) -> None:
    lines: list[str] = []
    if ENV_PATH.exists():
        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()

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
        kept.append("## BACKUP MANAGER")
        for key in missing:
            kept.append(f"{key}={values[key]}")

    ENV_PATH.write_text("\n".join(kept) + "\n", encoding="utf-8")


def main() -> None:
    client_id = os.environ.get("GOOGLE_DRIVE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_DRIVE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise SystemExit("Define GOOGLE_DRIVE_CLIENT_ID y GOOGLE_DRIVE_CLIENT_SECRET")

    params = {
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    print("Abre esta URL y autoriza con tu cuenta Google:\n", auth_url)
    webbrowser.open(auth_url)

    code = wait_for_code()
    payload = exchange_code(client_id, client_secret, code)
    refresh_token = payload.get("refresh_token")
    access_token = payload.get("access_token")
    if not refresh_token or not access_token:
        raise RuntimeError(f"Respuesta OAuth incompleta: {json.dumps(payload)}")

    folder_id = ensure_folder(str(access_token), FOLDER_NAME)
    upsert_env(
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
        }
    )
    print(f"\nConfiguracion guardada en {ENV_PATH}")
    print(f"Carpeta Drive: {FOLDER_NAME} ({folder_id})")


if __name__ == "__main__":
    main()
