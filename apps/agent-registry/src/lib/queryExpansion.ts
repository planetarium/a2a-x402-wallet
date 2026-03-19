import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface ExpandedQuery {
  keywords: string[];
  skills: string[];
  intent: string;
  filters?: {
    network?: string;
    paymentToken?: string;
  };
}

export async function expandQuery(userQuery: string): Promise<ExpandedQuery> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are a search query analyzer for an A2A agent registry.
Extract structured search information from the user's query.

User query: "${userQuery}"

Return JSON only (no markdown):
{
  "keywords": ["word1", "word2"],
  "skills": ["skill-id-1"],
  "intent": "A clear English sentence describing what the user wants",
  "filters": { "network": "base or null", "paymentToken": "USDC or null" }
}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  return JSON.parse(text) as ExpandedQuery;
}
