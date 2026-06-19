"""Parse uploaded CSV / Excel files into influencer rows.

Lets teams bulk-load their existing creator spreadsheet into CCOS,
removing the migration barrier (REQUIREMENT_DOC integration phase 1).
"""

import csv
import io

from openpyxl import load_workbook

# Map common spreadsheet headers (lowercased) to Influencer fields.
FIELD_ALIASES = {
    "name": "name",
    "creator": "name",
    "influencer": "name",
    "instagram": "instagram_username",
    "instagram_username": "instagram_username",
    "instagram link": "instagram_username",
    "instagram_link": "instagram_username",
    "handle": "instagram_username",
    "ig": "instagram_username",
    "youtube": "youtube_channel",
    "youtube_channel": "youtube_channel",
    "city": "city",
    "country": "country",
    "category": "category",
    "language": "language",
    "manager": "manager_name",
    "manager_name": "manager_name",
    "email": "email",
    "phone": "phone",
    "contact": "phone",
    "contact details": "phone",
    "contact number": "phone",
    "contact_number": "phone",
    "notes": "notes",
}

ALLOWED_FIELDS = set(FIELD_ALIASES.values())


def _normalize_row(raw: dict[str, object]) -> dict[str, str]:
    mapped: dict[str, str] = {}
    for header, value in raw.items():
        if header is None:
            continue
        field = FIELD_ALIASES.get(str(header).strip().lower())
        if not field:
            continue
        text = "" if value is None else str(value).strip()
        if text:
            mapped[field] = text
    return mapped


def parse_influencer_rows(filename: str, content: bytes) -> list[dict[str, str]]:
    """Return normalized influencer dicts from a CSV or XLSX upload."""
    lower = filename.lower()
    if lower.endswith(".csv"):
        rows = _parse_csv(content)
    elif lower.endswith((".xlsx", ".xlsm")):
        rows = _parse_xlsx(content)
    else:
        raise ValueError("Unsupported file type. Upload a .csv or .xlsx file.")

    normalized = [_normalize_row(r) for r in rows]
    return [r for r in normalized if r.get("name")]


def _parse_csv(content: bytes) -> list[dict[str, object]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]


def _parse_xlsx(content: bytes) -> list[dict[str, object]]:
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    try:
        headers = [str(h).strip() if h is not None else "" for h in next(rows_iter)]
    except StopIteration:
        return []
    out: list[dict[str, object]] = []
    for row in rows_iter:
        if row is None or all(c is None for c in row):
            continue
        out.append(dict(zip(headers, row, strict=False)))
    wb.close()
    return out
