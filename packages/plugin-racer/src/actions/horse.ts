import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";
import { searchEntityByName, extractEntityName } from "./utils";

/**
 * Internal helper to fetch horse details from the API.
 * Attempts a "pro" endpoint first, then falls back to "standard".
 */
async function getHorseDetails(runtime: IAgentRuntime, horseId: string): Promise<any> {
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

/**
 * GET_HORSE_DETAILS Action
 * Fetches details about a specific horse by name.
 */
export const getHorseDetailsAction: Action = {
  name: "GET_HORSE_DETAILS",
  description: "Fetches details about a specific horse by name.",
  similes: ["HORSE_INFO", "HORSE_DETAILS"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("horse") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const horseName = extractEntityName(message.content.text, "horse");
    if (!horseName) {
      return callback({ text: "I couldn’t determine the horse’s name. Could you clarify?" }, []);
    }

    const horseId = await searchEntityByName(runtime, "horses", horseName);
    if (!horseId) {
      return callback({ text: `I couldn’t find a horse named "${horseName}". Please try another name.` }, []);
    }

    const details = await getHorseDetails(runtime, horseId);
    if (!details) {
      return callback({ text: "I couldn’t retrieve details for that horse at the moment." }, []);
    }

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

/**
 * GET_HORSE_RESULTS Action
 * Fetches historical race results for a given horse.
 */
export const getHorseResultsAction: Action = {
  name: "GET_HORSE_RESULTS",
  description: "Fetches historical race results for a given horse.",
  similes: ["HORSE_RESULTS", "PAST_PERFORMANCES"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("horse") && (text.includes("results") || text.includes("performance") || text.includes("past races"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const horseName = extractEntityName(message.content.text, "horse");
    if (!horseName) {
      return callback({ text: "I’m sorry, I couldn’t identify the horse’s name. Please specify the horse name." }, []);
    }

    const horseId = await searchEntityByName(runtime, "horses", horseName);
    if (!horseId) {
      return callback({ text: `No horse found matching the name "${horseName}". Check the spelling or try another.` }, []);
    }

    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/horses/${horseId}/results`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.error(`Fetching horse results failed: ${resp.status} ${resp.statusText}`);
      return callback({ text: "I’m sorry, I couldn’t fetch the horse results at this time." }, []);
    }

    const data = await resp.json();
    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      return callback({ text: `No results found for horse "${horseName}".` }, []);
    }

    let response = `Historical Results for ${horseName}:\n`;
    const resultsToShow = data.results.slice(0, 5);
    for (const r of resultsToShow) {
      const runner = r.runners.find((run: any) => run.horse_id === horseId);
      if (runner) {
        response += `- ${r.date} at ${r.course}: "${r.race_name}" finished ${runner.position}\n`;
      }
    }

    if (data.results.length > 5) {
      response += `\n(Showing the last 5 results out of ${data.results.length} total.)`;
    }

    callback({ text: response.trim() }, []);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Show me the results for the horse Frankel." }
      },
      {
        user: "RacerBot",
        content: {
          text: "Checking results for Frankel...",
          action: "GET_HORSE_RESULTS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "What are the past performances of the horse Sea Biscuit?" }
      },
      {
        user: "RacerBot",
        content: {
          text: "Let me get Sea Biscuit's past performances...",
          action: "GET_HORSE_RESULTS"
        }
      }
    ]
  ] as ActionExample[][]
};

/**
 * GET_HORSE_ANALYSIS Action
 * Fetches distance/time analysis data for a given horse.
 */
export const getHorseAnalysisAction: Action = {
  name: "GET_HORSE_ANALYSIS",
  description: "Fetches distance/time analysis for a given horse.",
  similes: ["HORSE_ANALYSIS", "DISTANCE_ANALYSIS"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("horse") && (text.includes("analysis") || text.includes("distance") || text.includes("stats"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const horseName = extractEntityName(message.content.text, "horse");
    if (!horseName) {
      return callback({ text: "I couldn’t identify the horse name. Could you specify it?" }, []);
    }

    const horseId = await searchEntityByName(runtime, "horses", horseName);
    if (!horseId) {
      return callback({ text: `No horse found matching "${horseName}".` }, []);
    }

    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/horses/${horseId}/analysis/distance-times`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.error(`Fetching horse analysis failed: ${resp.status} ${resp.statusText}`);
      return callback({ text: "I'm sorry, I couldn't retrieve the horse's analysis at this moment." }, []);
    }

    const data = await resp.json();
    if (!data || !data.distances || data.distances.length === 0) {
      return callback({ text: `No distance/time analysis data found for horse "${horseName}".` }, []);
    }

    let response = `Distance/Time Analysis for ${horseName}:\n`;
    response += `Total Runs Analyzed: ${data.total_runs || 0}\n`;
    response += `Distances:\n`;
    data.distances.slice(0, 5).forEach((distObj: any) => {
      response += `- ${distObj.dist_f} furlongs (${distObj.dist_m}m): ${distObj.runners} runs, ${distObj["1st"]} wins, win% ${(distObj["win_%"] * 100).toFixed(1)}%\n`;
    });
    if (data.distances.length > 5) {
      response += `(Showing first 5 distance summaries out of ${data.distances.length})`;
    }

    callback({ text: response.trim() }, []);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Show me distance analysis for the horse Frankel." }
      },
      {
        user: "RacerBot",
        content: {
          text: "Gathering distance/time analysis for Frankel...",
          action: "GET_HORSE_ANALYSIS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "What are the stats for horse Sea Biscuit?" }
      },
      {
        user: "RacerBot",
        content: {
          text: "Let me check Sea Biscuit’s analysis...",
          action: "GET_HORSE_ANALYSIS"
        }
      }
    ]
  ] as ActionExample[][]
};
