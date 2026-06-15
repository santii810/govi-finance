#!/usr/bin/env python3
"""Obtiene GOOGLE_DRIVE_REFRESH_TOKEN (ejecución local, una sola vez)."""

from __future__ import annotations

import json
import os
import urllib.parse
import webbrowser

import httpx

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/drive.file"
REDIRECT_URI = "http://localhost:8765/callback"


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
    url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    print("Abre esta URL si el navegador no se abre solo:\n", url)
    webbrowser.open(url)
    code = input("\nPega el parámetro 'code' de la URL de redirección: ").strip()

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
    print("\nAñade a infra/.env:\n")
    print(f"GOOGLE_DRIVE_REFRESH_TOKEN={payload['refresh_token']}")
    print("\nRespuesta completa:")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
