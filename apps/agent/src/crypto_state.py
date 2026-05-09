"""Crypto canvas state schema for ChainLens.

The crypto demo renders from shared LangGraph/CopilotKit state. Backend
crypto tools update ``cryptoBrief`` directly via ``Command(update=...)`` so
the canvas does not depend on the model making a final frontend tool call.
"""

from __future__ import annotations

from typing import Annotated, Any

from langchain.agents.middleware.types import AgentMiddleware, AgentState
from typing_extensions import NotRequired, TypedDict


def _replace(_left: Any, right: Any) -> Any:
    return right


class CryptoCanvasState(AgentState):
    cryptoBrief: NotRequired[Annotated[dict[str, Any], _replace]]
    cryptoProcess: NotRequired[Annotated[dict[str, Any], _replace]]
    lastCryptoTool: NotRequired[Annotated[str, _replace]]


class CryptoStateMiddleware(AgentMiddleware[CryptoCanvasState, Any]):  # type: ignore[type-arg]
    """Contributes ChainLens canvas fields to LangGraph state snapshots."""

    state_schema = CryptoCanvasState
