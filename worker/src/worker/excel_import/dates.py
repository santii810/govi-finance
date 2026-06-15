from __future__ import annotations

from datetime import date, datetime, timedelta


EXCEL_EPOCH = datetime(1899, 12, 30)


def excel_serial_to_date(value: object) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    try:
        serial = float(value)
    except (TypeError, ValueError):
        text = str(value).strip()
        if not text:
            return None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
            try:
                return datetime.strptime(text, fmt).date().isoformat()
            except ValueError:
                continue
        return None
    whole = int(serial)
    return (EXCEL_EPOCH + timedelta(days=whole)).date().isoformat()
