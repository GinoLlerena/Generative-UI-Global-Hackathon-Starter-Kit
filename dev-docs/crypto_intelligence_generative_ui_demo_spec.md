# ChainLens Crypto Intelligence Demo Spec (Current)

## Objective

Deliver a reliable crypto copilot demo where chat prompts drive a structured intelligence canvas.

## Product behavior

- User asks crypto questions in chat.
- Agent selects exactly one backend crypto tool per turn.
- Tool updates shared state with `cryptoBrief` + `cryptoProcess`.
- Frontend renders canvas blocks and companion summary from that state.

## Core intents

- `asset_brief`
- `asset_comparison`
- `ecosystem_overview`
- `project_discovery`
- `risk_analysis`
- `recent_events`

## Backend contract

Tools return `Command(update=...)` with:
- `cryptoBrief`
- `cryptoProcess`
- `lastCryptoTool`
- `messages` (tool summary payload)

## Frontend contract

`cryptoBrief` shape:
- `answer`
- `disclaimer`
- `intent`
- `uiBlocks`

`uiBlocks` supported:
- `summary_cards`
- `comparison_table`
- `market_chart`
- `risk_panel`
- `project_profile`
- `timeline`
- `projects_table`
- `signal_list`

## Data sources

- Market/project/signal/event mock data from agent-side dataset
- Token research docs from BFF mock endpoint `/api/mock/token-docs/:symbol`

## UX requirements

- Streaming process card shown only while run is active.
- Companion summary card shown after each assistant turn.
- Context-aware suggestions based on current `cryptoBrief` intent/symbol.
- No duplicate-key warnings in canvas lists.

## Acceptance checklist

1. `What is ADA?` routes to `get_token_document`.
2. `Compare ADA, BTC, ETH.` routes to `compare_assets`.
3. Event stream includes `RUN_FINISHED`.
4. `STATE_SNAPSHOT` contains valid `cryptoBrief`.
5. Canvas renders even if assistant text is empty.
6. Suggestions update after each completed turn.
