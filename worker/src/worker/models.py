from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any, Literal

Persona = Literal["Santi", "Sandra", "Común"]
TablaDestino = Literal["Gastos", "Ingresos", "Inversiones"]
AccountTipo = Literal["personal", "conjunta"]


@dataclass(frozen=True)
class RawMovement:
    fecha: date
    importe: Decimal
    concepto: str
    referencia: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ClassifiedMovement:
    fecha: date
    importe: Decimal
    concepto: str
    banco: str
    persona: Persona
    tabla_destino: TablaDestino
    categoria: str | None
    idempotency_key: str
    referencia: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class ImportPreview:
    account_id: str
    account_label: str
    banco: str
    tipo_cuenta: AccountTipo
    persona: Persona
    fecha_desde: date | None
    fecha_hasta: date | None
    total_movimientos: int
    gastos_count: int
    ingresos_count: int
    ejemplos: list[ClassifiedMovement]
    ambiguedades: list[str] = field(default_factory=list)
    requiere_confirmacion: bool = True

    def to_bot_message(self) -> str:
        if self.fecha_desde and self.fecha_hasta:
            rango = f"{self.fecha_desde:%d/%m/%Y} → {self.fecha_hasta:%d/%m/%Y}"
        else:
            rango = "—"

        lines = [
            "He analizado el fichero:",
            "",
            f"  • Banco:       {self.banco}",
            f"  • Cuenta:      {self.account_label}",
            f"  • Tipo:        {self.tipo_cuenta}",
            f"  • Persona:     {self.persona}",
            f"  • Movimientos: {self.total_movimientos} ({self.gastos_count} gastos, {self.ingresos_count} ingresos)",
            f"  • Fechas:      {rango}",
        ]
        if self.ambiguedades:
            lines.append("")
            lines.append("  ⚠ Ambigüedades:")
            for item in self.ambiguedades:
                lines.append(f"    - {item}")
        if self.ejemplos:
            lines.extend(["", "  Ejemplos:"])
            for mov in self.ejemplos[:3]:
                sign = "+" if mov.importe > 0 else ""
                extra = _format_metadata_hint(mov.metadata)
                suffix = f"  [{extra}]" if extra else ""
                lines.append(
                    f"    {mov.fecha:%d/%m}  {sign}{mov.importe:.2f} €  {mov.concepto[:50]}{suffix}"
                )
        lines.extend(["", "¿Confirmas la interpretación?", ""])
        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        def convert(value: Any) -> Any:
            if isinstance(value, Decimal):
                return str(value)
            if isinstance(value, date):
                return value.isoformat()
            if hasattr(value, "__dataclass_fields__"):
                return {k: convert(v) for k, v in asdict(value).items()}
            if isinstance(value, list):
                return [convert(v) for v in value]
            return value

        return convert(asdict(self))


def _format_metadata_hint(metadata: dict[str, str]) -> str:
    parts: list[str] = []
    for key in ("type", "category", "asset_class", "mcc_code"):
        value = metadata.get(key, "").strip()
        if value:
            parts.append(value)
    return ", ".join(parts)
