import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";
import { extractHorseName, searchHorseByName } from "./horse"; // We'll export these helper functions from horse.ts

/**
 * GET_HORSE_RESULTS Action
 * User might say: "Show me the results for horse Thunderbolt" or "Horse Sea Biscuit past performances".
 * We'll:
 *  - Extract horse name
 *  - Search horse ID
 *  - Call /v1/horses/{horse_id}/results
 *  - Format and present a summary of results (positions, race names, dates)
 */
export const getHorseResultsAction: Action = {
  name: "GET_HORSE_RESULTS",
  description: "Fetches historical race results for a given horse.",
  similes: ["HORSE_RESULTS", "PAST_PERFORMANCES"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    // If the user mentions 'horse' and 'results' or 'performances', consider it
    return text.includes("horse") && (text.includes("results") || text.includes("performance") || text.includes("past races"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const text = message.content.text;
    const horseName = extractHorseName(text);
    if (!horseName) {
      return callback({ text: "I’m sorry, I couldn’t identify the horse’s name. Please specify the horse name." }, []);
    }

    const horseId = await searchHorseByName(runtime, horseName);
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

    // Format a summary of results
    let response = `Historical Results for ${horseName}:\n`;
    // Show up to 5 recent results for brevity
    const resultsToShow = data.results.slice(0, 5);
    for (const r of resultsToShow) {
      // Each result includes race_id, date, course, race_name, position in r.runners
      // We need to find the matching runner with this horse
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
 * User might say: "Show me distance analysis for horse Thunderbolt" or "horse Sea Biscuit analysis".
 * We'll:
 *  - Extract horse name
 *  - Search horse ID
 *  - Call /v1/horses/{horse_id}/analysis/distance-times
 *  - Summarize the analysis data (total runs, and a quick breakdown of distances)
 */
export const getHorseAnalysisAction: Action = {
  name: "GET_HORSE_ANALYSIS",
  description: "Fetches distance/time analysis for a given horse.",
  similes: ["HORSE_ANALYSIS", "DISTANCE_ANALYSIS"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    // If user mentions 'horse' and 'analysis' or 'distance analysis', consider it valid.
    return text.includes("horse") && (text.includes("analysis") || text.includes("distance") || text.includes("stats"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const text = message.content.text;
    const horseName = extractHorseName(text);
    if (!horseName) {
      return callback({ text: "I couldn’t identify the horse name. Could you specify it?" }, []);
    }

    const horseId = await searchHorseByName(runtime, horseName);
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
    // Show a summary of each distance record
    data.distances.slice(0, 5).forEach((distObj: any) => {
      response += `- ${distObj.dist_f} furlongs (${distObj.dist_m}m): ${distObj.runners} runs, ${distObj["1st"]} wins, win% ${(distObj.win_ * 100).toFixed(1)}%\n`;
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
