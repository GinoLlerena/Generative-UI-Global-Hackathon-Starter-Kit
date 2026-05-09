"""LangGraph entry point for `langgraph dev --port 8133`."""

from __future__ import annotations

import os

from dotenv import load_dotenv

from src.crypto_tools import load_crypto_tools
from src.prompts import build_system_prompt
from src.runtime import build_graph

load_dotenv()

_AGENT_RUNTIME = os.getenv("AGENT_RUNTIME", "gemini-flash-react")
print(f"[runtime] AGENT_RUNTIME={_AGENT_RUNTIME}", flush=True)

_gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
if _AGENT_RUNTIME.startswith("gemini-") and (
    not _gemini_key or _gemini_key.startswith("stub")
):
    print(
        "\n  GEMINI_API_KEY is unset or a stub.\n"
        "   The agent will boot but chat will fail on the first turn.\n",
        flush=True,
    )

backend_tools = load_crypto_tools()
SYSTEM_PROMPT = build_system_prompt("crypto-demo")

_use_noop = (
    _AGENT_RUNTIME.startswith("gemini-")
    and (not _gemini_key or _gemini_key.startswith("stub"))
)

graph = build_graph(
    "noop" if _use_noop else _AGENT_RUNTIME,
    tools=backend_tools,
    system_prompt=SYSTEM_PROMPT,
)


def main() -> None:
    import subprocess

    subprocess.run(
        ["langgraph", "dev", "--port", "8133"],
        check=True,
    )


if __name__ == "__main__":
    main()
