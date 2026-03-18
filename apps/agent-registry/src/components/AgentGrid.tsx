import type { Agent } from "@/lib/types";
import { AgentCard } from "./AgentCard";

function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-800" />
        <div>
          <div className="h-4 w-24 bg-gray-800 rounded mb-1" />
          <div className="h-3 w-16 bg-gray-800 rounded" />
        </div>
      </div>
      <div className="h-3 w-full bg-gray-800 rounded mb-2" />
      <div className="h-3 w-3/4 bg-gray-800 rounded" />
    </div>
  );
}

interface AgentGridProps {
  agents: Agent[];
  loading: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
}

export function AgentGrid({
  agents,
  loading,
  skeletonCount = 6,
  emptyMessage = "No agents found.",
}: AgentGridProps) {
  return (
    <div aria-live="polite" aria-busy={loading}>
      {loading ? (
        <>
          <p className="sr-only">Loading agents…</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </>
      ) : agents.length === 0 ? (
        <p role="status" className="text-center py-16 text-gray-500">
          {emptyMessage}
        </p>
      ) : (
        <ul
          aria-label="Agent list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0"
        >
          {agents.map((agent) => (
            <li key={agent.id}>
              <AgentCard agent={agent} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
