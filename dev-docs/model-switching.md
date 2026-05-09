# Model Switching

Default model is configured in:
- `apps/agent/src/runtime.py`

Current default target is Gemini. To switch model, update the LangChain chat model initialization in runtime and restart `dev:agent`.

After switching models, validate:
1. Tool call selection remains deterministic (`what is ADA` -> `get_token_document`).
2. Tool args JSON is valid (no merged function-call args).
3. `cryptoBrief` state is still produced and rendered in canvas/chat.
