import type { InferSelectModel } from "drizzle-orm";
import type { agents } from "@/lib/db/schema";

type AgentRow = InferSelectModel<typeof agents>;

/**
 * Agent data returned from API responses.
 * Excludes internal fields (embedding, searchVector) that are not useful to clients.
 */
export type AgentResponse = Omit<AgentRow, "embedding" | "searchVector" | "contentHash">;

/**
 * Minimal Agent shape used in client components and search results.
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  agentCardUrl: string;
  tags: string[];
  skills: unknown;
  x402: unknown;
  score?: number;
}
