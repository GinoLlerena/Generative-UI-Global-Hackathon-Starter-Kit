export const ALLOWED_CRYPTO_UI_BLOCK_TYPES = [
  "summary_cards",
  "comparison_table",
  "market_chart",
  "risk_panel",
  "project_profile",
  "timeline",
  "projects_table",
  "signal_list",
] as const;

export type CryptoIntent =
  | "asset_brief"
  | "asset_comparison"
  | "ecosystem_overview"
  | "project_discovery"
  | "risk_analysis"
  | "recent_events";

export type CryptoUIBlockType = (typeof ALLOWED_CRYPTO_UI_BLOCK_TYPES)[number];
export type Trend = "positive" | "neutral" | "negative";
export type RiskLevel = "low" | "medium" | "high";

export type SummaryCard = { label: string; value: string; trend: Trend; description: string };
export type ComparisonRow = { asset: string; symbol: string; category: string; priceUsd: number; change24hPct: number; volume24hUsd: number; marketCapUsd: number; riskLevel: RiskLevel };
export type MarketChartPoint = { date: string; asset: string; priceUsd: number };
export type RiskPanelData = { riskLevel: RiskLevel; score: number; reasons: string[]; mitigations: string[] };
export type DemoProject = { id: string; name: string; ecosystem: string; category: string; description: string; maturity: "early" | "growing" | "established"; riskLevel: RiskLevel; uiTags: string[]; relatedAssetIds: string[] };
export type DemoEvent = { id: string; date: string; title: string; description: string; relatedProjects: string[]; impact: RiskLevel };
export type SignalItem = { label: string; sentiment: Trend; description: string; relatedAssetIds: string[]; relatedProjectIds: string[] };

export type CryptoUIBlockMeta = { id: string; type: CryptoUIBlockType; title?: string; description?: string; order?: number; source?: "mock_dataset" | "llm_generated" | "api" | "derived"; isMockData?: boolean };
export type CryptoUIBlock<TType extends CryptoUIBlockType, TData> = CryptoUIBlockMeta & { type: TType; data: TData };

export type CryptoUIBlockUnion =
  | CryptoUIBlock<"summary_cards", SummaryCard[]>
  | CryptoUIBlock<"comparison_table", ComparisonRow[]>
  | CryptoUIBlock<"market_chart", MarketChartPoint[]>
  | CryptoUIBlock<"risk_panel", RiskPanelData>
  | CryptoUIBlock<"project_profile", DemoProject>
  | CryptoUIBlock<"timeline", DemoEvent[]>
  | CryptoUIBlock<"projects_table", DemoProject[]>
  | CryptoUIBlock<"signal_list", SignalItem[]>;

export type CryptoBriefResponse = {
  answer: string;
  disclaimer: string;
  intent: CryptoIntent;
  uiBlocks: CryptoUIBlockUnion[];
};
