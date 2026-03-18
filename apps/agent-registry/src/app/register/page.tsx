"use client";

import { useState } from "react";
import { registerAgent } from "@/lib/client-api";

type Status = "idle" | "loading" | "success" | "error";

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="inline w-4 h-4 mr-2 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url) return;

    setStatus("loading");
    setMessage("");

    try {
      const agent = await registerAgent(url);
      setStatus("success");
      setMessage(`Agent "${agent.name}" registered successfully!`);
      setUrl("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "An error occurred");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold text-white mb-3">
        Register Your Agent
      </h1>
      <p className="text-gray-400 mb-8">
        Provide your Agent Card URL. We&apos;ll fetch the card, index your
        agent&apos;s capabilities, and make it discoverable.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="agentCardUrl"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Agent Card URL
          </label>
          <input
            id="agentCardUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-agent.example.com/.well-known/agent.json"
            required
            aria-describedby="agentCardUrl-hint"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
              transition-colors"
          />
          <p id="agentCardUrl-hint" className="mt-1.5 text-xs text-gray-600">
            Must be a publicly accessible URL returning a valid A2A Agent Card
            JSON.
          </p>
        </div>

        <button
          type="submit"
          disabled={status === "loading" || !url}
          aria-disabled={status === "loading" || !url}
          className="w-full px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
            disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-white font-medium
            transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
        >
          {status === "loading" && <Spinner />}
          {status === "loading" ? "Registering…" : "Register Agent"}
        </button>
      </form>

      {/* Live region for async feedback */}
      <div aria-live="polite" aria-atomic="true">
        {message && (
          <div
            role={status === "error" ? "alert" : "status"}
            className={`mt-6 p-4 rounded-lg text-sm flex items-start gap-2 ${
              status === "success"
                ? "bg-green-900/30 border border-green-700 text-green-400"
                : "bg-red-900/30 border border-red-700 text-red-400"
            }`}
          >
            <span aria-hidden="true" className="mt-0.5 flex-shrink-0">
              {status === "success" ? "✓" : "✕"}
            </span>
            {message}
          </div>
        )}
      </div>

      <aside aria-label="About Agent Cards" className="mt-12 p-5 rounded-xl border border-gray-800 bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">
          What is an Agent Card?
        </h2>
        <p className="text-sm text-gray-500">
          An Agent Card is a JSON file served at{" "}
          <code className="text-indigo-400">/.well-known/agent.json</code> that
          describes your agent&apos;s name, capabilities, skills, and endpoint
          URL following the A2A protocol specification.
        </p>
      </aside>
    </div>
  );
}
