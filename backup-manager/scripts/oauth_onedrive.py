#!/usr/bin/env python3
"""Obtiene ONEDRIVE_REFRESH_TOKEN (ejecución local, una sola vez)."""

from __future__ import annotations

import json
import os
import urllib.parse
import webbrowser

import httpx

AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
SCOPE = "offline_access Files.ReadWrite"
REDIRECT_URI = "http://localhost:8765/callback"


def main() -> None:
    client_id = os.environ.get("ONEDRIVE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("ONEDRIVE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise SystemExit("Define ONEDRIVE_CLIENT_ID y ONEDRIVE_CLIENT_SECRET")

    params = {
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
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
            "scope": SCOPE,
        },
        timeout=60.0,
    )
    response.raise_for_status()
    payload = response.json()
    print("\nAñade a infra/.env:\n")
    print(f"ONEDRIVE_REFRESH_TOKEN={payload['refresh_token']}")
    print("\nRespuesta completa:")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
