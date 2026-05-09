# Troubleshooting

## `POST /api/copilotkit/.../run` returns 500

Check all services are running:

```bash
npm run dev:bff
npm run dev:agent
npm run dev:ui
```

And verify proxy target:

```bash
curl -i http://localhost:4000/api/copilotkit/info
```

## UI says connection refused to `/api/copilotkit`

`next.config.ts` rewrites `/api/copilotkit` to `BFF_URL` (default `http://localhost:4000`).
Ensure BFF is listening on that port.

## `What is ADA?` shows fallback document

Check mock docs endpoint:

```bash
curl -i http://localhost:4000/api/mock/token-docs/ADA
```

Expected `200` with Cardano document payload.

## `EADDRINUSE` on port 4000 or 3010

Kill stale process and restart:

```bash
lsof -ti:4000 | xargs kill -9
lsof -ti:3010 | xargs kill -9
```

## Agent chooses wrong tool

Tool routing is controlled in `apps/agent/src/prompts.py`.
For identity questions (`what is <token>`), ensure it maps to `get_token_document`.

## React key warnings in signals/cards

Duplicate list labels can trigger key collisions.
Use stable unique keys (`label + index`) in list renders.
