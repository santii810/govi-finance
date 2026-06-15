from __future__ import annotations

import urllib.parse
from typing import Any

import httpx


class NocoDbError(Exception):
    def __init__(self, message: str, status: int) -> None:
        super().__init__(message)
        self.status = status


class NocoDbClient:
    def __init__(self, base_url: str, token: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token

    async def list_base_tables(self, base_id: str) -> list[dict[str, Any]]:
        data = await self._request("GET", f"/api/v2/meta/bases/{base_id}/tables")
        return list(data.get("list", []))

    async def get_table_meta(self, table_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/api/v2/meta/tables/{table_id}")

    async def list_records(
        self,
        table_id: str,
        *,
        limit: int = 1000,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        params = {"limit": str(limit), "offset": str(offset)}
        data = await self._request(
            "GET",
            f"/api/v2/tables/{table_id}/records?{urllib.parse.urlencode(params)}",
        )
        return list(data.get("list", []))

    async def fetch_all_records(self, table_id: str) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        offset = 0
        limit = 1000
        while True:
            batch = await self.list_records(table_id, limit=limit, offset=offset)
            if not batch:
                break
            rows.extend(batch)
            if len(batch) < limit:
                break
            offset += limit
        return rows

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        headers = {"xc-token": self.token, "Content-Type": "application/json"}
        async with httpx.AsyncClient(base_url=self.base_url, timeout=120.0) as client:
            response = await client.request(method, path, headers=headers, **kwargs)
        if response.status_code >= 400:
            raise NocoDbError(response.text or response.reason_phrase, response.status_code)
        if not response.content:
            return {}
        payload = response.json()
        if isinstance(payload, dict):
            return payload
        return {"list": payload}
