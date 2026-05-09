# Customization

## Frontend

Primary page:
- `apps/frontend/src/app/crypto/page.tsx`

Main extension points:
- `useFrontendTool(...)` for explicit frontend tools like `setCryptoBrief`
- `useDefaultRenderTool(...)` for fallback rendering of tool calls
- `useConfigureSuggestions(...)` for context-aware suggestions
- Companion render: `apps/frontend/src/components/copilot/CryptoCompanionMessage.tsx`

## Canvas blocks

Add or update block renderers in:
- `apps/frontend/src/components/crypto-canvas/CryptoCanvas.tsx`

Supported block union is in:
- `apps/frontend/src/lib/crypto/types.ts`

## Agent

Core files:
- `apps/agent/src/prompts.py` (tool-routing policy)
- `apps/agent/src/crypto_tools.py` (backend tools)
- `apps/agent/src/crypto_brief.py` (response/UI block builders)
- `apps/agent/src/crypto_state.py` (state schema)
- `apps/agent/src/runtime.py` (middleware + model config)

Best-practice path:
- Backend tool returns `Command(update={"cryptoBrief": ...})`
- Frontend renders `state.cryptoBrief`
- Keep frontend tool fallback for compatibility only
