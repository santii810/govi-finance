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

    async def list_records(
        self,
        table_id: str,
        *,
        where: str | None = None,
        fields: list[str] | None = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        params: dict[str, str] = {
            "limit": str(limit),
            "offset": str(offset),
        }
        if where:
            params["where"] = where
        if fields:
            params["fields"] = ",".join(fields)

        data = await self._request(
            "GET",
            f"/api/v2/tables/{table_id}/records?{urllib.parse.urlencode(params)}",
        )
        return list(data.get("list", []))

    async def create_record(self, table_id: str, fields: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", f"/api/v2/tables/{table_id}/records", json=fields)

    async def update_record(self, table_id: str, record_id: int | str, fields: dict[str, Any]) -> None:
        await self._request(
            "PATCH",
            f"/api/v2/tables/{table_id}/records",
            json={"Id": record_id, **fields},
        )

    async def delete_records(self, table_id: str, record_ids: list[int | str]) -> None:
        if not record_ids:
            return
        payload = [{"Id": record_id} for record_id in record_ids]
        await self._request("DELETE", f"/api/v2/tables/{table_id}/records", json=payload)

    async def create_records(self, table_id: str, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not records:
            return []
        data = await self._request("POST", f"/api/v2/tables/{table_id}/records", json=records)
        if isinstance(data, list):
            return data
        return [data]

    async def count_records(self, table_id: str) -> int:
        data = await self._request(
            "GET",
            f"/api/v2/tables/{table_id}/records?limit=1&fields=Id",
        )
        return int(data.get("pageInfo", {}).get("totalRows", 0))

    async def get_table_meta(self, table_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/api/v2/meta/tables/{table_id}")

    async def list_base_tables(self, base_id: str) -> list[dict[str, Any]]:
        data = await self._request("GET", f"/api/v2/meta/bases/{base_id}/tables")
        return list(data.get("list", []))

    async def patch_column(self, column_id: str, body: dict[str, Any]) -> dict[str, Any]:
        return await self._request("PATCH", f"/api/v2/meta/columns/{column_id}", json=body)

    async def create_column(self, table_id: str, body: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", f"/api/v2/meta/tables/{table_id}/columns", json=body)

    async def existing_idempotency_keys(
        self,
        table_id: str,
        keys: list[str],
        *,
        chunk_size: int = 50,
    ) -> set[str]:
        if not keys:
            return set()

        found: set[str] = set()
        for index in range(0, len(keys), chunk_size):
            chunk = keys[index : index + chunk_size]
            quoted = ",".join(chunk)
            where = f"(IdempotencyKey,in,{quoted})"
            rows = await self.list_records(table_id, where=where, fields=["IdempotencyKey"])
            for row in rows:
                key = row.get("IdempotencyKey")
                if key:
                    found.add(str(key))
        return found

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        headers = {"xc-token": self.token, "Content-Type": "application/json"}
        async with httpx.AsyncClient(base_url=self.base_url, timeout=60.0) as client:
            response = await client.request(method, path, headers=headers, **kwargs)
        if response.status_code >= 400:
            raise NocoDbError(response.text or response.reason_phrase, response.status_code)
        if not response.content:
            return {}
        return response.json()
