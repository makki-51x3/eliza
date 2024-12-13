import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { searchEntityByName, extractEntityName } from "./utils";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";

/**
 * GET_TRAINER_DETAILS Action
 * Fetches basic details (id, name) about a trainer.
 */
export const getTrainerDetailsAction: Action = {
  name: "GET_TRAINER_DETAILS",
  similes: [""],
  description: "Fetches basic details (id, name) about a trainer.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("trainer") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const trainerName = extractEntityName(message.content.text, "trainer");
    if (!trainerName) {
      return callback({ text: "I couldn't identify the trainer's name. Please specify the trainer name." }, []);
    }

    const trainerId = await searchEntityByName(runtime, "trainers", trainerName);
    if (!trainerId) {
      return callback({ text: `No trainer found matching "${trainerName}".` }, []);
    }

    // As no direct details endpoint, we just show the id and name
    const response = `**Trainer Details:**\n- **Name:** ${trainerName}\n- **ID:** ${trainerId}\n\nYou can ask for their results or analysis.`;
    callback({ text: response }, []);
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me details about trainer Aidan O'Brien." } },
      { user: "RacerBot", content: { text: "One moment...", action: "GET_TRAINER_DETAILS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_TRAINER_RESULTS Action
 * Fetches historic results for a trainer.
 */
export const getTrainerResultsAction: Action = {
  name: "GET_TRAINER_RESULTS",
  similes: [""],
  description: "Fetches historic race results for a trainer.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("trainer") && text.includes("results");
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const trainerName = extractEntityName(message.content.text, "trainer");
    if (!trainerName) {
      return callback({ text: "Which trainer's results are you interested in?" }, []);
    }

    const trainerId = await searchEntityByName(runtime, "trainers", trainerName);
    if (!trainerId) {
      return callback({ text: `No trainer found matching "${trainerName}".` }, []);
    }

    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/trainers/${trainerId}/results`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Trainer results error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "I couldn’t fetch the trainer’s results right now." }, []);
      }

      const data = await resp.json();
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        return callback({ text: `No results found for trainer "${trainerName}".` }, []);
      }

      // Format a summary of results
      let response = `**Results for Trainer ${trainerName}:**\n`;
      const recent = data.results.slice(0, 5); // Show up to 5 recent results
      for (const r of recent) {
        response += `- **Date:** ${r.date} | **Course:** ${r.course} | **Race:** "${r.race_name}"\n`;
      }
      if (data.results.length > 5) {
        response += `\n*(Showing last 5 of ${data.results.length} total)*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching trainer results:`, error);
      callback({ text: "An error occurred while fetching the trainer's results." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "What are the results for trainer John Smith?" } },
      { user: "RacerBot", content: { text: "Retrieving results for John Smith...", action: "GET_TRAINER_RESULTS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_TRAINER_ANALYSIS Action
 * Fetches analysis data for a trainer (e.g., distance stats).
 */
export const getTrainerAnalysisAction: Action = {
  name: "GET_TRAINER_ANALYSIS",
  similes: [""],
  description: "Fetches analysis data for a trainer (e.g., distance stats).",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("trainer") && (text.includes("analysis") || text.includes("stats") || text.includes("distance"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const trainerName = extractEntityName(message.content.text, "trainer");
    if (!trainerName) {
      return callback({ text: "Please specify the trainer's name for analysis." }, []);
    }

    const trainerId = await searchEntityByName(runtime, "trainers", trainerName);
    if (!trainerId) {
      return callback({ text: `No trainer found for "${trainerName}".` }, []);
    }

    // Use distances analysis as an example
    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/trainers/${trainerId}/analysis/distances`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Trainer analysis error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "Cannot retrieve trainer's analysis right now." }, []);
      }

      const data = await resp.json();
      if (!data || !data.distances || data.distances.length === 0) {
        return callback({ text: `No distance analysis data for trainer "${trainerName}".` }, []);
      }

      let response = `**Distance Analysis for Trainer ${trainerName}:**\n`;
      response += `- **Total Runners Analyzed:** ${data.total_runners}\n`;
      response += `- **Distances:**\n`;
      data.distances.slice(0, 5).forEach((d: any) => { // Show first 5 distances
        response += `  - **${d.dist_f} furlongs (${d.dist_m} meters):** ${d.runners} runs, ${d["1st"]} wins, Win%: ${(d["win_%"] * 100).toFixed(1)}%\n`;
      });
      if (data.distances.length > 5) {
        response += `\n*(Showing first 5 distances out of ${data.distances.length})*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching trainer analysis:`, error);
      callback({ text: "An error occurred while fetching the trainer's analysis." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me analysis for trainer Charlie Appleby." } },
      { user: "RacerBot", content: { text: "Gathering analysis for Charlie Appleby...", action: "GET_TRAINER_ANALYSIS" } }
    ]
  ] as ActionExample[][]
};
