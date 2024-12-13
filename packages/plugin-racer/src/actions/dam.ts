import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { searchEntityByName, extractEntityName } from "./utils";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";

/**
 * GET_DAM_DETAILS Action
 * Fetches basic details (id, name) about a dam.
 */
export const getDamDetailsAction: Action = {
  name: "GET_DAM_DETAILS",
  similes: [""],
  description: "Fetches basic details (id, name) about a dam.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("dam") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const damName = extractEntityName(message.content.text, "dam");
    if (!damName) {
      return callback({ text: "I couldn't identify the dam's name. Please specify the dam name." }, []);
    }

    const damId = await searchEntityByName(runtime, "dams", damName);
    if (!damId) {
      return callback({ text: `No dam found matching "${damName}".` }, []);
    }

    // As no direct details endpoint, we just show the id and name
    const response = `**Dam Details:**\n- **Name:** ${damName}\n- **ID:** ${damId}\n\nYou can ask for their results or analysis.`;
    callback({ text: response }, []);
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Provide details about dam Urban Sea." } },
      { user: "RacerBot", content: { text: "One moment...", action: "GET_DAM_DETAILS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_DAM_RESULTS Action
 * Fetches offspring's historic results for a dam.
 */
export const getDamResultsAction: Action = {
  name: "GET_DAM_RESULTS",
  similes: [""],
  description: "Fetches historic race results for a dam's offspring.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("dam") && text.includes("results");
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const damName = extractEntityName(message.content.text, "dam");
    if (!damName) {
      return callback({ text: "Which dam's offspring results are you interested in?" }, []);
    }

    const damId = await searchEntityByName(runtime, "dams", damName);
    if (!damId) {
      return callback({ text: `No dam found matching "${damName}".` }, []);
    }

    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/dams/${damId}/results`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Dam results error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "I couldn’t fetch the dam’s offspring results right now." }, []);
      }

      const data = await resp.json();
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        return callback({ text: `No results found for dam "${damName}".` }, []);
      }

      // Format a summary of results
      let response = `**Offspring Results for Dam ${damName}:**\n`;
      const recent = data.results.slice(0, 5); // Show up to 5 recent results
      for (const r of recent) {
        response += `- **Date:** ${r.date} | **Course:** ${r.course} | **Race:** "${r.race_name}"\n`;
      }
      if (data.results.length > 5) {
        response += `\n*(Showing last 5 of ${data.results.length} total)*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching dam results:`, error);
      callback({ text: "An error occurred while fetching the dam's offspring results." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me the results for dam Zenyatta's offspring." } },
      { user: "RacerBot", content: { text: "Retrieving offspring results for Zenyatta...", action: "GET_DAM_RESULTS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_DAM_ANALYSIS Action
 * Fetches analysis data for a dam (e.g., class stats).
 */
export const getDamAnalysisAction: Action = {
  name: "GET_DAM_ANALYSIS",
  similes: [""],
  description: "Fetches analysis data for a dam (e.g., class stats).",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("dam") && (text.includes("analysis") || text.includes("stats") || text.includes("distance") || text.includes("class"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const damName = extractEntityName(message.content.text, "dam");
    if (!damName) {
      return callback({ text: "Please specify the dam's name for analysis." }, []);
    }

    const damId = await searchEntityByName(runtime, "dams", damName);
    if (!damId) {
      return callback({ text: `No dam found for "${damName}".` }, []);
    }

    // Use class analysis as an example
    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/dams/${damId}/analysis/classes`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Dam analysis error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "Cannot retrieve dam's analysis right now." }, []);
      }

      const data = await resp.json();
      if (!data || !data.classes || data.classes.length === 0) {
        return callback({ text: `No class analysis data for dam "${damName}".` }, []);
      }

      let response = `**Class Analysis for Dam ${damName}:**\n`;
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
      console.error(`Error fetching dam analysis:`, error);
      callback({ text: "An error occurred while fetching the dam's analysis." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me analysis for dam Miesque." } },
      { user: "RacerBot", content: { text: "Gathering analysis for Miesque...", action: "GET_DAM_ANALYSIS" } }
    ]
  ] as ActionExample[][]
};
