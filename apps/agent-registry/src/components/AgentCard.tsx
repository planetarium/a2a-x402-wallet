import type { Agent } from "@/lib/types";

export function AgentCard({ agent }: { agent: Agent }) {
  const skills = Array.isArray(agent.skills)
    ? (agent.skills as Array<{ name?: string }>)
    : [];

  return (
    <article>
      <a
        href={agent.agentCardUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${agent.name} — open agent card`}
        className="group block rounded-xl border border-gray-800 bg-gray-900 p-5
          hover:border-indigo-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-950/40
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-lg bg-indigo-900/50 group-hover:bg-indigo-800/60 flex items-center justify-center text-indigo-400 font-bold text-lg flex-shrink-0 transition-colors"
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-indigo-200 transition-colors">
              {agent.name}
            </h3>
            <p className="text-xs text-gray-500 truncate">{agent.agentCardUrl}</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
          {agent.description || "No description provided."}
        </p>

        {skills.length > 0 && (
          <ul aria-label="Skills" className="flex flex-wrap gap-1">
            {skills.slice(0, 3).map((skill, i) => (
              <li
                key={i}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400"
              >
                {skill.name ?? "skill"}
              </li>
            ))}
            {skills.length > 3 && (
              <li className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-500">
                +{skills.length - 3} more
              </li>
            )}
          </ul>
        )}
      </a>
    </article>
  );
}
