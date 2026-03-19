import type { AgentCard } from "@a2a-js/sdk";

export async function fetchAgentCard(url: string): Promise<AgentCard> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch agent card: ${res.status} ${url}`);
  }

  const card: AgentCard = await res.json();

  if (!card.name || !card.url) {
    throw new Error("Invalid Agent Card: missing required fields");
  }

  return card;
}
