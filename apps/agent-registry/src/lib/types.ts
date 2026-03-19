import type { InferSelectModel } from "drizzle-orm";
import type { agents } from "@/lib/db/schema";

type AgentRow = InferSelectModel<typeof agents>;

/**
 * Agent data returned from API responses.
 * Excludes internal fields (embedding) that are not useful to clients.
 */
export type AgentResponse = Omit<AgentRow, "embedding" | "contentHash">;

/**
 * Minimal Agent shape used in client components and search results.
 */
export type Agent = AgentResponse & { score?: number };
