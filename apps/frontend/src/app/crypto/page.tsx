"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  CopilotChat,
  CopilotChatConfigurationProvider,
  useAgent,
  useConfigureSuggestions,
  useDefaultRenderTool,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { CryptoSuggestionView } from "@/components/copilot/CryptoSuggestionView";
import { CryptoBriefCompanion } from "@/components/crypto-canvas/CryptoBriefCompanion";
import { CryptoCanvas } from "@/components/crypto-canvas/CryptoCanvas";
import { ToolFallbackCard } from "@/components/copilot/ToolFallbackCard";
import {
  buildCryptoBriefFromMessages,
  buildCryptoProcessFromMessages,
  parseToolResult,
} from "@/lib/crypto/brief";
import {
  DEFAULT_DISCLAIMER,
  buildContextualSuggestions,
  demoConversationScript,
  demoQuestions,
} from "@/lib/crypto/demo";
import type { CryptoBriefResponse } from "@/lib/crypto/types";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

const briefSchema = z.object({
  answer: z.string(),
  disclaimer: z.string(),
  intent: z.enum([
    "asset_brief",
    "asset_comparison",
    "ecosystem_overview",
    "project_discovery",
    "risk_analysis",
    "recent_events",
  ]),
  // Gemini tool schemas require concrete array item types; `z.any()` produces
  // an invalid function declaration for this field.
  uiBlocks: z.array(z.object({}).passthrough()),
});

function normalizeUiBlocks(blocks: unknown): unknown[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block) => {
    if (!block || typeof block !== "object") return block;
    const candidate = block as Record<string, unknown>;
    if (typeof candidate.type === "string") return candidate;
    if (typeof candidate.component === "string") {
      return { ...candidate, type: candidate.component };
    }
    return candidate;
  });
}

function normalizeCryptoBrief(brief: unknown): CryptoBriefResponse | null {
  if (!brief || typeof brief !== "object") return null;
  const candidate = brief as Partial<CryptoBriefResponse>;
  const uiBlocks = normalizeUiBlocks(candidate.uiBlocks) as CryptoBriefResponse["uiBlocks"];
  const answer = typeof candidate.answer === "string" ? candidate.answer : "";
  if (!answer && uiBlocks.length === 0) return null;
  return {
    answer,
    disclaimer:
      typeof candidate.disclaimer === "string"
        ? candidate.disclaimer
        : DEFAULT_DISCLAIMER,
    intent: candidate.intent ?? "ecosystem_overview",
    uiBlocks,
  };
}

function briefSignature(brief: CryptoBriefResponse | null): string {
  if (!brief) return "";
  return [
    brief.intent,
    brief.answer,
    brief.uiBlocks.map((block) => block.id).join(","),
  ].join("|");
}

function CanvasInner() {
  const { agent } = useAgent();
  const state = (agent?.state as { cryptoBrief?: unknown; messages?: unknown[] }) ?? {};
  const messageSource =
    (Array.isArray(state.messages) && state.messages.length > 0
      ? state.messages
      : agent?.messages) ?? [];
  const derivedBrief = buildCryptoBriefFromMessages(messageSource);
  const stateBrief = normalizeCryptoBrief(state.cryptoBrief);
  const derivedSignature = briefSignature(derivedBrief);
  const stateSignature = briefSignature(stateBrief);
  const brief = derivedBrief ?? stateBrief;
  const suggestionSet = useMemo(
    () => buildContextualSuggestions(brief, messageSource, Boolean(agent?.isRunning)),
    [brief, messageSource, agent?.isRunning],
  );
  const suggestionSignature = suggestionSet
    .map((suggestion) => `${suggestion.title}|${suggestion.message}`)
    .join("||");

  useEffect(() => {
    if (!agent) return;
    if (!derivedBrief) return;
    if (derivedSignature === stateSignature) return;
    agent.setState({ ...(agent.state ?? {}), cryptoBrief: derivedBrief });
  }, [agent, derivedBrief, derivedSignature, stateSignature]);

  useConfigureSuggestions({
    available: suggestionSet.length > 0 ? "always" : "before-first-message",
    suggestions: suggestionSet.length > 0 ? suggestionSet : demoQuestions,
  }, [suggestionSignature]);

  useDefaultRenderTool({
    render: ({ name, status, parameters, result }) => (
      <ToolFallbackCard
        name={name}
        status={status}
        parameters={parameters}
        result={result}
      />
    ),
  });

  useFrontendTool({
    name: "setCryptoBrief",
    description: "Set the crypto intelligence response and UI blocks on the canvas.",
    parameters: briefSchema,
    handler: async (payload) => {
      const normalized: CryptoBriefResponse = {
        ...(payload as CryptoBriefResponse),
        uiBlocks: normalizeUiBlocks((payload as { uiBlocks?: unknown }).uiBlocks) as CryptoBriefResponse["uiBlocks"],
      };
      agent?.setState({ ...(agent?.state ?? {}), cryptoBrief: normalized });
      return "crypto brief updated";
    },
    render: ({ status, args, result }) => {
      if (status === "inProgress") {
        return (
          <ToolFallbackCard
            name="setCryptoBrief"
            status="inProgress"
            parameters={args}
          />
        );
      }
      if (status === "executing") {
        return (
          <ToolFallbackCard
            name="setCryptoBrief"
            status="executing"
            parameters={args}
          />
        );
      }
      const normalized: CryptoBriefResponse = {
        ...(args as CryptoBriefResponse),
        uiBlocks: normalizeUiBlocks((args as { uiBlocks?: unknown }).uiBlocks) as CryptoBriefResponse["uiBlocks"],
      };
      const process = buildCryptoProcessFromMessages(messageSource, normalized);
      return (
        <div>
          <CryptoBriefCompanion brief={normalized} process={process} />
          {parseToolResult(result) ? (
            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground">
              {JSON.stringify(parseToolResult(result), null, 2)}
            </pre>
          ) : null}
        </div>
      );
    },
  });

  const uiBlocks = brief?.uiBlocks ?? [];
  const blockCount = uiBlocks.length;

  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(340px,42vh)] overflow-hidden bg-background xl:grid-cols-[minmax(0,1fr)_420px] xl:grid-rows-1">
      <main className="flex min-h-0 flex-col gap-4 overflow-auto px-5 py-5 md:px-6">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                ChainLens
              </p>
              <h1 className="mt-1 text-xl font-semibold">Crypto Intelligence Copilot</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Ask about assets, risk, Cardano projects, and ecosystem events. The chat explains the path; the canvas turns the result into structured UI.
              </p>
            </div>
            <div className="grid min-w-36 gap-1 rounded-md border border-border bg-background px-3 py-2 text-right">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">Canvas blocks</span>
              <span className="text-2xl font-semibold">{blockCount}</span>
            </div>
          </div>
          <p className="mt-3 border-t border-border pt-3 text-xs text-amber-700">
            {brief?.disclaimer ?? DEFAULT_DISCLAIMER}
          </p>
          <details className="mt-3 rounded-md border border-border bg-background px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo Conversation Script
            </summary>
            <ol className="mt-3 grid gap-2 text-xs text-muted-foreground">
              {demoConversationScript.map((step, index) => (
                <li key={step.title} className="rounded-md border border-border bg-card px-2.5 py-2">
                  <p className="font-medium text-foreground">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1">{step.message}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {step.expectedTool} {"->"} {step.expectedResult}
                  </p>
                </li>
              ))}
            </ol>
          </details>
        </section>

        {!brief ? (
          <section className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">No intelligence view yet</p>
              <p className="mt-2 max-w-md">
                Try a Cardano brief, ADA/BTC/ETH comparison, project watchlist, risk analysis, or recent ecosystem recap.
              </p>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[10px] uppercase text-muted-foreground">
                  {brief.intent.replaceAll("_", " ")}
                </span>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                  mock dataset
                </span>
              </div>
              <p className="mt-3 max-w-4xl leading-relaxed text-foreground">{brief.answer}</p>
            </section>
            <CryptoCanvas blocks={uiBlocks} />
          </>
        )}
      </main>

      <aside className="min-h-0 border-t border-border bg-muted/20 xl:border-l xl:border-t-0">
        <CopilotChat
          className="h-full"
          suggestionView={CryptoSuggestionView}
          input={{ disclaimer: () => null, className: "pb-6" }}
        />
      </aside>
    </div>
  );
}

function CryptoPage() {
  return (
    <CopilotChatConfigurationProvider agentId="default">
      <CanvasInner />
    </CopilotChatConfigurationProvider>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <CryptoPage />
    </ClientOnly>
  );
}
