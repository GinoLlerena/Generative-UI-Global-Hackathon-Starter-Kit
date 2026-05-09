# Setup

## Prerequisites

- Node 20+
- Python 3.10+
- `uv`
- Docker (for intelligence + durable threads)
- Gemini API key

## Required env

Set in both `.env` (repo root) and `apps/agent/.env`:

```bash
GEMINI_API_KEY=AIza...
```

Optional (legacy Notion integration only):

```bash
NOTION_TOKEN=...
NOTION_LEADS_DATABASE_ID=...
```

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Service-by-service:

```bash
npm run dev:ui
npm run dev:bff
npm run dev:agent
```

## Endpoints

- UI: `http://localhost:3010/crypto`
- BFF: `http://localhost:4000`
- LangGraph agent: `http://localhost:8133`

## Quick health checks

```bash
curl -i http://localhost:4000/api/copilotkit/info
curl -i http://localhost:4000/api/mock/token-docs/ADA
```
