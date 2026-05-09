import { serve } from "@hono/node-server";
import {
  CopilotRuntime,
  CopilotKitIntelligence,
  createCopilotEndpoint,
} from "@copilotkit/runtime/v2";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const intelligence = new CopilotKitIntelligence({
  apiKey:
    process.env.INTELLIGENCE_API_KEY ?? "cpk_sPRVSEED_seed0privat0longtoken00",
  apiUrl: process.env.INTELLIGENCE_API_URL ?? "http://localhost:4203",
  wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL ?? "ws://localhost:4403",
});
const disableIntelligence = process.env.COPILOTKIT_DISABLE_INTELLIGENCE === "1";
const enableMcpApps = process.env.COPILOTKIT_ENABLE_MCP_APPS === "1";
const enableOpenGenerativeUi = process.env.COPILOTKIT_OPEN_GENERATIVE_UI === "1";
const enableA2uiTool = process.env.COPILOTKIT_ENABLE_A2UI_TOOL === "1";

const agent = new LangGraphAgent({
  deploymentUrl:
    process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:8123",
  graphId: "default",
  langsmithApiKey: process.env.LANGSMITH_API_KEY ?? "",
  // 60 (vs LangGraph default 25) leaves headroom for the deepagents planner
  // loop on multi-step turns like "draft email + queue".
  assistantConfig: {
    recursion_limit: Number(process.env.LANGGRAPH_RECURSION_LIMIT ?? 60),
  },
});

const copilotApp = createCopilotEndpoint({
  basePath: "/api/copilotkit",
  runtime: new CopilotRuntime({
    ...(disableIntelligence ? {} : { intelligence }),
    identifyUser: () => ({ id: "default", name: "Hackathon User" }),
    licenseToken: process.env.COPILOTKIT_LICENSE_TOKEN,
    agents: { default: agent },
    openGenerativeUI: enableOpenGenerativeUi,
    a2ui: { injectA2UITool: enableA2uiTool },
    ...(enableMcpApps
      ? {
          mcpApps: {
            servers: [
              {
                type: "http" as const,
                url: process.env.MCP_SERVER_URL || "http://localhost:3001/mcp",
                serverId: "manufact_local",
              },
            ],
          },
        }
      : {}),
  }),
});

const app = new Hono();
app.route("/", copilotApp);

// Rewrite known 5xx error bodies into structured `{ error, hint, command }`
// payloads the UI can render as actionable toasts. Conservative matching —
// we only remap when we can identify the failure from the body, so unknown
// 5xx errors fall through unchanged.
app.use("*", async (c, next) => {
  await next();
  const status = c.res.status;
  if (status < 500 || status > 599) return;
  const cloned = c.res.clone();
  const ctype = cloned.headers.get("content-type") || "";
  if (!ctype.includes("json") && !ctype.includes("text")) return;
  let body: string;
  try {
    body = await cloned.text();
  } catch {
    return;
  }
  console.error(
    `[copilotkit:bff] ${c.req.method} ${c.req.path} -> ${status} ` +
      `body=${body.slice(0, 400).replace(/\s+/g, " ")}`,
  );
  const isThreadFkey =
    body.includes("threads_user_id_fkey") ||
    (body.includes("Failed to initialize thread") &&
      body.includes("user_id"));
  if (isThreadFkey) {
    const remapped = {
      error: "Postgres user seed missing",
      hint: "Run `npm run seed` to seed the default user, then retry.",
      command: "npm run seed",
    };
    c.res = new Response(JSON.stringify(remapped), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    return;
  }

  // AgentThreadLockedError: a prior run errored mid-stream and the LangGraph
  // SDK's per-thread lock didn't release. The thread is unrecoverable; the
  // hint tells the user to start a new conversation.
  const isThreadLocked =
    body.includes("AgentThreadLockedError") ||
    /Thread\s+[0-9a-f-]{36}\s+is locked/i.test(body);
  if (isThreadLocked) {
    const remapped = {
      error: "Thread is locked",
      hint:
        "A previous turn errored mid-stream and didn't release the run " +
        "lock. Start a new conversation (sidebar → +) to continue.",
      command: "new-thread",
    };
    c.res = new Response(JSON.stringify(remapped), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    return;
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_DOCS_DIR = path.join(__dirname, "./mock/token-docs");

function loadTokenDoc(symbol: string): Record<string, unknown> {
  const fileName = `${symbol.toLowerCase()}.json`;
  const fallbackName = "fallback.json";
  const candidatePath = path.join(TOKEN_DOCS_DIR, fileName);
  const fallbackPath = path.join(TOKEN_DOCS_DIR, fallbackName);

  try {
    return JSON.parse(readFileSync(candidatePath, "utf8")) as Record<string, unknown>;
  } catch {
    return JSON.parse(readFileSync(fallbackPath, "utf8")) as Record<string, unknown>;
  }
}

app.get("/api/mock/token-docs/:symbol", (c) => {
  const symbol = String(c.req.param("symbol") ?? "")
    .trim()
    .toUpperCase();
  const doc = { ...loadTokenDoc(symbol || "unknown"), symbol: symbol || "UNKNOWN" };

  return c.json({
    symbol,
    document: doc,
    disclaimer:
      "Demo only. Research notes are mocked and do not represent financial advice.",
  });
});

const port = Number(process.env.PORT) || 4000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`BFF ready at http://localhost:${port}`);
});
