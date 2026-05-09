"""StreamGuardMiddleware: sanitize malformed message histories.

Observed failure mode in local CopilotKit/LangGraph runs:
- assistant emits multiple tool calls
- only a subset of tool responses arrive before the next assistant turn
- late/orphan tool messages get appended afterwards

That breaks turn coherence and can surface as incomplete SSE streams or
frontend runtime errors. This middleware strips malformed tool-message
segments before each model call and logs what it removed.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from langchain.agents.middleware.types import AgentMiddleware, ModelRequest, ModelResponse


@dataclass
class _SanitizeStats:
    dropped_orphan_tools: int = 0
    dropped_late_tools: int = 0
    dropped_app_context_system: int = 0
    reset_incomplete_tool_phase: int = 0

    @property
    def changed(self) -> bool:
        return any(
            (
                self.dropped_orphan_tools,
                self.dropped_late_tools,
                self.dropped_app_context_system,
                self.reset_incomplete_tool_phase,
            )
        )


class StreamGuardMiddleware(AgentMiddleware):
    """Defensively normalizes message history before model invocation."""

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelResponse:
        req = self._sanitize_request(request)
        return handler(req)

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[ModelResponse]],
    ) -> ModelResponse:
        req = self._sanitize_request(request)
        return await handler(req)

    def _sanitize_request(self, request: ModelRequest) -> ModelRequest:
        messages = list(getattr(request, "messages", []) or [])
        cleaned, stats = _sanitize_messages(messages)
        if stats.changed:
            print(
                "[stream_guard] sanitized messages: "
                f"orphan_tools={stats.dropped_orphan_tools} "
                f"late_tools={stats.dropped_late_tools} "
                f"app_context_system={stats.dropped_app_context_system} "
                f"incomplete_phase_resets={stats.reset_incomplete_tool_phase} "
                f"before={len(messages)} after={len(cleaned)}",
                flush=True,
            )
            return request.override(messages=cleaned)
        return request


def _sanitize_messages(messages: list[Any]) -> tuple[list[Any], _SanitizeStats]:
    stats = _SanitizeStats()
    out: list[Any] = []
    pending_tool_ids: set[str] = set()

    for msg in messages:
        role = _msg_role(msg)
        content = _msg_content(msg)

        # Drop synthetic "App Context" system messages if they were persisted
        # into thread history; context should be per-run metadata, not chat
        # history content.
        if role == "system" and isinstance(content, str) and content.startswith("App Context:"):
            stats.dropped_app_context_system += 1
            continue

        if role == "assistant":
            tool_ids = _assistant_tool_call_ids(msg)
            if pending_tool_ids:
                # We expected tool responses but got another assistant turn.
                pending_tool_ids.clear()
                stats.reset_incomplete_tool_phase += 1
            if tool_ids:
                pending_tool_ids = set(tool_ids)
            out.append(msg)
            continue

        if role == "tool":
            tool_call_id = _tool_call_id(msg)
            if not pending_tool_ids:
                stats.dropped_orphan_tools += 1
                continue
            if not tool_call_id or tool_call_id not in pending_tool_ids:
                stats.dropped_late_tools += 1
                continue
            pending_tool_ids.discard(tool_call_id)
            out.append(msg)
            continue

        out.append(msg)

    return out, stats


def _msg_role(msg: Any) -> str:
    role = getattr(msg, "type", None) or getattr(msg, "role", None)
    if isinstance(role, str):
        return role
    if isinstance(msg, dict):
        role = msg.get("type") or msg.get("role")
        if isinstance(role, str):
            return role
    return ""


def _msg_content(msg: Any) -> Any:
    if isinstance(msg, dict):
        return msg.get("content")
    return getattr(msg, "content", None)


def _assistant_tool_call_ids(msg: Any) -> list[str]:
    tool_calls = None
    if isinstance(msg, dict):
        tool_calls = msg.get("tool_calls") or msg.get("toolCalls")
    else:
        tool_calls = getattr(msg, "tool_calls", None) or getattr(msg, "toolCalls", None)
    if not tool_calls:
        return []

    ids: list[str] = []
    for tc in tool_calls:
        tc_id = None
        if isinstance(tc, dict):
            tc_id = tc.get("id")
        else:
            tc_id = getattr(tc, "id", None)
        if tc_id:
            ids.append(str(tc_id))
    return ids


def _tool_call_id(msg: Any) -> str | None:
    if isinstance(msg, dict):
        val = msg.get("tool_call_id") or msg.get("toolCallId")
        return str(val) if val else None
    val = getattr(msg, "tool_call_id", None) or getattr(msg, "toolCallId", None)
    return str(val) if val else None

