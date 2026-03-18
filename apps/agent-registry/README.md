# A2A Agent Registry

An open registry service for discovering, registering, and curating AI agents that implement the [A2A (Agent-to-Agent) protocol](https://google.github.io/A2A).

## What is this?

The A2A Agent Registry is a public directory where anyone can:

- **Register** an A2A-compatible agent by submitting its Agent Card URL
- **Search & Browse** agents by name, capability, tag, or supported network
- **Inspect** agent details: supported skills, input/output modalities, authentication requirements, and x402 payment configurations
- **Curate** the ecosystem through community tagging and verification

The registry itself is also an A2A agent — you can query it programmatically via its A2A interface to discover other agents.

## Key Features

| Feature | Description |
|---------|-------------|
| Open Registration | Submit any publicly reachable A2A agent by its `/.well-known/agent.json` URL |
| Full-text Search | Search across agent names, descriptions, capabilities, and tags |
| Agent Card Mirroring | Periodically re-fetches registered Agent Cards to keep metadata fresh |
| A2A Interface | Query the registry itself as an A2A agent — ask it to find agents by capability |
| x402 Support | Surfaces payment-required agents and their accepted tokens/networks |

## Getting Started

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:3000`.

## Registering an Agent

Send a `POST /api/agents` with:

```json
{
  "agentCardUrl": "https://your-agent.example.com/.well-known/agent.json"
}
```

The registry fetches and validates the Agent Card, then stores the agent's metadata.

## Querying via A2A

The registry exposes its own A2A endpoint at `/a2a`. You can send tasks like:

- `"Find agents that can translate text"`
- `"List agents that accept USDC payments on Base"`
- `"Show me agents with a 'search' skill"`

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **A2A SDK**: `@a2a-js/sdk`

## Project Structure

```
src/
  app/
    page.tsx          # Home / explore page
    register/         # Agent registration flow
    agents/           # Agent listing & search
    agents/[id]/      # Agent detail page
    a2a/              # A2A interface endpoint (route handler)
    api/
      agents/         # REST API for agent CRUD
  lib/
    registry.ts       # Core registry logic
    agentCard.ts      # Agent Card fetching & validation
    search.ts         # Search indexing & query
```
