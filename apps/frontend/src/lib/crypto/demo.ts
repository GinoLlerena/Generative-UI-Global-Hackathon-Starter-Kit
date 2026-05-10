export const demoQuestions = [
  { title: "Cardano brief", message: "Give me a quick brief about Cardano today." },
  { title: "Compare majors", message: "Compare ADA, BTC, and ETH." },
  { title: "Projects to watch", message: "Show me Cardano projects to watch." },
  { title: "Risk check", message: "Is SNEK risky?" },
  { title: "Week recap", message: "What happened this week in the Cardano ecosystem?" },
];

const GENERATIVE_UI_SUGGESTION = {
  title: "Generative UI",
  message: "Generate an interactive UI for ADA risk analysis.",
};

export const demoConversationScript = [
  {
    title: "Open with market context",
    message: "Give me a quick brief about Cardano today.",
    expectedTool: "get_asset_snapshot",
    expectedResult: "Summary + risk + signals on canvas.",
  },
  {
    title: "Token research follow-up",
    message: "What is ADA? Include tokenomics, risks, and catalysts.",
    expectedTool: "get_token_document",
    expectedResult: "Token research blocks rendered from mock docs.",
  },
  {
    title: "Cross-market comparison",
    message: "Compare ADA, BTC, and ETH.",
    expectedTool: "compare_assets",
    expectedResult: "Comparison table with category/price/risk fields.",
  },
  {
    title: "Risk drill-down",
    message: "Show risk signals for ADA.",
    expectedTool: "get_risk_signals",
    expectedResult: "Signal list with sentiment and rationale.",
  },
  {
    title: "Ecosystem timing",
    message: "What happened this week in the Cardano ecosystem?",
    expectedTool: "get_ecosystem_events",
    expectedResult: "Timeline view with related projects.",
  },
  {
    title: "Project watchlist",
    message: "Show me Cardano projects to watch.",
    expectedTool: "get_cardano_projects",
    expectedResult: "Projects table with maturity and risk.",
  },
  {
    title: "Generative UI mode",
    message: "Generate an interactive UI for ADA risk analysis.",
    expectedTool: "render_crypto_risk_a2ui",
    expectedResult: "Deterministic interactive risk view rendered in chat/canvas.",
  },
];

export const DEFAULT_DISCLAIMER =
  "Demo only. Market values are mock data and this is not financial advice.";

type Intent =
  | "asset_brief"
  | "asset_comparison"
  | "ecosystem_overview"
  | "project_discovery"
  | "risk_analysis"
  | "recent_events";

type BriefLike = {
  intent: Intent;
  uiBlocks?: Array<{ id?: string }>;
};

type MessageLike = {
  role?: string;
  type?: string;
  content?: string;
};

type Suggestion = { title: string; message: string };

function roleOf(message: MessageLike): string | undefined {
  if (message.role) return message.role;
  if (message.type === "human") return "user";
  if (message.type === "ai") return "assistant";
  return message.type;
}

function latestUserPrompt(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (!item || typeof item !== "object") continue;
    const message = item as MessageLike;
    if (roleOf(message) !== "user") continue;
    if (typeof message.content === "string") return message.content;
  }
  return "";
}

function inferSymbolFromText(text: string): string | null {
  const normalized = text.toLowerCase();
  if (/\b(cardano|ada)\b/.test(normalized)) return "ADA";
  if (/\b(bitcoin|btc)\b/.test(normalized)) return "BTC";
  if (/\b(ethereum|eth)\b/.test(normalized)) return "ETH";
  if (/\b(snek)\b/.test(normalized)) return "SNEK";
  if (/\b(minswap|min)\b/.test(normalized)) return "MIN";
  if (/\b(iagon|iag)\b/.test(normalized)) return "IAG";
  return null;
}

function inferSymbolFromBrief(brief: BriefLike | null): string | null {
  if (!brief || !Array.isArray(brief.uiBlocks) || brief.uiBlocks.length === 0) {
    return null;
  }
  const firstId = brief.uiBlocks[0]?.id ?? "";
  const match = /^([a-z0-9]+)-/i.exec(firstId);
  if (!match) return null;
  return match[1]?.toUpperCase() ?? null;
}

function dedupeSuggestions(input: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  const output: Suggestion[] = [];
  for (const suggestion of input) {
    const key = `${suggestion.title}::${suggestion.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(suggestion);
    if (output.length >= 6) break;
  }
  return output;
}

function withGenerativeUiSuggestion(input: Suggestion[]): Suggestion[] {
  return dedupeSuggestions([
    GENERATIVE_UI_SUGGESTION,
    ...input,
  ]);
}

export function buildContextualSuggestions(
  brief: BriefLike | null,
  messages: unknown,
  isRunning = false,
): Suggestion[] {
  if (isRunning) return [];

  const userPrompt = latestUserPrompt(messages);
  const symbol = inferSymbolFromBrief(brief) ?? inferSymbolFromText(userPrompt) ?? "ADA";

  if (!brief) {
    return withGenerativeUiSuggestion(demoQuestions);
  }

  if (brief.intent === "asset_brief") {
    return withGenerativeUiSuggestion([
      { title: `What Is ${symbol}?`, message: `What is ${symbol}? Include tokenomics, risks, and catalysts.` },
      { title: `Compare ${symbol} Vs BTC/ETH`, message: `Compare ${symbol}, BTC, and ETH.` },
      { title: `${symbol} Risk Signals`, message: `Show risk signals for ${symbol}.` },
      { title: "Cardano Events", message: "What happened this week in the Cardano ecosystem?" },
      { title: "Projects To Watch", message: "Show me Cardano projects to watch." },
    ]);
  }

  if (brief.intent === "ecosystem_overview") {
    return withGenerativeUiSuggestion([
      { title: `Compare ${symbol} Vs BTC/ETH`, message: `Compare ${symbol}, BTC, and ETH.` },
      { title: `${symbol} Market Brief`, message: `Give me a quick market brief for ${symbol}.` },
      { title: `${symbol} Risk Signals`, message: `Show risk signals for ${symbol}.` },
      { title: "Cardano Events", message: "What happened this week in the Cardano ecosystem?" },
      { title: "Projects To Watch", message: "Show me Cardano projects to watch." },
    ]);
  }

  if (brief.intent === "asset_comparison") {
    return withGenerativeUiSuggestion([
      { title: `Deep Dive ${symbol}`, message: `What is ${symbol}? Include tokenomics, risks, and catalysts.` },
      { title: "Cardano Brief", message: "Give me a quick brief about Cardano today." },
      { title: "Risk Delta", message: "Which of ADA, BTC, and ETH has the highest risk in this dataset and why?" },
      { title: "Events Context", message: "What recent ecosystem events could explain the comparison?" },
    ]);
  }

  if (brief.intent === "risk_analysis") {
    return withGenerativeUiSuggestion([
      { title: "Explain Risk Drivers", message: "Explain the top risk drivers in plain language." },
      { title: "Compare Majors", message: "Compare ADA, BTC, and ETH." },
      { title: "Cardano Events", message: "What happened this week in the Cardano ecosystem?" },
      { title: "Projects To Watch", message: "Show me Cardano projects to watch." },
    ]);
  }

  if (brief.intent === "recent_events") {
    return withGenerativeUiSuggestion([
      { title: "Cardano Brief", message: "Give me a quick brief about Cardano today." },
      { title: "Compare Majors", message: "Compare ADA, BTC, and ETH." },
      { title: "Projects To Watch", message: "Show me Cardano projects to watch." },
      { title: "Risk Check", message: "Is SNEK risky?" },
    ]);
  }

  return withGenerativeUiSuggestion([
    ...demoQuestions,
    { title: `What Is ${symbol}?`, message: `What is ${symbol}? Include tokenomics, risks, and catalysts.` },
  ]);
}
