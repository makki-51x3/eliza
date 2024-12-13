import { IAgentRuntime } from "@ai16z/eliza";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";

/**
 * Generic search function for any entity type.
 * @param runtime - Agent runtime for accessing settings.
 * @param endpoint - API endpoint (e.g., "trainers", "jockeys").
 * @param name - Name to search for.
 * @returns The ID of the first matching entity or null.
 */
export async function searchEntityByName(runtime: IAgentRuntime, endpoint: string, name: string): Promise<string | null> {
  const headers = buildHeaders(runtime);
  const url = new URL(`https://api.theracingapi.com/v1/${endpoint}/search`);
  url.searchParams.append("name", name);

  try {
    const resp = await fetch(url.toString(), { headers });
    if (!resp.ok) {
      console.error(`Searching ${endpoint} failed: ${resp.status} ${resp.statusText}`);
      return null;
    }

    const data = await resp.json();
    if (!data || !Array.isArray(data.search_results) || data.search_results.length === 0) {
      return null;
    }

    return data.search_results[0].id; // Return the first entity's ID
  } catch (error) {
    console.error(`Error searching ${endpoint} by name "${name}":`, error);
    return null;
  }
}

/**
 * Extracts entity name from user input based on a keyword.
 * @param text - User input text.
 * @param keyword - Keyword to identify the entity (e.g., "trainer", "jockey").
 * @returns Extracted entity name or null.
 */
export function extractEntityName(text: string, keyword: string): string | null {
  const lower = text.toLowerCase();
  if (!lower.includes(keyword)) return null;

  const words = text.split(" ");
  const idx = words.findIndex(w => w.toLowerCase().includes(keyword));
  if (idx === -1 || idx === words.length - 1) return null;

  // Assume the name follows the keyword, possibly after "named" or "called"
  const nameParts = words.slice(idx + 1).filter(w => w.toLowerCase() !== "named" && w.toLowerCase() !== "called");
  return nameParts.join(" ").trim() || null;
}
