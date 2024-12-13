import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { searchEntityByName, extractEntityName } from "./utils";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";

/**
 * GET_SIRE_DETAILS Action
 * Fetches basic details (id, name) about a sire.
 */
export const getSireDetailsAction: Action = {
  name: "GET_SIRE_DETAILS",
  similes: [""],
  description: "Fetches basic details (id, name) about a sire.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("sire") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const sireName = extractEntityName(message.content.text, "sire");
    if (!sireName) {
      return callback({ text: "I couldn't identify the sire's name. Please specify the sire name." }, []);
    }

    const sireId = await searchEntityByName(runtime, "sires", sireName);
    if (!sireId) {
      return callback({ text: `No sire found matching "${sireName}".` }, []);
    }

    // As no direct details endpoint, we just show the id and name
    const response = `**Sire Details:**\n- **Name:** ${sireName}\n- **ID:** ${sireId}\n\nYou can ask for their results or analysis.`;
    callback({ text: response }, []);
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Provide details about sire Galileo." } },
      { user: "RacerBot", content: { text: "One moment...", action: "GET_SIRE_DETAILS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_SIRE_RESULTS Action
 * Fetches offspring's historic results for a sire.
 */
export const getSireResultsAction: Action = {
  name: "GET_SIRE_RESULTS",
  similes: [""],
  description: "Fetches historic race results for a sire's offspring.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("sire") && text.includes("results");
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const sireName = extractEntityName(message.content.text, "sire");
    if (!sireName) {
      return callback({ text: "Which sire's offspring results are you interested in?" }, []);
    }

    const sireId = await searchEntityByName(runtime, "sires", sireName);
    if (!sireId) {
      return callback({ text: `No sire found matching "${sireName}".` }, []);
    }

    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/sires/${sireId}/results`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Sire results error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "I couldn’t fetch the sire’s offspring results right now." }, []);
      }

      const data = await resp.json();
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        return callback({ text: `No results found for sire "${sireName}".` }, []);
      }

      // Format a summary of results
      let response = `**Offspring Results for Sire ${sireName}:**\n`;
      const recent = data.results.slice(0, 5); // Show up to 5 recent results
      for (const r of recent) {
        response += `- **Date:** ${r.date} | **Course:** ${r.course} | **Race:** "${r.race_name}"\n`;
      }
      if (data.results.length > 5) {
        response += `\n*(Showing last 5 of ${data.results.length} total)*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching sire results:`, error);
      callback({ text: "An error occurred while fetching the sire's offspring results." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me the results for sire Dubawi's offspring." } },
      { user: "RacerBot", content: { text: "Retrieving offspring results for Dubawi...", action: "GET_SIRE_RESULTS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_SIRE_ANALYSIS Action
 * Fetches analysis data for a sire (e.g., class stats).
 */
export const getSireAnalysisAction: Action = {
  name: "GET_SIRE_ANALYSIS",
  similes: [""],
  description: "Fetches analysis data for a sire (e.g., class stats).",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("sire") && (text.includes("analysis") || text.includes("stats") || text.includes("distance") || text.includes("class"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const sireName = extractEntityName(message.content.text, "sire");
    if (!sireName) {
      return callback({ text: "Please specify the sire's name for analysis." }, []);
    }

    const sireId = await searchEntityByName(runtime, "sires", sireName);
    if (!sireId) {
      return callback({ text: `No sire found for "${sireName}".` }, []);
    }

    // Use class analysis as an example
    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/sires/${sireId}/analysis/classes`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Sire analysis error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "Cannot retrieve sire's analysis right now." }, []);
      }

      const data = await resp.json();
      if (!data || !data.classes || data.classes.length === 0) {
        return callback({ text: `No class analysis data for sire "${sireName}".` }, []);
      }

      let response = `**Class Analysis for Sire ${sireName}:**\n`;
      response += `- **Total Runners Analyzed:** ${data.total_runners}\n`;
      response += `- **Classes:**\n`;
      data.classes.slice(0, 5).forEach((c: any) => { // Show first 5 classes
        response += `  - **Class ${c.class}:** ${c.runners} runners, ${c["1st"]} wins, Win%: ${(c["win_%"] * 100).toFixed(1)}%\n`;
      });
      if (data.classes.length > 5) {
        response += `\n*(Showing first 5 classes out of ${data.classes.length})*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching sire analysis:`, error);
      callback({ text: "An error occurred while fetching the sire's analysis." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me analysis for sire Frankel." } },
      { user: "RacerBot", content: { text: "Gathering analysis for Frankel...", action: "GET_SIRE_ANALYSIS" } }
    ]
  ] as ActionExample[][]
};
