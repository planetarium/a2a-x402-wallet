"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AgentGrid } from "@/components/AgentGrid";
import { SearchBar } from "@/components/SearchBar";
import { fetchAgents, fetchAgentCount } from "@/lib/client-api";
import type { Agent } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    Promise.all([fetchAgentCount(), fetchAgents(undefined, 6)]).then(
      ([total, recent]) => {
        setCount(total);
        setAgents(recent);
        setLoading(false);
      },
    );
  }, []);

  function handleSearch() {
    const q = query.trim();
    router.push(q ? `/agents?q=${encodeURIComponent(q)}` : "/agents");
  }

  return (
    <>
      {/* Hero */}
      <section
        aria-labelledby="hero-heading"
        className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center"
      >
        <h1
          id="hero-heading"
          className="text-5xl font-bold text-white mb-4 tracking-tight"
        >
          Discover A2A Agents
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          The open registry for AI agents that speak the{" "}
          <span className="text-indigo-400">A2A protocol</span>. Register your
          agent, explore the ecosystem, and connect agents together.
        </p>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
          className="max-w-xl mx-auto"
        />
      </section>

      {/* Recently registered */}
      <section
        aria-labelledby="recent-heading"
        className="mx-auto max-w-6xl px-4 pb-16"
      >
        <h2 id="recent-heading" className="text-xl font-semibold text-white mb-6">
          Recently Registered
        </h2>
        <AgentGrid
          agents={agents}
          loading={loading}
          skeletonCount={3}
          emptyMessage="No agents registered yet."
        />
        <div className="mt-8 text-center">
          <a
            href="/agents"
            className="inline-block px-6 py-3 rounded-lg border border-gray-700 text-gray-300
              hover:border-indigo-500 hover:text-white transition-colors text-sm
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            View all agents
          </a>
        </div>
      </section>

      {/* CTA */}
      <section
        aria-labelledby="cta-heading"
        className="mx-auto max-w-6xl px-4 pb-24"
      >
        <div className="rounded-2xl border border-indigo-900 bg-indigo-950/50 p-10 text-center">
          <h2 id="cta-heading" className="text-2xl font-bold text-white mb-3">
            Have an A2A agent?
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Register it here so other agents and developers can discover and
            connect to it.
          </p>
          <a
            href="/register"
            className="inline-block px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            Register Your Agent
          </a>
        </div>
      </section>
    </>
  );
}
