"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import {
  CryptoBriefCompanion,
  CryptoProcessPanel,
} from "@/components/crypto-canvas/CryptoBriefCompanion";
import {
  buildCryptoBriefFromMessages,
  buildCryptoLiveProcess,
  buildCryptoProcessFromMessages,
  parseToolResult,
} from "@/lib/crypto/brief";
import type {
  CryptoProcessSummary,
} from "@/lib/crypto/brief";
import type { CryptoBriefResponse } from "@/lib/crypto/types";

const companionCache = new Map<
  string,
  {
    brief?: CryptoBriefResponse;
    process?: CryptoProcessSummary | null;
  }
>();

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

function findMessageIndex(messages: MessageLike[], target: MessageLike): number {
  if (target.id) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.id === target.id) return i;
    }
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i] === target) return i;
  }

  return -1;
}

function isCryptoToolPayload(payload: unknown): payload is {
  cryptoBrief?: CryptoBriefResponse;
  cryptoProcess?: CryptoProcessSummary;
} {
  return Boolean(payload) && typeof payload === "object";
}

function chooseMessageHistory(
  primary: unknown[] | undefined,
  secondary: unknown[] | undefined,
): unknown[] {
  const first = Array.isArray(primary) ? primary : [];
  const second = Array.isArray(secondary) ? secondary : [];
  return second.length > first.length ? second : first;
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
  const messages = chooseMessageHistory(
    agent?.messages,
    stateSnapshot?.messages ?? liveState?.messages,
  );
  if (!Array.isArray(messages)) return null;

  if (position !== "after") return null;

  if (roleOf(message) === "tool" && typeof message.content === "string") {
    const parsed = parseToolResult(message.content);
    if (!isCryptoToolPayload(parsed)) return null;

    const brief = parsed.cryptoBrief;
    const process =
      parsed.cryptoProcess ??
      (brief ? buildCryptoProcessFromMessages([message], brief) : null);

    if (!brief && !process) return null;
    if (message.id) {
      companionCache.set(message.id, { brief, process });
    }
    const cached = message.id ? companionCache.get(message.id) : undefined;
    const resolvedBrief = brief ?? cached?.brief;
    const resolvedProcess = process ?? cached?.process;

    if (resolvedBrief) {
      return (
        <CryptoBriefCompanion
          brief={resolvedBrief}
          process={resolvedProcess}
          compact
          showProcess={false}
        />
      );
    }

    if (resolvedProcess) {
      return <CryptoProcessPanel process={resolvedProcess} />;
    }

    return null;
  }

  if (roleOf(message) !== "assistant") return null;
  const typedMessages = messages.filter(
    (item): item is MessageLike => Boolean(item) && typeof item === "object",
  );
  const messageIndex = findMessageIndex(typedMessages, message);
  const lastAssistantIndex = (() => {
    for (let i = typedMessages.length - 1; i >= 0; i -= 1) {
      if (roleOf(typedMessages[i]) === "assistant") return i;
    }
    return -1;
  })();
  const resolvedMessageIndex =
    messageIndex >= 0 ? messageIndex : lastAssistantIndex;
  if (resolvedMessageIndex < 0) return null;
  const isLatestAssistant = resolvedMessageIndex === lastAssistantIndex;
  const history = typedMessages.slice(0, resolvedMessageIndex + 1);

  const derivedBrief = buildCryptoBriefFromMessages(history);
  const derivedProcess = buildCryptoLiveProcess(
    history,
    derivedBrief,
    isLatestAssistant && isRunning,
  );
  const brief =
    stateSnapshot?.cryptoBrief ??
    derivedBrief ??
    (isLatestAssistant ? liveState?.cryptoBrief : undefined);
  const process =
    stateSnapshot?.cryptoProcess ??
    (isLatestAssistant ? liveState?.cryptoProcess : undefined) ??
    derivedProcess;

  if (message.id && (brief || process)) {
    companionCache.set(message.id, { brief, process });
  }
  const cached = message.id ? companionCache.get(message.id) : undefined;
  const resolvedBrief = brief ?? cached?.brief;
  const resolvedProcess = process ?? cached?.process;

  if (isLatestAssistant && isRunning && resolvedProcess) return null;

  // For assistant placeholders, rely on tool-message companion cards.
  return null;
}
