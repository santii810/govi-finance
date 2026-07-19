import pytest
from unittest.mock import AsyncMock

from worker.bot.config import movement_to_record
from worker.import_service import import_movements
from worker.models import ClassifiedMovement


def test_movement_to_record_pending_without_classification():
    movement = ClassifiedMovement(
        fecha=__import__("datetime").date(2025, 6, 3),
        importe=-45.2,
        concepto="Gadis",
        banco="Trade Republic",
        persona="Santi",
        tabla_destino="Gastos",
        categoria=None,
        idempotency_key="abc-123",
        metadata={"account_id": "trade-republic-santi", "type": "CARD_TRANSACTION"},
    )
    record = movement_to_record(movement, account_dump_id=42)
    assert record["Estado"] == "pending"
    assert record["AccountDumps"] == {"Id": 42}
    assert record["IdempotencyKey"] == "abc-123"
    assert record["Fecha"] == "2025-06-03"
    assert record["Importe"] == -45.2
    assert record["Persona"] == "Santi"
    assert record["Metadatos"]["type"] == "CARD_TRANSACTION"
    assert "TablaDestino" not in record
    assert "Categoría" not in record
    assert "Fichero" not in record


def _movement(key: str) -> ClassifiedMovement:
    return ClassifiedMovement(
        fecha=__import__("datetime").date(2025, 6, 1),
        importe=10,
        concepto="Test",
        banco="Trade Republic",
        persona="Santi",
        tabla_destino="Ingresos",
        categoria=None,
        idempotency_key=key,
        metadata={"account_id": "trade-republic-santi"},
    )


@pytest.mark.asyncio
async def test_import_movements_skips_existing():
    client = AsyncMock()
    client.existing_idempotency_keys.return_value = {"exists"}
    client.create_record.return_value = {"Id": 1}

    movements = [_movement("exists"), _movement("new")]
    result = await import_movements(client, "table1", movements, account_dump_id=7)

    assert result.inserted == 1
    assert result.skipped == 1
    assert result.total == 2
    client.create_record.assert_awaited_once()
    args = client.create_record.await_args
    assert args[0][1]["AccountDumps"] == {"Id": 7}


@pytest.mark.asyncio
async def test_import_movements_skips_duplicate_keys_in_same_batch():
    client = AsyncMock()
    client.existing_idempotency_keys.return_value = set()
    client.create_record.return_value = {"Id": 1}

    movements = [_movement("dup"), _movement("dup"), _movement("other")]
    result = await import_movements(client, "table1", movements, account_dump_id=7)

    assert result.inserted == 2
    assert result.skipped == 1
    assert result.total == 3
    assert client.create_record.await_count == 2
