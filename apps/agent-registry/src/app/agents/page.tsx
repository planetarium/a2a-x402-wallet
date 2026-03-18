"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AgentGrid } from "@/components/AgentGrid";
import { SearchBar } from "@/components/SearchBar";
import { fetchAgents } from "@/lib/client-api";
import type { Agent } from "@/lib/types";

function AgentsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  async function search(q: string) {
    setLoading(true);
    setAgents(await fetchAgents(q || undefined));
    setLoading(false);
  }

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    search(initialQuery);
  }, [initialQuery]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-6">All Agents</h1>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={() => search(query)}
          className="max-w-xl"
        />
      </header>

      <AgentGrid
        agents={agents}
        loading={loading}
        emptyMessage={
          query ? `No agents found for "${query}"` : "No agents registered yet."
        }
      />
    </div>
  );
}

function AgentsFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="h-9 w-40 bg-gray-800 rounded animate-pulse mb-6" />
      <div className="h-12 max-w-xl bg-gray-800 rounded-lg animate-pulse" />
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<AgentsFallback />}>
      <AgentsContent />
    </Suspense>
  );
}
