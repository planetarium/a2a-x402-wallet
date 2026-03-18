export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-white mb-4">
          Discover A2A Agents
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          The open registry for AI agents that speak the{" "}
          <span className="text-indigo-400">A2A protocol</span>. Register your
          agent, explore the ecosystem, and connect agents together.
        </p>

        {/* Search bar */}
        <div className="flex max-w-xl mx-auto gap-2">
          <input
            type="text"
            placeholder="Search agents by name, capability, or tag..."
            className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
            Search
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-16">
        {[
          { label: "Registered Agents", value: "—" },
          { label: "Unique Capabilities", value: "—" },
          { label: "Networks Supported", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center"
          >
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Featured / recent agents */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          Recently Registered
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Placeholder cards */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
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
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/agents"
            className="inline-block px-6 py-3 rounded-lg border border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-white transition-colors text-sm"
          >
            View all agents
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-24 rounded-2xl border border-indigo-900 bg-indigo-950/50 p-10 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">
          Have an A2A agent?
        </h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Register it here so other agents and developers can discover and
          connect to it.
        </p>
        <a
          href="/register"
          className="inline-block px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
        >
          Register Your Agent
        </a>
      </div>
    </div>
  );
}
