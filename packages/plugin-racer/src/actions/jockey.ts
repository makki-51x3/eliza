import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { searchEntityByName, extractEntityName } from "./utils";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";

/**
 * GET_JOCKEY_DETAILS Action
 * Fetches basic details (id, name) about a jockey.
 */
export const getJockeyDetailsAction: Action = {
  name: "GET_JOCKEY_DETAILS",
  similes: [""],
  description: "Fetches basic details (id, name) about a jockey.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("jockey") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const jockeyName = extractEntityName(message.content.text, "jockey");
    if (!jockeyName) {
      return callback({ text: "I couldn't identify the jockey's name. Please specify the jockey name." }, []);
    }

    const jockeyId = await searchEntityByName(runtime, "jockeys", jockeyName);
    if (!jockeyId) {
      return callback({ text: `No jockey found matching "${jockeyName}".` }, []);
    }

    // As no direct details endpoint, we just show the id and name
    const response = `**Jockey Details:**\n- **Name:** ${jockeyName}\n- **ID:** ${jockeyId}\n\nYou can ask for their results or analysis.`;
    callback({ text: response }, []);
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Give me details about the jockey Frankie Dettori." } },
      { user: "RacerBot", content: { text: "One moment...", action: "GET_JOCKEY_DETAILS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_JOCKEY_RESULTS Action
 * Fetches historic results for a jockey.
 */
export const getJockeyResultsAction: Action = {
  name: "GET_JOCKEY_RESULTS",
  similes: [""],
  description: "Fetches historic race results for a jockey.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("jockey") && text.includes("results");
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const jockeyName = extractEntityName(message.content.text, "jockey");
    if (!jockeyName) {
      return callback({ text: "Which jockey's results are you interested in?" }, []);
    }

    const jockeyId = await searchEntityByName(runtime, "jockeys", jockeyName);
    if (!jockeyId) {
      return callback({ text: `No jockey found matching "${jockeyName}".` }, []);
    }

    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/jockeys/${jockeyId}/results`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Jockey results error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "I couldn’t fetch the jockey’s results right now." }, []);
      }

      const data = await resp.json();
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        return callback({ text: `No results found for jockey "${jockeyName}".` }, []);
      }

      // Format a summary of results
      let response = `**Results for Jockey ${jockeyName}:**\n`;
      const recent = data.results.slice(0, 5); // Show up to 5 recent results
      for (const r of recent) {
        response += `- **Date:** ${r.date} | **Course:** ${r.course} | **Race:** "${r.race_name}"\n`;
      }
      if (data.results.length > 5) {
        response += `\n*(Showing last 5 of ${data.results.length} total)*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching jockey results:`, error);
      callback({ text: "An error occurred while fetching the jockey's results." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me the results for jockey Ryan Moore." } },
      { user: "RacerBot", content: { text: "Retrieving results for Ryan Moore...", action: "GET_JOCKEY_RESULTS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_JOCKEY_ANALYSIS Action
 * Fetches analysis data for a jockey (e.g., distance stats).
 */
export const getJockeyAnalysisAction: Action = {
  name: "GET_JOCKEY_ANALYSIS",
  similes: [""],
  description: "Fetches analysis data for a jockey (e.g., distance stats).",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("jockey") && (text.includes("analysis") || text.includes("stats") || text.includes("distance"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const jockeyName = extractEntityName(message.content.text, "jockey");
    if (!jockeyName) {
      return callback({ text: "Please specify the jockey's name for analysis." }, []);
    }

    const jockeyId = await searchEntityByName(runtime, "jockeys", jockeyName);
    if (!jockeyId) {
      return callback({ text: `No jockey found for "${jockeyName}".` }, []);
    }

    // Use distances analysis as an example
    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/jockeys/${jockeyId}/analysis/distances`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Jockey analysis error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "Cannot retrieve jockey's analysis right now." }, []);
      }

      const data = await resp.json();
      if (!data || !data.distances || data.distances.length === 0) {
        return callback({ text: `No distance analysis data for jockey "${jockeyName}".` }, []);
      }

      let response = `**Distance Analysis for Jockey ${jockeyName}:**\n`;
      response += `- **Total Rides Analyzed:** ${data.total_rides}\n`;
      response += `- **Distances:**\n`;
      data.distances.slice(0, 5).forEach((d: any) => { // Show first 5 distances
        response += `  - **${d.dist_f} furlongs (${d.dist_m} meters):** ${d.runners} rides, ${d["1st"]} wins, Win%: ${(d["win_%"] * 100).toFixed(1)}%\n`;
      });
      if (data.distances.length > 5) {
        response += `\n*(Showing first 5 distances out of ${data.distances.length})*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching jockey analysis:`, error);
      callback({ text: "An error occurred while fetching the jockey's analysis." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "What is the distance analysis for jockey William Buick?" } },
      { user: "RacerBot", content: { text: "Gathering distance/time analysis for William Buick...", action: "GET_JOCKEY_ANALYSIS" } }
    ]
  ] as ActionExample[][]
};
