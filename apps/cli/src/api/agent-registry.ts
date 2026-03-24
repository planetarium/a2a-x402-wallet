export interface AgentSummary {
  name: string;
  description: string;
  agentCardUrl: string;
}

export async function registerAgent(
  registryUrl: string,
  agentCardUrl: string,
): Promise<unknown> {
  const endpoint = new URL('/api/agents', registryUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentCardUrl }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Registry request timed out after 10s');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`Registry returned HTTP ${res.status}`);

  return res.json();
}

export async function searchAgents(
  registryUrl: string,
  query?: string,
  limit = 10,
): Promise<AgentSummary[]> {
  const endpoint = new URL('/api/agents/search', registryUrl);
  if (query) endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('limit', String(limit));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(endpoint.toString(), { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Registry request timed out after 10s');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`Registry returned HTTP ${res.status}`);

  const data = (await res.json()) as { results: AgentSummary[] };
  return data.results;
}
