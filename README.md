# ChainLens Crypto Intelligence Demo

ChainLens is a crypto-intelligence demo built from the Generative UI Hackathon starter kit.

The app combines:
- CopilotKit v2 chat
- LangGraph Python agent
- Controlled generative UI on a crypto canvas
- Mock token research documents from the BFF

## What the demo does

Ask questions like:
- `What is ADA?`
- `Compare ADA, BTC, and ETH`
- `Show risk signals for ADA`
- `What happened this week in Cardano?`

The agent updates shared state (`cryptoBrief`), and the frontend renders:
- Summary cards
- Comparison tables
- Risk panels
- Signals
- Timelines

## Local run

Prerequisites:
- Node 20+
- Python 3.10+
- `uv`
- Docker (for Intelligence + persistent threads)
- Gemini API key

### 1. Configure env

Set at minimum:

```bash
# repo .env
GEMINI_API_KEY=AIza...

# apps/agent/.env
GEMINI_API_KEY=AIza...
```

Optional legacy Notion integration vars (not required for crypto demo):
- `NOTION_TOKEN`
- `NOTION_LEADS_DATABASE_ID`

### 2. Install

```bash
npm install
```

### 3. Run

```bash
npm run dev
```

Or run services separately:

```bash
npm run dev:ui
npm run dev:bff
npm run dev:agent
```

UI: `http://localhost:3010/crypto`

## Main app paths

- Frontend page: `apps/frontend/src/app/crypto/page.tsx`
- Chat companion render: `apps/frontend/src/components/copilot/CryptoCompanionMessage.tsx`
- Canvas components: `apps/frontend/src/components/crypto-canvas/`
- Crypto parsing/builders: `apps/frontend/src/lib/crypto/`
- Agent tools/state: `apps/agent/src/crypto_tools.py`, `crypto_brief.py`, `crypto_state.py`
- BFF mock token docs endpoint: `apps/bff/src/server.ts` and `apps/bff/src/mock/token-docs/`

## Notes

- Market/token values in this project are mock/demo data.
- This project is not financial advice.
