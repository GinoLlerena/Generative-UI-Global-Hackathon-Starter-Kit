"""Builders for ChainLens crypto canvas payloads."""

from __future__ import annotations

from typing import Any


DEFAULT_DISCLAIMER = (
    "Demo only. Market values are mock data and this is not financial advice."
)


def _trend(value: float) -> str:
    return "positive" if value >= 0 else "negative"


def _risk_trend(risk: str) -> str:
    if risk == "high":
        return "negative"
    if risk == "low":
        return "positive"
    return "neutral"


def _risk_score(risk: str) -> int:
    if risk == "high":
        return 78
    if risk == "low":
        return 28
    return 52


def build_asset_brief(payload: dict[str, Any]) -> dict[str, Any]:
    asset = payload.get("asset") or {}
    snapshot = payload.get("snapshot") or {}
    signals = payload.get("signals") or []
    symbol = asset.get("symbol") or asset.get("name") or "Asset"
    price = float(snapshot.get("priceUsd") or 0)
    change_24h = float(snapshot.get("change24hPct") or 0)
    change_7d = float(snapshot.get("change7dPct") or 0)
    volume = float(snapshot.get("volume24hUsd") or 0)
    market_cap = float(snapshot.get("marketCapUsd") or 0)
    risk = snapshot.get("riskLevel") or "medium"

    return {
        "answer": (
            f"{symbol} is trading near ${price:.2f} with a "
            f"{change_24h:+.1f}% 24h move and {change_7d:+.1f}% over 7d. "
            f"Risk is currently marked {risk} in the demo dataset."
        ),
        "disclaimer": payload.get("disclaimer") or DEFAULT_DISCLAIMER,
        "intent": "asset_brief",
        "uiBlocks": [
            {
                "id": f"{symbol.lower()}-summary",
                "type": "summary_cards",
                "title": f"{symbol} market pulse",
                "order": 1,
                "source": "derived",
                "isMockData": True,
                "data": [
                    {
                        "label": "Price",
                        "value": f"${price:.2f}",
                        "trend": _trend(change_24h),
                        "description": "Current mock spot price",
                    },
                    {
                        "label": "24h",
                        "value": f"{change_24h:+.1f}%",
                        "trend": _trend(change_24h),
                        "description": "Short-term momentum",
                    },
                    {
                        "label": "7d",
                        "value": f"{change_7d:+.1f}%",
                        "trend": _trend(change_7d),
                        "description": "Weekly direction",
                    },
                    {
                        "label": "Volume",
                        "value": f"${volume / 1_000_000:.0f}M",
                        "trend": "neutral",
                        "description": "24h mock trading volume",
                    },
                    {
                        "label": "Market cap",
                        "value": f"${market_cap / 1_000_000_000:.1f}B",
                        "trend": "neutral",
                        "description": "Approximate network value",
                    },
                    {
                        "label": "Risk",
                        "value": risk,
                        "trend": _risk_trend(risk),
                        "description": "Demo risk classification",
                    },
                ],
            },
            {
                "id": f"{symbol.lower()}-risk",
                "type": "risk_panel",
                "title": f"{symbol} risk read",
                "order": 2,
                "source": "derived",
                "isMockData": True,
                "data": {
                    "riskLevel": risk,
                    "score": _risk_score(risk),
                    "reasons": [
                        signal.get("label", "Market signal") for signal in signals
                    ],
                    "mitigations": [
                        "Treat this as demo data only",
                        "Check liquidity and volatility before deeper analysis",
                        "Compare against BTC and ETH for broader market context",
                    ],
                },
            },
            {
                "id": f"{symbol.lower()}-signals",
                "type": "signal_list",
                "title": f"{symbol} signals",
                "order": 3,
                "source": "derived",
                "isMockData": True,
                "data": [
                    {
                        "label": signal.get("label", "Signal"),
                        "sentiment": signal.get("sentiment", "neutral"),
                        "description": signal.get(
                            "description", "No description available."
                        ),
                        "relatedAssetIds": signal.get("relatedAssetIds", []),
                        "relatedProjectIds": signal.get("relatedProjectIds", []),
                    }
                    for signal in signals
                ],
            },
        ],
    }


def build_comparison_brief(payload: dict[str, Any]) -> dict[str, Any]:
    rows = payload.get("rows") or []
    symbols = ", ".join(row.get("symbol", "Asset") for row in rows)
    return {
        "answer": f"Compared {symbols} using the mock market snapshot dataset.",
        "disclaimer": payload.get("disclaimer") or DEFAULT_DISCLAIMER,
        "intent": "asset_comparison",
        "uiBlocks": [
            {
                "id": "comparison",
                "type": "comparison_table",
                "title": "Asset comparison",
                "data": rows,
            }
        ],
    }


def build_projects_brief(payload: dict[str, Any]) -> dict[str, Any]:
    projects = payload.get("projects") or []
    suffix = "" if len(projects) == 1 else "s"
    return {
        "answer": f"Found {len(projects)} Cardano project{suffix} in the current dataset.",
        "disclaimer": payload.get("disclaimer") or DEFAULT_DISCLAIMER,
        "intent": "project_discovery",
        "uiBlocks": [
            {
                "id": "projects",
                "type": "projects_table",
                "title": "Cardano projects",
                "data": projects,
            }
        ],
    }


def build_events_brief(payload: dict[str, Any]) -> dict[str, Any]:
    events = payload.get("events") or []
    suffix = "" if len(events) == 1 else "s"
    return {
        "answer": (
            f"Loaded {len(events)} recent ecosystem event{suffix} from the "
            "mock Cardano feed."
        ),
        "disclaimer": payload.get("disclaimer") or DEFAULT_DISCLAIMER,
        "intent": "recent_events",
        "uiBlocks": [
            {
                "id": "events",
                "type": "timeline",
                "title": "Recent ecosystem events",
                "data": events,
            }
        ],
    }


def build_signals_brief(payload: dict[str, Any]) -> dict[str, Any]:
    signals = payload.get("signals") or []
    suffix = "" if len(signals) == 1 else "s"
    return {
        "answer": (
            f"Collected {len(signals)} risk/sentiment signal{suffix} from the "
            "mock dataset."
        ),
        "disclaimer": payload.get("disclaimer") or DEFAULT_DISCLAIMER,
        "intent": "risk_analysis",
        "uiBlocks": [
            {
                "id": "signals",
                "type": "signal_list",
                "title": "Risk signals",
                "data": signals,
            }
        ],
    }


def build_interactive_risk_brief(payload: dict[str, Any]) -> dict[str, Any]:
    asset = payload.get("asset") or {}
    snapshot = payload.get("snapshot") or {}
    signals = payload.get("signals") or []
    symbol = asset.get("symbol") or asset.get("name") or "Asset"
    risk = snapshot.get("riskLevel") or "medium"

    return {
        "answer": (
            f"Generated an interactive risk view for {symbol} from the mock "
            "dataset. The canvas shows the risk score, drivers, and related "
            "signals without relying on model-authored A2UI JSON."
        ),
        "disclaimer": payload.get("disclaimer") or DEFAULT_DISCLAIMER,
        "intent": "risk_analysis",
        "uiBlocks": [
            {
                "id": f"{str(symbol).lower()}-interactive-risk-summary",
                "type": "summary_cards",
                "title": f"{symbol} interactive risk summary",
                "order": 1,
                "source": "derived",
                "isMockData": True,
                "data": [
                    {
                        "label": "Risk score",
                        "value": str(_risk_score(risk)),
                        "trend": _risk_trend(risk),
                        "description": "Deterministic score from demo risk level",
                    },
                    {
                        "label": "Risk level",
                        "value": str(risk),
                        "trend": _risk_trend(risk),
                        "description": "Mock dataset classification",
                    },
                    {
                        "label": "Signals",
                        "value": str(len(signals)),
                        "trend": "neutral",
                        "description": "Signals included in this generated view",
                    },
                ],
            },
            {
                "id": f"{str(symbol).lower()}-interactive-risk-panel",
                "type": "risk_panel",
                "title": f"{symbol} deterministic risk panel",
                "order": 2,
                "source": "derived",
                "isMockData": True,
                "data": {
                    "riskLevel": risk,
                    "score": _risk_score(risk),
                    "reasons": [
                        signal.get("label", "Market signal") for signal in signals
                    ]
                    or ["No explicit risk signals found for this asset"],
                    "mitigations": [
                        "Treat this generated view as demo data only",
                        "Compare against BTC and ETH before deeper analysis",
                        "Inspect liquidity and volatility before making conclusions",
                    ],
                },
            },
            {
                "id": f"{str(symbol).lower()}-interactive-risk-signals",
                "type": "signal_list",
                "title": f"{symbol} generated signal stack",
                "order": 3,
                "source": "derived",
                "isMockData": True,
                "data": [
                    {
                        "label": signal.get("label", "Signal"),
                        "sentiment": signal.get("sentiment", "neutral"),
                        "description": signal.get(
                            "description", "No description available."
                        ),
                        "relatedAssetIds": signal.get("relatedAssetIds", []),
                        "relatedProjectIds": signal.get("relatedProjectIds", []),
                    }
                    for signal in signals
                ],
            },
        ],
    }


def build_token_doc_brief(payload: dict[str, Any]) -> dict[str, Any]:
    symbol = payload.get("symbol") or "Token"
    document = payload.get("document") or {}
    tokenomics = document.get("tokenomics") or {}
    utility = tokenomics.get("utility") or []
    risks = document.get("risks") or []
    catalysts = document.get("catalysts") or []

    return {
        "answer": document.get("summary")
        or f"{symbol} research note loaded from mocked document endpoint.",
        "disclaimer": payload.get("disclaimer")
        or "Demo only. Research notes are mocked and do not represent financial advice.",
        "intent": "ecosystem_overview",
        "uiBlocks": [
            {
                "id": f"{str(symbol).lower()}-token-doc-summary",
                "type": "summary_cards",
                "title": f"{symbol} research summary",
                "data": [
                    {
                        "label": "Supply model",
                        "value": tokenomics.get("supplyModel", "Unknown"),
                        "trend": "neutral",
                        "description": "From mock token document",
                    },
                    {
                        "label": "Utility items",
                        "value": str(len(utility)),
                        "trend": "positive" if utility else "neutral",
                        "description": "Identified utility categories",
                    },
                    {
                        "label": "Risk points",
                        "value": str(len(risks)),
                        "trend": "negative" if risks else "neutral",
                        "description": "Listed in research note",
                    },
                ],
            },
            {
                "id": f"{str(symbol).lower()}-token-doc-risks",
                "type": "signal_list",
                "title": f"{symbol} key risks",
                "data": [
                    {
                        "label": "Risk",
                        "sentiment": "negative",
                        "description": risk,
                        "relatedAssetIds": [str(symbol).lower()],
                        "relatedProjectIds": [],
                    }
                    for risk in risks
                ],
            },
            {
                "id": f"{str(symbol).lower()}-token-doc-catalysts",
                "type": "timeline",
                "title": f"{symbol} catalysts",
                "data": [
                    {
                        "id": f"{str(symbol).lower()}-catalyst-{idx + 1}",
                        "date": catalyst.get("horizon", "future"),
                        "title": catalyst.get("title", "Catalyst"),
                        "description": "Mock research catalyst",
                        "relatedProjects": [],
                        "impact": "medium",
                    }
                    for idx, catalyst in enumerate(catalysts)
                ],
            },
        ],
    }
