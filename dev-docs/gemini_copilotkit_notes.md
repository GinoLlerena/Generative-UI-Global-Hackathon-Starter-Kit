# Gemini + CopilotKit Notes (Project Memory)

## Known Gemini-specific failure mode

- Symptom in UI:
  - `Error: Extra data: line 1 column 24 (char 23)`
  - Often appears as `agent_run_error_event`.
- Root cause seen in event stream:
  - Gemini emitted a merged function call name like:
    - `get_asset_snapshotget_risk_signals`
  - And concatenated JSON arguments like:
    - `{"asset_symbol":"ADA"}{"asset_or_project_id":"ADA"}`
  - This breaks JSON parsing (`JSONDecodeError: Extra data`).

## Mitigations applied in this repo

1. Tool policy changed to one backend tool call per turn.
2. `get_asset_snapshot` now returns related `signals` too, reducing need for multi-tool chaining on simple asset briefs.
3. `setCryptoBrief` frontend handler normalizes `component -> type` for `uiBlocks`.
4. Open generative UI is disabled by default to avoid noisy A2UI/sandbox tool injection:
   - `COPILOTKIT_OPEN_GENERATIVE_UI=0`
   - `NEXT_PUBLIC_COPILOTKIT_OPEN_GENERATIVE_UI=0`
5. Stream guard middleware added to sanitize malformed history:
   - Drops orphan/late tool messages and stray persisted App Context.

## Operational checks

- If runs do nothing or return empty assistant chunks:
  - Verify `generateSandboxedUi` is NOT present in run `tools`.
  - Verify a `setCryptoBrief` call appears before `RUN_FINISHED`.
- If `Extra data` appears again:
  - Inspect stream for merged function name + concatenated JSON args.
  - Restart `dev:agent` after prompt/tool changes.

