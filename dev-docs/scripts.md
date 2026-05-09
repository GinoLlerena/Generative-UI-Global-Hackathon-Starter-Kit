# Scripts

## Main

- `npm run dev` - preflight + infra + ui + bff + agent
- `npm run dev:ui` - Next.js app (`:3010`)
- `npm run dev:bff` - Hono runtime (`:4000`)
- `npm run dev:agent` - LangGraph agent (`:8133`)

## Infra

- `npm run dev:infra` - docker compose up + seed
- `npm run dev:infra:down` - docker compose down

## Checks

- `npm run check-env` - preflight env/system checks
