"""Fonte de dados do Media Kit com cache e fallback local.

A primeira versão lê guias do Google Sheets publicadas como CSV. O conteúdo
institucional continua no template; a planilha guarda apenas dados públicos e
itens editoriais que mudam com frequência.
"""

from __future__ import annotations

import csv
import io
import json
import os
import re
import threading
import time
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import requests


_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_FALLBACK_FILE = _PROJECT_ROOT / "data" / "media_kit_fallback.json"
_ASSET_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$")
_TRUE_VALUES = {"1", "true", "yes", "sim", "on"}
_MONTHS_PT = (
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
)


def _text(value: object, limit: int = 300) -> str:
    return str(value or "").strip()[:limit]


def _active(value: object, default: bool = True) -> bool:
    raw = _text(value, 12).lower()
    return default if not raw else raw in _TRUE_VALUES


def _number(value: object) -> float | None:
    raw = _text(value, 40).replace(" ", "")
    if not raw:
        return None
    # Aceita 2.700.000 e 2.700,50 sem confundir o decimal 2.7 com 27.
    if "," in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"[-+]?\d{1,3}(?:\.\d{3})+", raw):
        raw = raw.replace(".", "")
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _order(value: object, default: int = 999) -> int:
    try:
        return max(0, min(9999, int(float(str(value)))))
    except (TypeError, ValueError):
        return default


def _safe_url(value: object) -> str:
    candidate = _text(value, 500)
    if not candidate:
        return ""
    parsed = urlparse(candidate)
    return candidate if parsed.scheme == "https" and parsed.netloc else ""


def _safe_asset(value: object) -> str:
    candidate = _text(value, 160).replace("\\", "/")
    if (
        not candidate
        or candidate.startswith("/")
        or ".." in candidate.split("/")
        or not _ASSET_RE.fullmatch(candidate)
    ):
        return ""
    return candidate


def _updated_display(value: str) -> str:
    try:
        date = datetime.fromisoformat(value).date()
    except (TypeError, ValueError):
        return ""
    return f"{_MONTHS_PT[date.month - 1]} de {date.year}"


def _normalise_metric(row: dict) -> dict | None:
    value = _number(row.get("value"))
    key = _text(row.get("key"), 60)
    if not key or value is None or not _active(row.get("active")):
        return None
    updated_at = _text(row.get("updated_at"), 20)
    return {
        "key": key,
        "value": value,
        "display_value": _text(row.get("display_value"), 40)
        or f"{value:,.0f}".replace(",", "."),
        "label": _text(row.get("label"), 80),
        "period": _text(row.get("period"), 80),
        "updated_at": updated_at,
        "updated_display": _updated_display(updated_at),
        "order": _order(row.get("order")),
        "highlight": _active(row.get("highlight"), default=False),
    }


def _normalise_audience(row: dict) -> dict | None:
    dimension = _text(row.get("dimension"), 30).lower()
    value = _number(row.get("value"))
    if (
        dimension not in {"gender", "age", "country"}
        or value is None
        or value < 0
        or not _active(row.get("active"))
    ):
        return None
    value = min(value, 100)
    return {
        "dimension": dimension,
        "label": _text(row.get("label"), 80),
        "value": value,
        "bar_value": round(value, 2),
        "display_value": _text(row.get("display_value"), 24)
        or f"{value:g}%".replace(".", ","),
        "order": _order(row.get("order")),
    }


def _normalise_content(row: dict) -> dict | None:
    title = _text(row.get("title"), 120)
    category = _text(row.get("category"), 20).lower()
    if not title or not _active(row.get("active")):
        return None
    if category not in {"conexao", "alcance", "ambos"}:
        category = "conexao"
    item = {
        "slug": _text(row.get("slug"), 80),
        "title": title,
        "category": category,
        "story": _text(row.get("story"), 420),
        "asset": _safe_asset(row.get("asset")),
        "post_url": _safe_url(row.get("post_url")),
        "order": _order(row.get("order")),
        "metrics": [],
    }
    labels = {
        "views": "visualizações",
        "likes": "curtidas",
        "comments": "comentários",
        "shares": "compartilhamentos",
        "saves": "salvamentos",
    }
    for key, label in labels.items():
        value = _number(row.get(key))
        if value is not None:
            item["metrics"].append({"key": key, "label": label, "value": value})
    return item


def _normalise_quote(row: dict) -> dict | None:
    quote = _text(row.get("quote"), 420)
    if not quote or not _active(row.get("active")):
        return None
    context = _text(row.get("context"), 30).lower()
    if context not in {"identificacao", "inspiracao", "confianca", "decisao"}:
        context = "identificacao"
    return {
        "quote": quote,
        "author_display": _text(row.get("author_display"), 80) or "Seguidora",
        "context": context,
        "source_url": _safe_url(row.get("source_url")),
        "order": _order(row.get("order")),
    }


def _normalise_testimonial(row: dict) -> dict | None:
    quote = _text(row.get("quote"), 500)
    author = _text(row.get("author"), 100)
    if not quote or not author or not _active(row.get("active")):
        return None
    return {
        "quote": quote,
        "author": author,
        "role": _text(row.get("role"), 100),
        "company": _text(row.get("company"), 100),
        "logo_asset": _safe_asset(row.get("logo_asset")),
        "case_url": _safe_url(row.get("case_url")),
        "order": _order(row.get("order")),
    }


def _normalise_case(row: dict) -> dict | None:
    partner = _text(row.get("partner"), 80)
    story = _text(row.get("story"), 600)
    if not partner or not story or not _active(row.get("active")):
        return None
    result_1 = _text(row.get("result_1_value"), 24)
    result_2 = _text(row.get("result_2_value"), 24)
    return {
        "partner": partner,
        "category": _text(row.get("category"), 80),
        "objective": _text(row.get("objective"), 200),
        "format": _text(row.get("format"), 200),
        "story": story,
        "result_1_value": result_1,
        "result_1_label": _text(row.get("result_1_label"), 60),
        "result_2_value": result_2,
        "result_2_label": _text(row.get("result_2_label"), 60),
        "period": _text(row.get("period"), 80),
        "testimonial_quote": _text(row.get("testimonial_quote"), 400),
        "testimonial_author": _text(row.get("testimonial_author"), 100),
        "asset": _safe_asset(row.get("asset")),
        "post_url": _safe_url(row.get("post_url")),
        "order": _order(row.get("order")),
    }


_CHART_COLORS = ("var(--mk-coral)", "var(--mk-cobalt)", "var(--mk-lime)", "var(--mk-coral-dark)")


def _apply_swatches(items: list) -> None:
    """Atribui uma cor da paleta a cada item (usada no gráfico e na legenda)."""
    for index, item in enumerate(items):
        item["swatch"] = _CHART_COLORS[index % len(_CHART_COLORS)]


def _donut_gradient(items: list) -> str:
    """Monta um conic-gradient CSS a partir dos valores já com swatch atribuído."""
    total = sum(item.get("value") or 0 for item in items)
    if not items or total <= 0:
        return ""
    stops, acc = [], 0.0
    for item in items:
        start = acc / total * 100
        acc += item.get("value") or 0
        end = acc / total * 100
        stops.append(f"{item['swatch']} {start:.2f}% {end:.2f}%")
    return "conic-gradient(" + ", ".join(stops) + ")"


_NORMALISERS = {
    "metrics": _normalise_metric,
    "audience": _normalise_audience,
    "content": _normalise_content,
    "quotes": _normalise_quote,
    "testimonials": _normalise_testimonial,
    "cases": _normalise_case,
}


class MediaKitDataService:
    """Lê dados públicos do Media Kit sem tornar o Sheets ponto único de falha."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cache: dict | None = None
        self._cache_until = 0.0

    def _fallback(self) -> dict:
        try:
            with _FALLBACK_FILE.open(encoding="utf-8") as handle:
                return json.load(handle)
        except (OSError, ValueError, TypeError):
            return {
                "metrics": [], "audience": [], "content": [],
                "quotes": [], "testimonials": [], "cases": [],
            }

    @staticmethod
    def _rows(url: str) -> list[dict]:
        response = requests.get(url, timeout=(3, 8))
        response.raise_for_status()
        if len(response.content) > 1_000_000:
            raise ValueError("CSV do Media Kit excedeu o limite de 1 MB")
        return list(csv.DictReader(io.StringIO(response.text.lstrip("\ufeff"))))

    def get(self, logger=None) -> dict:
        now = time.monotonic()
        if self._cache is not None and now < self._cache_until:
            return deepcopy(self._cache)

        with self._lock:
            now = time.monotonic()
            if self._cache is not None and now < self._cache_until:
                return deepcopy(self._cache)

            data = self._fallback()
            urls = {
                "metrics": os.environ.get("MEDIA_KIT_METRICS_CSV_URL", ""),
                "audience": os.environ.get("MEDIA_KIT_AUDIENCE_CSV_URL", ""),
                "content": os.environ.get("MEDIA_KIT_CONTENT_CSV_URL", ""),
                "quotes": os.environ.get("MEDIA_KIT_QUOTES_CSV_URL", ""),
                "testimonials": os.environ.get("MEDIA_KIT_TESTIMONIALS_CSV_URL", ""),
                "cases": os.environ.get("MEDIA_KIT_CASES_CSV_URL", ""),
            }

            for section, raw_url in urls.items():
                url = _safe_url(raw_url)
                if not url:
                    continue
                try:
                    items = []
                    for row in self._rows(url):
                        item = _NORMALISERS[section](row)
                        if item:
                            items.append(item)
                    items.sort(key=lambda item: item.get("order", 999))
                    data[section] = items
                except (requests.RequestException, ValueError, csv.Error) as exc:
                    if logger:
                        logger.warning("Falha ao atualizar dados do Media Kit (%s): %s", section, exc)

            data.setdefault("metrics", [])
            if data["metrics"] and not any(m.get("highlight") for m in data["metrics"]):
                # Compatibilidade: planilhas/fallback sem a coluna "highlight"
                # promovem as 3 primeiras métricas (por order) a destaque.
                for metric in data["metrics"][:3]:
                    metric["highlight"] = True
            data.setdefault("audience", [])
            data.setdefault("content", [])
            data.setdefault("quotes", [])
            data.setdefault("testimonials", [])
            data.setdefault("cases", [])
            data["audience_groups"] = {
                dimension: [
                    item for item in data["audience"]
                    if item.get("dimension") == dimension
                ]
                for dimension in ("gender", "age", "country")
            }
            _apply_swatches(data["audience_groups"]["gender"])
            _apply_swatches(data["audience_groups"]["age"])
            data["gender_donut"] = _donut_gradient(data["audience_groups"]["gender"])
            valid_dates = [
                item.get("updated_display") for item in data["metrics"]
                if item.get("updated_display")
            ]
            data["updated_display"] = valid_dates[0] if valid_dates else ""

            try:
                cache_seconds = int(os.environ.get("MEDIA_KIT_CACHE_SECONDS", "600"))
            except ValueError:
                cache_seconds = 600
            self._cache = data
            self._cache_until = time.monotonic() + max(30, min(cache_seconds, 3600))
            return deepcopy(data)


media_kit_data = MediaKitDataService()
