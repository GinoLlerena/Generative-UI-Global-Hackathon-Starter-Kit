"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import {
  CryptoBriefCompanion,
  CryptoProcessPanel,
} from "@/components/crypto-canvas/CryptoBriefCompanion";
import {
  buildCryptoBriefFromMessages,
  buildCryptoLiveProcess,
} from "@/lib/crypto/brief";
import type {
  CryptoProcessSummary,
} from "@/lib/crypto/brief";
import type { CryptoBriefResponse } from "@/lib/crypto/types";

type MessageLike = {
  id?: string;
  role?: string;
  type?: string;
  content?: unknown;
};

function roleOf(message: MessageLike): string | undefined {
  if (message.role) return message.role;
  if (message.type === "ai") return "assistant";
  return message.type;
}

export function CryptoCompanionMessage({
  message,
  position,
  stateSnapshot,
}: {
  message: MessageLike;
  position: "before" | "after";
  stateSnapshot?: {
    messages?: unknown[];
    cryptoBrief?: CryptoBriefResponse;
    cryptoProcess?: CryptoProcessSummary;
  };
}) {
  const { agent } = useAgent();
  const isRunning = Boolean((agent as { isRunning?: boolean } | undefined)?.isRunning);

  const liveState = agent?.state as {
    messages?: unknown[];
    cryptoBrief?: CryptoBriefResponse;
    cryptoProcess?: CryptoProcessSummary;
  } | undefined;
  const messages =
    stateSnapshot?.messages ??
    liveState?.messages ??
    agent?.messages;
  if (!Array.isArray(messages)) return null;

  if (position !== "after") return null;

  if (roleOf(message) !== "assistant") return null;
  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const item = messages[i];
      if (!item || typeof item !== "object") continue;
      const candidate = item as MessageLike;
      if (roleOf(candidate) === "assistant") return candidate.id;
    }
    return undefined;
  })();
  const isLatestAssistant = Boolean(lastAssistantId && message.id && lastAssistantId === message.id);

  const derivedBrief = buildCryptoBriefFromMessages(messages);
  const brief =
    stateSnapshot?.cryptoBrief ??
    (isLatestAssistant ? derivedBrief : null) ??
    (isLatestAssistant ? liveState?.cryptoBrief : undefined);
  const process =
    stateSnapshot?.cryptoProcess ??
    (isLatestAssistant ? liveState?.cryptoProcess : undefined) ??
    (isLatestAssistant ? buildCryptoLiveProcess(messages, brief, isRunning) : null);

  if (isLatestAssistant && isRunning && process) return null;

  if (brief) {
    return <CryptoBriefCompanion brief={brief} process={process} compact showProcess={false} />;
  }

  if (process) {
    return <CryptoProcessPanel process={process} />;
  }

  return null;
}
