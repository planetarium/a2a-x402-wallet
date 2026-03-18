import type { Agent } from "@/lib/types";

export async function fetchAgents(q?: string, limit = 10): Promise<Agent[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q) params.set("q", q);
  const res = await fetch(`/api/agents/search?${params}`);
  const data = await res.json();
  return data.results ?? [];
}

export async function fetchAgentCount(): Promise<number> {
  const res = await fetch("/api/agents");
  const data = await res.json();
  return data.count ?? 0;
}

export async function registerAgent(agentCardUrl: string): Promise<Agent> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentCardUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Registration failed");
  return data.agent;
}
