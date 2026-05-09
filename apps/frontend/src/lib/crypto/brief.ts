import { DEFAULT_DISCLAIMER } from "@/lib/crypto/demo";
import type {
  ComparisonRow,
  CryptoBriefResponse,
  CryptoIntent,
  CryptoUIBlockUnion,
  DemoEvent,
  DemoProject,
  SignalItem,
} from "@/lib/crypto/types";

type MessageLike = {
  role?: string;
  type?: string;
  content?: string;
  toolCallId?: string;
  tool_call_id?: string;
  toolCalls?: Array<{ id?: string; function?: { name?: string } }>;
  tool_calls?: Array<{ id?: string; name?: string; function?: { name?: string } }>;
};

export type CryptoProcessStep = {
  label: string;
  detail: string;
  status: "complete" | "active" | "pending";
};

export type CryptoProcessSummary = {
  toolName: string;
  resultLabel: string;
  rawResult?: unknown;
  steps: CryptoProcessStep[];
};

export function parseToolResult(raw: string | undefined): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const CRYPTO_INTENTS = new Set<CryptoIntent>([
  "asset_brief",
  "asset_comparison",
  "ecosystem_overview",
  "project_discovery",
  "risk_analysis",
  "recent_events",
]);

function normalizeUiBlocks(blocks: unknown): CryptoUIBlockUnion[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((block): block is Record<string, unknown> => !!block && typeof block === "object")
    .map((block) => {
      if (typeof block.type === "string") return block;
      if (typeof block.component === "string") {
        return { ...block, type: block.component };
      }
      return block;
    }) as CryptoUIBlockUnion[];
}

function normalizeCryptoBriefCandidate(candidate: unknown): CryptoBriefResponse | null {
  if (!candidate || typeof candidate !== "object") return null;
  const data = candidate as Partial<CryptoBriefResponse>;
  const uiBlocks = normalizeUiBlocks(data.uiBlocks);
  const answer = typeof data.answer === "string" ? data.answer : "";
  if (!answer && uiBlocks.length === 0) return null;
  const intent = data.intent && CRYPTO_INTENTS.has(data.intent)
    ? data.intent
    : "ecosystem_overview";
  return {
    answer,
    disclaimer:
      typeof data.disclaimer === "string" ? data.disclaimer : DEFAULT_DISCLAIMER,
    intent,
    uiBlocks,
  };
}

function cryptoBriefFromToolPayload(parsed: unknown): CryptoBriefResponse | null {
  if (!parsed || typeof parsed !== "object") return null;
  const payload = parsed as { cryptoBrief?: unknown };
  return normalizeCryptoBriefCandidate(payload.cryptoBrief);
}

function inferToolName(parsed: unknown, fallback = "crypto_tool"): string {
  if (!parsed || typeof parsed !== "object") return fallback;
  if ("toolName" in parsed && typeof (parsed as { toolName?: unknown }).toolName === "string") {
    return (parsed as { toolName: string }).toolName;
  }
  if ("document" in parsed) return "get_token_document";
  if ("snapshot" in parsed) return "get_asset_snapshot";
  if ("rows" in parsed) return "compare_assets";
  if ("projects" in parsed) return "get_cardano_projects";
  if ("events" in parsed) return "get_ecosystem_events";
  if ("signals" in parsed) return "get_risk_signals";
  return fallback;
}

function resultLabel(toolName: string, parsed: unknown): string {
  if (!parsed || typeof parsed !== "object") return "Tool result received";
  if ("message" in parsed && typeof (parsed as { message?: unknown }).message === "string") {
    return (parsed as { message: string }).message;
  }
  if (toolName === "get_token_document" && "symbol" in parsed) {
    const symbol = (parsed as { symbol?: string }).symbol ?? "Token";
    return `${symbol} research document loaded`;
  }
  if (toolName === "get_asset_snapshot" && "asset" in parsed) {
    const asset = (parsed as { asset?: { symbol?: string; name?: string } }).asset;
    return `${asset?.symbol ?? asset?.name ?? "Asset"} snapshot loaded`;
  }
  if (toolName === "compare_assets" && "rows" in parsed && Array.isArray(parsed.rows)) {
    return `${parsed.rows.length} assets compared`;
  }
  if (toolName === "get_cardano_projects" && "projects" in parsed && Array.isArray(parsed.projects)) {
    return `${parsed.projects.length} projects loaded`;
  }
  if (toolName === "get_ecosystem_events" && "events" in parsed && Array.isArray(parsed.events)) {
    return `${parsed.events.length} events loaded`;
  }
  if (toolName === "get_risk_signals" && "signals" in parsed && Array.isArray(parsed.signals)) {
    return `${parsed.signals.length} signals loaded`;
  }
  return "Tool result received";
}

function messageRole(message: MessageLike): string | undefined {
  if (message.role) return message.role;
  if (message.type === "tool") return "tool";
  if (message.type === "ai") return "assistant";
  if (message.type === "human") return "user";
  return message.type;
}

function collectToolNames(messages: MessageLike[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const message of messages) {
    if (messageRole(message) !== "assistant") continue;
    const calls = (message.toolCalls ?? message.tool_calls ?? []) as Array<{
      id?: string;
      name?: string;
      function?: { name?: string };
    }>;
    for (const call of calls) {
      const id = call?.id;
      const name = call?.function?.name ?? call?.name;
      if (id && name) names.set(id, name);
    }
  }
  return names;
}

export function buildCryptoBriefFromMessages(messages: unknown): CryptoBriefResponse | null {
  if (!Array.isArray(messages)) return null;

  const typedMessages = messages.filter(
    (message): message is MessageLike => !!message && typeof message === "object",
  );
  const toolNameById = collectToolNames(typedMessages);

  for (let i = typedMessages.length - 1; i >= 0; i -= 1) {
    const toolMessage = typedMessages[i];
    if (messageRole(toolMessage) !== "tool") continue;

    const toolCallId = toolMessage.toolCallId ?? toolMessage.tool_call_id;
    const toolName = toolCallId ? toolNameById.get(toolCallId) : undefined;
    const parsed = parseToolResult(toolMessage.content);
    if (!parsed || typeof parsed !== "object") continue;

    const payloadBrief = cryptoBriefFromToolPayload(parsed);
    if (payloadBrief) return payloadBrief;

    if (
      (toolName === undefined || toolName === "get_token_document") &&
      "document" in parsed &&
      parsed.document &&
      typeof parsed.document === "object"
    ) {
      const data = parsed as {
        symbol?: string;
        document: {
          name?: string;
          summary?: string;
          tokenomics?: {
            supplyModel?: string;
            circulatingNarrative?: string;
            utility?: string[];
          };
          risks?: string[];
          catalysts?: Array<{ title?: string; horizon?: string }>;
        };
        disclaimer?: string;
      };
      const symbol = data.symbol ?? data.document.name ?? "Token";
      const utility = data.document.tokenomics?.utility ?? [];
      const risks = data.document.risks ?? [];
      const catalysts = data.document.catalysts ?? [];
      return {
        answer:
          data.document.summary ??
          `${symbol} research note loaded from mocked document endpoint.`,
        disclaimer: data.disclaimer ?? DEFAULT_DISCLAIMER,
        intent: "ecosystem_overview",
        uiBlocks: [
          {
            id: `${symbol.toLowerCase()}-token-doc-summary`,
            type: "summary_cards",
            title: `${symbol} research summary`,
            data: [
              {
                label: "Supply model",
                value: data.document.tokenomics?.supplyModel ?? "Unknown",
                trend: "neutral",
                description: "From mock token document",
              },
              {
                label: "Utility items",
                value: String(utility.length),
                trend: utility.length > 0 ? "positive" : "neutral",
                description: "Identified utility categories",
              },
              {
                label: "Risk points",
                value: String(risks.length),
                trend: risks.length > 0 ? "negative" : "neutral",
                description: "Listed in research note",
              },
            ],
          },
          {
            id: `${symbol.toLowerCase()}-token-doc-risks`,
            type: "signal_list",
            title: `${symbol} key risks`,
            data: risks.map((risk) => ({
              label: "Risk",
              sentiment: "negative",
              description: risk,
              relatedAssetIds: [String(symbol).toLowerCase()],
              relatedProjectIds: [],
            })),
          },
          {
            id: `${symbol.toLowerCase()}-token-doc-catalysts`,
            type: "timeline",
            title: `${symbol} catalysts`,
            data: catalysts.map((catalyst, idx) => ({
              id: `${String(symbol).toLowerCase()}-catalyst-${idx + 1}`,
              date: catalyst.horizon ?? "future",
              title: catalyst.title ?? "Catalyst",
              description: "Mock research catalyst",
              relatedProjects: [],
              impact: "medium",
            })),
          },
        ],
      };
    }

    if (
      (toolName === undefined || toolName === "get_token_document") &&
      "symbol" in parsed &&
      "error" in parsed
    ) {
      const data = parsed as {
        symbol?: string;
        error?: string;
        disclaimer?: string;
      };
      const symbol = data.symbol ?? "Token";
      return {
        answer: `I could not load the ${symbol} token document from the mock endpoint, but the run completed. Error: ${data.error ?? "unknown error"}.`,
        disclaimer: data.disclaimer ?? DEFAULT_DISCLAIMER,
        intent: "ecosystem_overview",
        uiBlocks: [
          {
            id: `${String(symbol).toLowerCase()}-token-doc-error`,
            type: "summary_cards",
            title: `${symbol} research status`,
            data: [
              {
                label: "Document fetch",
                value: "failed",
                trend: "negative",
                description: "Mock endpoint returned an error",
              },
            ],
          },
        ],
      };
    }

    if (
      (toolName === undefined || toolName === "get_asset_snapshot") &&
      "snapshot" in parsed &&
      parsed.snapshot &&
      typeof parsed.snapshot === "object"
    ) {
      const data = parsed as {
        asset?: { symbol?: string; name?: string };
        snapshot: {
          priceUsd?: number;
          change24hPct?: number;
          change7dPct?: number;
          volume24hUsd?: number;
          marketCapUsd?: number;
          riskLevel?: "low" | "medium" | "high";
        };
        signals?: Array<{
          label?: string;
          sentiment?: "positive" | "neutral" | "negative";
          description?: string;
          relatedAssetIds?: string[];
          relatedProjectIds?: string[];
        }>;
        disclaimer?: string;
      };
      const symbol = data.asset?.symbol ?? data.asset?.name ?? "Asset";
      const price = data.snapshot.priceUsd ?? 0;
      const chg = data.snapshot.change24hPct ?? 0;
      const week = data.snapshot.change7dPct ?? 0;
      const volume = data.snapshot.volume24hUsd ?? 0;
      const mcap = data.snapshot.marketCapUsd ?? 0;
      const risk = data.snapshot.riskLevel ?? "medium";
      return {
        answer: `${symbol} is trading near $${price.toFixed(2)} with a ${chg >= 0 ? "+" : ""}${chg.toFixed(1)}% 24h move and ${week >= 0 ? "+" : ""}${week.toFixed(1)}% over 7d. Risk is currently marked ${risk} in the demo dataset.`,
        disclaimer: data.disclaimer ?? DEFAULT_DISCLAIMER,
        intent: "asset_brief",
        uiBlocks: [
          {
            id: `${symbol.toLowerCase()}-summary`,
            type: "summary_cards",
            title: `${symbol} market pulse`,
            order: 1,
            source: "derived",
            isMockData: true,
            data: [
              { label: "Price", value: `$${price.toFixed(2)}`, trend: chg >= 0 ? "positive" : "negative", description: "Current mock spot price" },
              { label: "24h", value: `${chg >= 0 ? "+" : ""}${chg.toFixed(1)}%`, trend: chg >= 0 ? "positive" : "negative", description: "Short-term momentum" },
              { label: "7d", value: `${week >= 0 ? "+" : ""}${week.toFixed(1)}%`, trend: week >= 0 ? "positive" : "negative", description: "Weekly direction" },
              { label: "Volume", value: `$${(volume / 1_000_000).toFixed(0)}M`, trend: "neutral", description: "24h mock trading volume" },
              { label: "Market cap", value: `$${(mcap / 1_000_000_000).toFixed(1)}B`, trend: "neutral", description: "Approximate network value" },
              { label: "Risk", value: risk, trend: risk === "high" ? "negative" : risk === "low" ? "positive" : "neutral", description: "Demo risk classification" },
            ],
          },
          {
            id: `${symbol.toLowerCase()}-risk`,
            type: "risk_panel",
            title: `${symbol} risk read`,
            order: 2,
            source: "derived",
            isMockData: true,
            data: {
              riskLevel: risk,
              score: risk === "high" ? 78 : risk === "low" ? 28 : 52,
              reasons: (data.signals ?? []).map((signal) => signal.label ?? "Market signal"),
              mitigations: [
                "Treat this as demo data only",
                "Check liquidity and volatility before deeper analysis",
                "Compare against BTC and ETH for broader market context",
              ],
            },
          },
          {
            id: `${symbol.toLowerCase()}-signals`,
            type: "signal_list",
            title: `${symbol} signals`,
            order: 3,
            source: "derived",
            isMockData: true,
            data: (data.signals ?? []).map((signal) => ({
              label: signal.label ?? "Signal",
              sentiment: signal.sentiment ?? "neutral",
              description: signal.description ?? "No description available.",
              relatedAssetIds: signal.relatedAssetIds ?? [],
              relatedProjectIds: signal.relatedProjectIds ?? [],
            })),
          },
        ],
      };
    }

    if (
      (toolName === undefined || toolName === "compare_assets") &&
      "rows" in parsed &&
      Array.isArray(parsed.rows)
    ) {
      const data = parsed as {
        rows: ComparisonRow[];
        disclaimer?: string;
      };
      return {
        answer: `Compared ${data.rows.map((row) => row.symbol).join(", ")} using the mock market snapshot dataset.`,
        disclaimer: data.disclaimer ?? DEFAULT_DISCLAIMER,
        intent: "asset_comparison",
        uiBlocks: [{ id: "comparison", type: "comparison_table", title: "Asset comparison", data: data.rows }],
      };
    }

    if (
      (toolName === undefined || toolName === "get_cardano_projects") &&
      "projects" in parsed &&
      Array.isArray(parsed.projects)
    ) {
      const data = parsed as { projects: DemoProject[]; disclaimer?: string };
      return {
        answer: `Found ${data.projects.length} Cardano project${data.projects.length === 1 ? "" : "s"} in the current dataset.`,
        disclaimer: data.disclaimer ?? DEFAULT_DISCLAIMER,
        intent: "project_discovery",
        uiBlocks: [{ id: "projects", type: "projects_table", title: "Cardano projects", data: data.projects }],
      };
    }

    if (
      (toolName === undefined || toolName === "get_ecosystem_events") &&
      "events" in parsed &&
      Array.isArray(parsed.events)
    ) {
      const data = parsed as { events: DemoEvent[]; disclaimer?: string };
      return {
        answer: `Loaded ${data.events.length} recent ecosystem event${data.events.length === 1 ? "" : "s"} from the mock Cardano feed.`,
        disclaimer: data.disclaimer ?? DEFAULT_DISCLAIMER,
        intent: "recent_events",
        uiBlocks: [{ id: "events", type: "timeline", title: "Recent ecosystem events", data: data.events }],
      };
    }

    if (
      (toolName === undefined || toolName === "get_risk_signals") &&
      "signals" in parsed &&
      Array.isArray(parsed.signals)
    ) {
      const data = parsed as { signals: SignalItem[]; disclaimer?: string };
      return {
        answer: `Collected ${data.signals.length} risk/sentiment signal${data.signals.length === 1 ? "" : "s"} from the mock dataset.`,
        disclaimer: data.disclaimer ?? DEFAULT_DISCLAIMER,
        intent: "risk_analysis",
        uiBlocks: [{ id: "signals", type: "signal_list", title: "Risk signals", data: data.signals }],
      };
    }
  }

  return null;
}

export function buildCryptoProcessFromMessages(
  messages: unknown,
  brief?: CryptoBriefResponse | null,
): CryptoProcessSummary | null {
  if (!Array.isArray(messages)) return null;

  const typedMessages = messages.filter(
    (message): message is MessageLike => !!message && typeof message === "object",
  );
  const toolNameById = collectToolNames(typedMessages);

  for (let i = typedMessages.length - 1; i >= 0; i -= 1) {
    const toolMessage = typedMessages[i];
    if (messageRole(toolMessage) !== "tool") continue;

    const toolCallId = toolMessage.toolCallId ?? toolMessage.tool_call_id;
    const parsed = parseToolResult(toolMessage.content);
    const knownName = toolCallId ? toolNameById.get(toolCallId) : undefined;
    const toolName = inferToolName(parsed, knownName);
    const blocks = brief?.uiBlocks.length ?? 0;

    return {
      toolName,
      resultLabel: resultLabel(toolName, parsed),
      rawResult: parsed,
      steps: [
        {
          label: "Thinking",
          detail: "Classified the prompt and selected the smallest useful data request.",
          status: "complete",
        },
        {
          label: "Getting data",
          detail: `Called ${toolName} and received a structured result.`,
          status: "complete",
        },
        {
          label: "Analyzing",
          detail: brief
            ? `Mapped the result to ${brief.intent.replaceAll("_", " ")} and extracted the relevant signals.`
            : "Parsed the tool response and prepared it for presentation.",
          status: "complete",
        },
        {
          label: "Processing UI",
          detail: blocks > 0
            ? `Prepared ${blocks} canvas block${blocks === 1 ? "" : "s"} plus this chat result.`
            : "Prepared the chat result.",
          status: "complete",
        },
      ],
    };
  }

  return null;
}

export function buildCryptoLiveProcess(
  messages: unknown,
  brief?: CryptoBriefResponse | null,
  isRunning = false,
): CryptoProcessSummary | null {
  if (!Array.isArray(messages)) return null;

  const typedMessages = messages.filter(
    (message): message is MessageLike => !!message && typeof message === "object",
  );

  let latestToolName = "selecting_tool";
  let latestToolResult: unknown;
  for (let i = typedMessages.length - 1; i >= 0; i -= 1) {
    const candidate = typedMessages[i];
    if (messageRole(candidate) !== "tool") continue;
    const parsed = parseToolResult(candidate.content);
    latestToolResult = parsed;
    latestToolName = inferToolName(parsed, latestToolName);
    break;
  }
  const hasToolResult = latestToolResult !== undefined;
  const hasBrief = Boolean(brief);

  if (!isRunning) {
    if (!hasToolResult) return null;
    return buildCryptoProcessFromMessages(messages, brief);
  }

  if (!hasToolResult) {
    return {
      toolName: latestToolName,
      resultLabel: "Preparing request",
      steps: [
        {
          label: "Thinking",
          detail: "Classifying the prompt and deciding which crypto dataset tool to use.",
          status: "active",
        },
        {
          label: "Getting data",
          detail: "Waiting for the selected backend tool to return structured data.",
          status: "pending",
        },
        {
          label: "Analyzing",
          detail: "Will map the tool result to an intelligence view.",
          status: "pending",
        },
        {
          label: "Processing UI",
          detail: "Will prepare the chat companion and canvas blocks.",
          status: "pending",
        },
      ],
    };
  }

  if (!hasBrief) {
    return {
      toolName: latestToolName,
      resultLabel: resultLabel(latestToolName, latestToolResult),
      rawResult: latestToolResult,
      steps: [
        {
          label: "Thinking",
          detail: "Request understood and tool selected.",
          status: "complete",
        },
        {
          label: "Getting data",
          detail: `Received data from ${latestToolName}.`,
          status: "complete",
        },
        {
          label: "Analyzing",
          detail: "Extracting market and risk signals from the tool response.",
          status: "active",
        },
        {
          label: "Processing UI",
          detail: "Preparing chat/card output.",
          status: "pending",
        },
      ],
    };
  }

  const resolvedBrief = brief as CryptoBriefResponse;
  return {
    toolName: latestToolName,
    resultLabel: resultLabel(latestToolName, latestToolResult),
    rawResult: latestToolResult,
    steps: [
      {
        label: "Thinking",
        detail: "Prompt classified and response plan selected.",
        status: "complete",
      },
      {
        label: "Getting data",
        detail: `Structured data loaded via ${latestToolName}.`,
        status: "complete",
      },
      {
        label: "Analyzing",
        detail: `Mapped result to ${resolvedBrief.intent.replaceAll("_", " ")}.`,
        status: "complete",
      },
      {
        label: "Processing UI",
        detail: "Rendering final chat result and canvas state.",
        status: "active",
      },
    ],
  };
}

export function getCompanionReasoning(brief: CryptoBriefResponse): string[] {
  const blockNames = brief.uiBlocks.map((block) => block.title ?? block.type);
  return [
    "Read the latest backend tool result from the run.",
    `Mapped it to the ${brief.intent.replaceAll("_", " ")} view.`,
    `Prepared ${blockNames.length} canvas block${blockNames.length === 1 ? "" : "s"}: ${blockNames.join(", ")}.`,
  ];
}
