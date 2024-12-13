import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { searchEntityByName, extractEntityName } from "./utils";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";

/**
 * GET_OWNER_DETAILS Action
 * Fetches basic details (id, name) about an owner.
 */
export const getOwnerDetailsAction: Action = {
  name: "GET_OWNER_DETAILS",
  similes: [""],
  description: "Fetches basic details (id, name) about an owner.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("owner") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const ownerName = extractEntityName(message.content.text, "owner");
    if (!ownerName) {
      return callback({ text: "I couldn't identify the owner's name. Please specify the owner's name." }, []);
    }

    const ownerId = await searchEntityByName(runtime, "owners", ownerName);
    if (!ownerId) {
      return callback({ text: `No owner found matching "${ownerName}".` }, []);
    }

    // As no direct details endpoint, we just show the id and name
    const response = `**Owner Details:**\n- **Name:** ${ownerName}\n- **ID:** ${ownerId}\n\nYou can ask for their results or analysis.`;
    callback({ text: response }, []);
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Provide details about owner Godolphin." } },
      { user: "RacerBot", content: { text: "One moment...", action: "GET_OWNER_DETAILS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_OWNER_RESULTS Action
 * Fetches historic results for an owner.
 */
export const getOwnerResultsAction: Action = {
  name: "GET_OWNER_RESULTS",
  similes: [""],
  description: "Fetches historic race results for an owner.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("owner") && text.includes("results");
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const ownerName = extractEntityName(message.content.text, "owner");
    if (!ownerName) {
      return callback({ text: "Which owner's results are you interested in?" }, []);
    }

    const ownerId = await searchEntityByName(runtime, "owners", ownerName);
    if (!ownerId) {
      return callback({ text: `No owner found matching "${ownerName}".` }, []);
    }

    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/owners/${ownerId}/results`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Owner results error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "I couldn’t fetch the owner's results right now." }, []);
      }

      const data = await resp.json();
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        return callback({ text: `No results found for owner "${ownerName}".` }, []);
      }

      // Format a summary of results
      let response = `**Results for Owner ${ownerName}:**\n`;
      const recent = data.results.slice(0, 5); // Show up to 5 recent results
      for (const r of recent) {
        response += `- **Date:** ${r.date} | **Course:** ${r.course} | **Race:** "${r.race_name}"\n`;
      }
      if (data.results.length > 5) {
        response += `\n*(Showing last 5 of ${data.results.length} total)*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching owner results:`, error);
      callback({ text: "An error occurred while fetching the owner's results." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me the results for owner Juddmonte." } },
      { user: "RacerBot", content: { text: "Retrieving results for Juddmonte...", action: "GET_OWNER_RESULTS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_OWNER_ANALYSIS Action
 * Fetches analysis data for an owner (e.g., distance stats).
 */
export const getOwnerAnalysisAction: Action = {
  name: "GET_OWNER_ANALYSIS",
  similes: [""],
  description: "Fetches analysis data for an owner (e.g., distance stats).",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("owner") && (text.includes("analysis") || text.includes("stats") || text.includes("distance"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const ownerName = extractEntityName(message.content.text, "owner");
    if (!ownerName) {
      return callback({ text: "Please specify the owner's name for analysis." }, []);
    }

    const ownerId = await searchEntityByName(runtime, "owners", ownerName);
    if (!ownerId) {
      return callback({ text: `No owner found for "${ownerName}".` }, []);
    }

    // Use distances analysis as an example
    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/owners/${ownerId}/analysis/distances`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Owner analysis error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "Cannot retrieve owner's analysis right now." }, []);
      }

      const data = await resp.json();
      if (!data || !data.distances || data.distances.length === 0) {
        return callback({ text: `No distance analysis data for owner "${ownerName}".` }, []);
      }

      let response = `**Distance Analysis for Owner ${ownerName}:**\n`;
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
      console.error(`Error fetching owner analysis:`, error);
      callback({ text: "An error occurred while fetching the owner's analysis." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me analysis for owner Coolmore." } },
      { user: "RacerBot", content: { text: "Gathering analysis for Coolmore...", action: "GET_OWNER_ANALYSIS" } }
    ]
  ] as ActionExample[][]
};
