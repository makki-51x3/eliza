import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import fetch from "node-fetch"; // Assuming node-fetch is used; already used in providers/racing.ts
import { buildHeaders } from "../providers/racing"; // If you export buildHeaders from racing.ts or copy a similar helper

// Helper: parse horse name from user text
export function extractHorseName(text: string): string | null {
  // Very naive extraction: look for a phrase like "horse named <name>" or just after the word 'horse'
  // A more robust approach: maybe user says: "Show me details for the horse Thunderbolt"
  // We'll try to find "horse" and then the following words as a name.
  const lower = text.toLowerCase();
  if (!lower.includes("horse")) return null;

  // For now, let's just grab everything after the word "horse" and assume it's the name
  const words = text.split(" ");
  const horseIndex = words.findIndex(w => w.toLowerCase().includes("horse"));
  if (horseIndex === -1 || horseIndex === words.length - 1) return null;

  // The horse name could be multiple words, we can try just the rest of the line
  // e.g. "horse Thunderbolt", or "horse named Thunderbolt"
  const nameParts = words.slice(horseIndex + 1);
  // remove filler words like 'named', 'called'
  const filtered = nameParts.filter(w => w.toLowerCase() !== "named" && w.toLowerCase() !== "called");
  return filtered.join(" ").trim() || null;
}

// Helper: search horse by name
export async function searchHorseByName(runtime: IAgentRuntime, horseName: string): Promise<string | null> {
  const headers = buildHeaders(runtime);
  const url = new URL("https://api.theracingapi.com/v1/horses/search");
  url.searchParams.append("name", horseName);

  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) {
    console.error(`Horse search failed: ${resp.status} ${resp.statusText}`);
    return null;
  }

  const data = await resp.json();
  if (!data || !Array.isArray(data.search_results) || data.search_results.length === 0) {
    return null;
  }

  return data.search_results[0].id; // Return the first horse_id
}

// Helper: get horse details (standard or pro endpoint)
export async function getHorseDetails(runtime: IAgentRuntime, horseId: string): Promise<any> {
  const headers = buildHeaders(runtime);
  let url = `https://api.theracingapi.com/v1/horses/${horseId}/pro`;

  let resp = await fetch(url, { headers });
  if (!resp.ok) {
    console.log("Pro endpoint not available, falling back to standard endpoint.");
    url = `https://api.theracingapi.com/v1/horses/${horseId}/standard`;
    resp = await fetch(url, { headers });

    if (!resp.ok) {
      console.error(`Fetching horse details failed: ${resp.status} ${resp.statusText}`);
      return null;
    }
  }

  return await resp.json();
}

// Main Action: Get Horse Details
export const getHorseDetailsAction: Action = {
  name: "GET_HORSE_DETAILS",
  description: "Fetches details about a specific horse by name.",
  similes: ["HORSE_INFO", "HORSE_DETAILS"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    // Validate if user wants horse details
    // For simplicity, if user says 'horse' and 'details' or 'info', we consider it valid.
    return text.includes("horse") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const text = message.content.text;
    const horseName = extractHorseName(text);

    if (!horseName) {
      return callback({ text: "I couldn’t determine the horse’s name. Could you clarify?" }, []);
    }

    const horseId = await searchHorseByName(runtime, horseName);
    if (!horseId) {
      return callback({ text: `I couldn’t find a horse named "${horseName}". Please try another name.` }, []);
    }

    const details = await getHorseDetails(runtime, horseId);
    if (!details) {
      return callback({ text: "I couldn’t retrieve details for that horse at the moment." }, []);
    }

    // Format response
    // details could differ depending on endpoint. If pro is available:
    // { id, name, sire, sire_id, dam, dam_id, damsire, damsire_id, breeder, dob, sex, colour }
    // If standard only:
    // { id, name, sire, sire_id, dam, dam_id, damsire, damsire_id }
    let response = `Horse Details for ${details.name}:\n`;
    response += `- Sire: ${details.sire || "N/A"}\n`;
    response += `- Dam: ${details.dam || "N/A"}\n`;
    response += `- Damsire: ${details.damsire || "N/A"}\n`;
    if (details.sex) response += `- Sex: ${details.sex}\n`;
    if (details.colour) response += `- Colour: ${details.colour}\n`;
    if (details.dob) response += `- DOB: ${details.dob}\n`;
    if (details.breeder) response += `- Breeder: ${details.breeder}\n`;

    callback({ text: response.trim() }, []);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Can you give me details about the horse Thunderbolt?" }
      },
      {
        user: "RacerBot",
        content: {
          text: "Let me check the details for that horse...",
          action: "GET_HORSE_DETAILS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Tell me info about the horse named Sea Biscuit" }
      },
      {
        user: "RacerBot",
        content: {
          text: "Alright, searching for Sea Biscuit...",
          action: "GET_HORSE_DETAILS"
        }
      }
    ]
  ] as ActionExample[][]
};
