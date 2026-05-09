from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import urlopen
from typing import Annotated

from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.types import Command

from .crypto_brief import (
    build_asset_brief,
    build_comparison_brief,
    build_events_brief,
    build_projects_brief,
    build_signals_brief,
    build_token_doc_brief,
)


_DATA = {
    "disclaimer": "Demo only. Market values are mock data and this is not financial advice.",
    "assets": [
        {"id": "ada", "symbol": "ADA", "name": "Cardano", "category": "Layer 1"},
        {"id": "btc", "symbol": "BTC", "name": "Bitcoin", "category": "Store of Value"},
        {"id": "eth", "symbol": "ETH", "name": "Ethereum", "category": "Layer 1"},
        {"id": "min", "symbol": "MIN", "name": "Minswap Token", "category": "DEX Token"},
        {"id": "snek", "symbol": "SNEK", "name": "Snek", "category": "Meme / Community"},
        {"id": "iag", "symbol": "IAG", "name": "Iagon", "category": "Storage / Compute"},
    ],
    "marketSnapshots": [
        {"assetId": "ada", "priceUsd": 0.72, "change24hPct": 2.8, "change7dPct": 5.4, "volume24hUsd": 580000000, "marketCapUsd": 25500000000, "riskLevel": "medium"},
        {"assetId": "btc", "priceUsd": 68400, "change24hPct": 1.1, "change7dPct": 3.2, "volume24hUsd": 26500000000, "marketCapUsd": 1340000000000, "riskLevel": "low"},
        {"assetId": "eth", "priceUsd": 3620, "change24hPct": 1.7, "change7dPct": 4.1, "volume24hUsd": 14200000000, "marketCapUsd": 435000000000, "riskLevel": "low"},
        {"assetId": "min", "priceUsd": 0.041, "change24hPct": 6.9, "change7dPct": 12.4, "volume24hUsd": 1800000, "marketCapUsd": 42000000, "riskLevel": "medium"},
        {"assetId": "snek", "priceUsd": 0.0014, "change24hPct": -4.2, "change7dPct": 18.6, "volume24hUsd": 950000, "marketCapUsd": 98000000, "riskLevel": "high"},
        {"assetId": "iag", "priceUsd": 0.16, "change24hPct": 3.4, "change7dPct": 9.8, "volume24hUsd": 720000, "marketCapUsd": 61000000, "riskLevel": "medium"},
    ],
    "projects": [
        {"id": "minswap", "name": "Minswap", "ecosystem": "Cardano", "category": "DEX", "maturity": "established", "riskLevel": "medium", "uiTags": ["defi", "dex"], "relatedAssetIds": ["ada", "min"], "description": "Cardano DEX project in demo dataset."},
        {"id": "iagon", "name": "Iagon", "ecosystem": "Cardano", "category": "Storage / Compute", "maturity": "growing", "riskLevel": "medium", "uiTags": ["infrastructure"], "relatedAssetIds": ["ada", "iag"], "description": "Storage and compute narrative."},
        {"id": "midnight", "name": "Midnight", "ecosystem": "Cardano", "category": "Privacy", "maturity": "early", "riskLevel": "high", "uiTags": ["privacy"], "relatedAssetIds": ["ada"], "description": "Early stage privacy narrative."},
        {"id": "snek", "name": "Snek", "ecosystem": "Cardano", "category": "Community / Meme", "maturity": "growing", "riskLevel": "high", "uiTags": ["community"], "relatedAssetIds": ["ada", "snek"], "description": "Community-driven token narrative."},
    ],
    "ecosystemEvents": [
        {"id": "event-001", "date": "2026-05-01", "title": "Cardano DeFi volume increases in demo dataset", "description": "Mock DeFi activity increase.", "relatedProjects": ["minswap"], "impact": "medium"},
        {"id": "event-003", "date": "2026-05-03", "title": "Community token volatility increases", "description": "Mock volatility signal.", "relatedProjects": ["snek"], "impact": "high"},
        {"id": "event-007", "date": "2026-05-07", "title": "Cardano ecosystem watchlist updated", "description": "Momentum and risk rebalance.", "relatedProjects": ["minswap", "iagon", "midnight", "snek"], "impact": "medium"},
    ],
    "riskSignals": [
        {"label": "Low liquidity", "sentiment": "negative", "description": "Smaller assets show lower liquidity.", "relatedAssetIds": ["min", "snek", "iag"], "relatedProjectIds": ["minswap", "snek", "iagon"]},
        {"label": "High volatility", "sentiment": "negative", "description": "Community tokens can move quickly.", "relatedAssetIds": ["snek"], "relatedProjectIds": ["snek"]},
        {"label": "Positive market momentum", "sentiment": "positive", "description": "Large caps have positive weekly movement.", "relatedAssetIds": ["btc", "eth", "ada"], "relatedProjectIds": []},
    ],
    "historicalPrices": [
        {"date": "2026-05-01", "asset": "ADA", "priceUsd": 0.66}, {"date": "2026-05-07", "asset": "ADA", "priceUsd": 0.72},
        {"date": "2026-05-01", "asset": "BTC", "priceUsd": 65500}, {"date": "2026-05-07", "asset": "BTC", "priceUsd": 68400},
        {"date": "2026-05-01", "asset": "ETH", "priceUsd": 3420}, {"date": "2026-05-07", "asset": "ETH", "priceUsd": 3620},
    ],
}


def _resolve_symbol(symbol: str) -> str:
    symbol = symbol.strip().lower()
    for a in _DATA["assets"]:
        if a["symbol"].lower() == symbol or a["id"] == symbol or a["name"].lower() == symbol:
            return a["id"]
    return symbol


def _crypto_process(tool_name: str, result_label: str) -> dict:
    return {
        "toolName": tool_name,
        "resultLabel": result_label,
        "steps": [
            {
                "label": "Thinking",
                "detail": "Classified the prompt and selected the smallest useful data request.",
                "status": "complete",
            },
            {
                "label": "Getting data",
                "detail": f"Called {tool_name} and received structured demo data.",
                "status": "complete",
            },
            {
                "label": "Analyzing",
                "detail": "Mapped the result into the ChainLens canvas contract.",
                "status": "complete",
            },
            {
                "label": "Processing UI",
                "detail": "Updated cryptoBrief in shared agent state.",
                "status": "complete",
            },
        ],
    }


def _canvas_command(
    *,
    tool_name: str,
    tool_call_id: str,
    brief: dict,
    message: str,
) -> Command:
    tool_payload = {
        "message": message,
        "toolName": tool_name,
        "cryptoBrief": brief,
        "cryptoProcess": _crypto_process(tool_name, message),
    }
    return Command(
        update={
            "cryptoBrief": brief,
            "cryptoProcess": tool_payload["cryptoProcess"],
            "lastCryptoTool": tool_name,
            "messages": [
                ToolMessage(
                    content=json.dumps(tool_payload),
                    tool_call_id=tool_call_id,
                )
            ],
        }
    )


@tool
def get_crypto_dataset() -> str:
    """Return the full mock crypto dataset as JSON."""
    return json.dumps(_DATA)


@tool
def get_asset_snapshot(
    asset_symbol: Annotated[str, "Symbol/id/name like ADA, BTC, ETH, MIN, SNEK, IAG"],
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Return one asset + market snapshot + related signals from mock dataset."""
    aid = _resolve_symbol(asset_symbol)
    asset = next((x for x in _DATA["assets"] if x["id"] == aid), None)
    snap = next((x for x in _DATA["marketSnapshots"] if x["assetId"] == aid), None)
    signals = [
        s
        for s in _DATA["riskSignals"]
        if aid in s.get("relatedAssetIds", [])
    ]
    payload = {
        "asset": asset,
        "snapshot": snap,
        "signals": signals,
        "disclaimer": _DATA["disclaimer"],
    }
    brief = build_asset_brief(payload)
    symbol = (asset or {}).get("symbol", asset_symbol.upper())
    return _canvas_command(
        tool_name="get_asset_snapshot",
        tool_call_id=tool_call_id,
        brief=brief,
        message=f"{symbol} snapshot loaded; canvas updated.",
    )


@tool
def compare_assets(
    symbols: Annotated[list[str], "Asset symbols to compare, e.g. ['ADA','BTC','ETH']"],
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Return comparison rows for listed assets."""
    ids = {_resolve_symbol(x) for x in symbols}
    rows = []
    for snap in _DATA["marketSnapshots"]:
        if snap["assetId"] not in ids:
            continue
        asset = next((x for x in _DATA["assets"] if x["id"] == snap["assetId"]), None)
        if not asset:
            continue
        rows.append({
            "asset": asset["name"],
            "symbol": asset["symbol"],
            "category": asset["category"],
            "priceUsd": snap["priceUsd"],
            "change24hPct": snap["change24hPct"],
            "volume24hUsd": snap["volume24hUsd"],
            "marketCapUsd": snap["marketCapUsd"],
            "riskLevel": snap["riskLevel"],
        })
    payload = {"rows": rows, "disclaimer": _DATA["disclaimer"]}
    brief = build_comparison_brief(payload)
    label = ", ".join(row["symbol"] for row in rows) or "assets"
    return _canvas_command(
        tool_name="compare_assets",
        tool_call_id=tool_call_id,
        brief=brief,
        message=f"Compared {label}; canvas updated.",
    )


@tool
def get_cardano_projects(
    category: str = "",
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Return Cardano projects, optionally filtered by category substring."""
    rows = [p for p in _DATA["projects"] if p["ecosystem"] == "Cardano"]
    if category.strip():
        q = category.lower().strip()
        rows = [p for p in rows if q in p["category"].lower() or q in " ".join(p.get("uiTags", [])).lower()]
    payload = {"projects": rows, "disclaimer": _DATA["disclaimer"]}
    brief = build_projects_brief(payload)
    return _canvas_command(
        tool_name="get_cardano_projects",
        tool_call_id=tool_call_id,
        brief=brief,
        message=f"Loaded {len(rows)} Cardano projects; canvas updated.",
    )


@tool
def get_ecosystem_events(
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Return Cardano ecosystem events from mock dataset."""
    payload = {"events": _DATA["ecosystemEvents"], "disclaimer": _DATA["disclaimer"]}
    brief = build_events_brief(payload)
    return _canvas_command(
        tool_name="get_ecosystem_events",
        tool_call_id=tool_call_id,
        brief=brief,
        message=f"Loaded {len(_DATA['ecosystemEvents'])} ecosystem events; canvas updated.",
    )


@tool
def get_risk_signals(
    asset_or_project_id: str = "",
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Return risk/sentiment signals optionally filtered by related asset or project id/symbol."""
    q = _resolve_symbol(asset_or_project_id) if asset_or_project_id.strip() else ""
    rows = _DATA["riskSignals"]
    if q:
        rows = [
            s
            for s in rows
            if q in s.get("relatedAssetIds", []) or q in s.get("relatedProjectIds", [])
        ]
    payload = {"signals": rows, "disclaimer": _DATA["disclaimer"]}
    brief = build_signals_brief(payload)
    return _canvas_command(
        tool_name="get_risk_signals",
        tool_call_id=tool_call_id,
        brief=brief,
        message=f"Loaded {len(rows)} risk signals; canvas updated.",
    )


@tool
def get_token_document(
    token_symbol: Annotated[str, "Token symbol, e.g. ADA, BTC, ETH"],
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Return mocked token research document from fake BFF endpoint."""
    symbol = token_symbol.strip().upper()
    base_url = os.getenv(
        "MOCK_TOKEN_DOCS_URL",
        "http://localhost:4000/api/mock/token-docs",
    ).rstrip("/")
    if "{symbol}" in base_url:
        url = base_url.replace("{symbol}", quote(symbol))
    elif base_url.endswith(":symbol"):
        url = f"{base_url[:-7]}{quote(symbol)}"
    elif base_url.upper().endswith(f"/{symbol}"):
        url = base_url
    else:
        url = f"{base_url}/{quote(symbol)}"

    try:
        with urlopen(url, timeout=8) as res:
            payload = res.read().decode("utf-8")
    except HTTPError as err:
        if err.code == 404:
            # Keep the chat/canvas flow alive even when the mock endpoint has no
            # explicit document for a symbol.
            parsed = {
                "symbol": symbol,
                "document": {
                    "name": symbol,
                    "summary": f"No dedicated mocked research document was found for {symbol}. Returning fallback summary.",
                    "tokenomics": {
                        "supplyModel": "Unknown in demo",
                        "circulatingNarrative": "Unknown in demo",
                        "utility": ["Unknown in demo"],
                    },
                    "risks": ["No explicit mock risk note found for this symbol."],
                    "catalysts": [{"title": "No explicit catalyst in mock store", "horizon": "future"}],
                },
                "warning": "mock token doc endpoint returned 404; using fallback document",
                "disclaimer": "Demo only. Research notes are mocked and do not represent financial advice.",
            }
            brief = build_token_doc_brief(parsed)
            return _canvas_command(
                tool_name="get_token_document",
                tool_call_id=tool_call_id,
                brief=brief,
                message=f"{symbol} fallback token document loaded; canvas updated.",
            )
        parsed = {
                "symbol": symbol,
                "document": {
                    "name": symbol,
                    "summary": f"Could not load {symbol} mock token document: HTTP {err.code} {err.reason}.",
                    "tokenomics": {
                        "supplyModel": "Unknown in demo",
                        "circulatingNarrative": "Unavailable from mock endpoint",
                        "utility": ["Unknown in demo"],
                    },
                    "risks": [f"Mock document fetch failed: HTTP {err.code}"],
                    "catalysts": [{"title": "Retry mock document endpoint", "horizon": "near-term"}],
                },
                "disclaimer": "Demo only. Research notes are mocked and do not represent financial advice.",
            }
        brief = build_token_doc_brief(parsed)
        return _canvas_command(
            tool_name="get_token_document",
            tool_call_id=tool_call_id,
            brief=brief,
            message=f"{symbol} token document failed with HTTP {err.code}; fallback canvas updated.",
        )
    except URLError as err:
        parsed = {
                "symbol": symbol,
                "document": {
                    "name": symbol,
                    "summary": f"Could not reach the mock token document endpoint for {symbol}.",
                    "tokenomics": {
                        "supplyModel": "Unknown in demo",
                        "circulatingNarrative": "Unavailable from mock endpoint",
                        "utility": ["Unknown in demo"],
                    },
                    "risks": [f"Mock document fetch failed: {err}"],
                    "catalysts": [{"title": "Check BFF mock endpoint", "horizon": "near-term"}],
                },
                "disclaimer": "Demo only. Research notes are mocked and do not represent financial advice.",
            }
        brief = build_token_doc_brief(parsed)
        return _canvas_command(
            tool_name="get_token_document",
            tool_call_id=tool_call_id,
            brief=brief,
            message=f"{symbol} token document endpoint unavailable; fallback canvas updated.",
        )

    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        parsed = {
                "symbol": symbol,
                "document": {
                    "name": symbol,
                    "summary": f"The mock token document endpoint returned invalid JSON for {symbol}.",
                    "tokenomics": {
                        "supplyModel": "Unknown in demo",
                        "circulatingNarrative": "Invalid mock endpoint payload",
                        "utility": ["Unknown in demo"],
                    },
                    "risks": ["Mock document payload was invalid JSON."],
                    "catalysts": [{"title": "Fix mock document JSON", "horizon": "near-term"}],
                },
                "disclaimer": "Demo only. Research notes are mocked and do not represent financial advice.",
            }
        brief = build_token_doc_brief(parsed)
        return _canvas_command(
            tool_name="get_token_document",
            tool_call_id=tool_call_id,
            brief=brief,
            message=f"{symbol} token document JSON invalid; fallback canvas updated.",
        )

    brief = build_token_doc_brief(parsed)
    return _canvas_command(
        tool_name="get_token_document",
        tool_call_id=tool_call_id,
        brief=brief,
        message=f"{symbol} token document loaded; canvas updated.",
    )


def load_crypto_tools() -> list:
    return [
        get_crypto_dataset,
        get_asset_snapshot,
        get_token_document,
        compare_assets,
        get_cardano_projects,
        get_ecosystem_events,
        get_risk_signals,
    ]
