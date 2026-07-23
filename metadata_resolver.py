"""Resolve company and sector labels for HITL, INDEX, and manifest output."""

from __future__ import annotations

import re
from typing import Any

from schemas import PostProcessPayload

_COMPANY_KEYS = (
    "company_name",
    "client_name",
    "organization",
    "organisation",
    "company",
    "client",
    "bedrijf",
    "klant",
    "customer",
    "account",
    "account_name",
)

_SECTOR_KEYS = (
    "sector",
    "industry",
    "branche",
    "domain",
    "vertical",
    "markt",
)


def _normalize_key(key: str) -> str:
    return key.strip().lower().replace("-", "_").replace(" ", "_")


def metadata_lookup(metadata: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    """Find the first non-empty metadata value across common key variants."""
    normalized = {_normalize_key(key): value for key, value in metadata.items()}
    for key in keys:
        value = normalized.get(_normalize_key(key))
        if value in (None, "", "—"):
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _clean_company_candidate(value: str) -> str | None:
    candidate = value.strip().strip("*").strip("#").strip()
    candidate = re.sub(r"\s+", " ", candidate)
    if len(candidate) < 3:
        return None
    lowered = candidate.lower()
    if lowered in {"samenvatting", "summary", "integrale bedrijfsanalyse", "overview"}:
        return None
    return candidate


def extract_company_from_summary(summary: str) -> str | None:
    """Infer company name from common Markdown summary patterns."""
    patterns = (
        r"\*\*([^*]+(?:B\.V\.|BV|N\.V\.|NV|Ltd\.|Inc\.|GmbH)?)\*\*",
        r"(?:voor|for)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9 &.',-]+(?:B\.V\.|BV|N\.V\.|NV)?)",
        r"(?:Integrale\s+)?(?:Bedrijfs)?analyse[^:\n]*:\s*([^\n]+)",
        r"^#{1,3}\s+(.+)$",
    )
    for pattern in patterns:
        match = re.search(pattern, summary, re.MULTILINE | re.IGNORECASE)
        if not match:
            continue
        candidate = _clean_company_candidate(match.group(1))
        if candidate:
            return candidate
    return None


def extract_company_from_files(payload: PostProcessPayload) -> str | None:
    """Infer company name from generated artifact headings."""
    heading_patterns = (
        r"#\s+(?:INTEGRALE\s+)?(?:BEDRIJFS)?ANALYSE:\s*(.+)$",
        r"#\s+(.+?)\s+—",
    )
    for proposed in payload.proposed_files:
        for pattern in heading_patterns:
            match = re.search(pattern, proposed.content, re.MULTILINE | re.IGNORECASE)
            if not match:
                continue
            candidate = _clean_company_candidate(match.group(1))
            if candidate:
                return candidate
    return None


def resolve_company_name(payload: PostProcessPayload, *, default: str = "—") -> str:
    """Resolve a display-ready company name from metadata or generated content."""
    found = metadata_lookup(payload.metadata, _COMPANY_KEYS)
    if found:
        return found

    found = extract_company_from_summary(payload.summary_markdown)
    if found:
        return found

    found = extract_company_from_files(payload)
    if found:
        return found

    return default


def resolve_sector(payload: PostProcessPayload, *, default: str = "—") -> str:
    """Resolve a display-ready sector label from metadata."""
    found = metadata_lookup(payload.metadata, _SECTOR_KEYS)
    if found:
        return found
    return default


def enrich_payload_metadata(payload: PostProcessPayload) -> PostProcessPayload:
    """Normalize metadata so company_name and sector are always present when inferable."""
    metadata = dict(payload.metadata)
    company = resolve_company_name(payload, default="")
    sector = resolve_sector(payload, default="")

    if company:
        metadata.setdefault("company_name", company)
    if sector:
        metadata.setdefault("sector", sector)

    return payload.model_copy(update={"metadata": metadata})
