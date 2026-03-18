import Anthropic from "@anthropic-ai/sdk";
import type { SearchResult } from "@/lib/search";

const client = new Anthropic();

/** Rerank top candidates using LLM scoring.
 * Only activate when agent count > 1,000 or query is complex.
 */
export async function rerankWithLLM(
  query: string,
  candidates: SearchResult[],
  topK = 5,
): Promise<SearchResult[]> {
  const candidateList = candidates
    .map(
      (a, i) =>
        `[${i}] ${a.name}: ${a.description} | skills: ${JSON.stringify(a.skills)}`,
    )
    .join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Rate each agent's relevance to the query on a scale of 0-10.
Query: "${query}"

Agents:
${candidateList}

Return JSON only: { "scores": [score0, score1, ...] }`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  const { scores } = JSON.parse(text) as { scores: number[] };

  return candidates
    .map((c, i) => ({ ...c, score: scores[i] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
