import { IAgentRuntime } from "@ai16z/eliza";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";

// A generic search function for any entity type
async function searchEntityByName(runtime: IAgentRuntime, endpoint: string, name: string): Promise<string | null> {
  const headers = buildHeaders(runtime);
  const url = new URL(`https://api.theracingapi.com/v1/${endpoint}/search`);
  url.searchParams.append("name", name);

  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) {
    console.error(`Searching ${endpoint} failed: ${resp.status} ${resp.statusText}`);
    return null;
  }

  const data = await resp.json();
  if (!data || !Array.isArray(data.search_results) || data.search_results.length === 0) return null;

  return data.search_results[0].id;
}

function extractEntityName(text: string, keyword: string): string | null {
  const lower = text.toLowerCase();
  if (!lower.includes(keyword)) return null;
  const words = text.split(" ");
  const idx = words.findIndex(w => w.toLowerCase().includes(keyword));
  if (idx === -1 || idx === words.length - 1) return null;
  const nameParts = words.slice(idx + 1).filter(w => w.toLowerCase() !== "named" && w.toLowerCase() !== "called");
  return nameParts.join(" ").trim() || null;
}

export { searchEntityByName, extractEntityName };
