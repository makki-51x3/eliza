import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { searchEntityByName, extractEntityName } from "./utils";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";

/**
 * GET_DAMSIRE_DETAILS Action
 * Fetches basic details (id, name) about a damsire.
 */
export const getDamsireDetailsAction: Action = {
  name: "GET_DAMSIRE_DETAILS",
  similes: [""],
  description: "Fetches basic details (id, name) about a damsire.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("damsire") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const damsireName = extractEntityName(message.content.text, "damsire");
    if (!damsireName) {
      return callback({ text: "I couldn't identify the damsire's name. Please specify the damsire name." }, []);
    }

    const damsireId = await searchEntityByName(runtime, "damsires", damsireName);
    if (!damsireId) {
      return callback({ text: `No damsire found matching "${damsireName}".` }, []);
    }

    // As no direct details endpoint, we just show the id and name
    const response = `**Damsire Details:**\n- **Name:** ${damsireName}\n- **ID:** ${damsireId}\n\nYou can ask for their results or analysis.`;
    callback({ text: response }, []);
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Provide details about damsire Northern Dancer." } },
      { user: "RacerBot", content: { text: "One moment...", action: "GET_DAMSIRE_DETAILS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_DAMSIRE_RESULTS Action
 * Fetches offspring's historic results for a damsire.
 */
export const getDamsireResultsAction: Action = {
  name: "GET_DAMSIRE_RESULTS",
  similes: [""],
  description: "Fetches historic race results for a damsire's grandoffspring.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("damsire") && text.includes("results");
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const damsireName = extractEntityName(message.content.text, "damsire");
    if (!damsireName) {
      return callback({ text: "Which damsire's grandoffspring results are you interested in?" }, []);
    }

    const damsireId = await searchEntityByName(runtime, "damsires", damsireName);
    if (!damsireId) {
      return callback({ text: `No damsire found matching "${damsireName}".` }, []);
    }

    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/damsires/${damsireId}/results`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Damsire results error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "I couldn’t fetch the damsire’s grandoffspring results right now." }, []);
      }

      const data = await resp.json();
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        return callback({ text: `No results found for damsire "${damsireName}".` }, []);
      }

      // Format a summary of results
      let response = `**Grandoffspring Results for Damsire ${damsireName}:**\n`;
      const recent = data.results.slice(0, 5); // Show up to 5 recent results
      for (const r of recent) {
        response += `- **Date:** ${r.date} | **Course:** ${r.course} | **Race:** "${r.race_name}"\n`;
      }
      if (data.results.length > 5) {
        response += `\n*(Showing last 5 of ${data.results.length} total)*`;
      }

      callback({ text: response }, []);
    } catch (error) {
      console.error(`Error fetching damsire results:`, error);
      callback({ text: "An error occurred while fetching the damsire's grandoffspring results." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me the results for damsire Sadler's Wells' grandoffspring." } },
      { user: "RacerBot", content: { text: "Retrieving grandoffspring results for Sadler's Wells...", action: "GET_DAMSIRE_RESULTS" } }
    ]
  ] as ActionExample[][]
};

/**
 * GET_DAMSIRE_ANALYSIS Action
 * Fetches analysis data for a damsire (e.g., class stats).
 */
export const getDamsireAnalysisAction: Action = {
  name: "GET_DAMSIRE_ANALYSIS",
  similes: [""],
  description: "Fetches analysis data for a damsire (e.g., class stats).",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("damsire") && (text.includes("analysis") || text.includes("stats") || text.includes("distance") || text.includes("class"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const damsireName = extractEntityName(message.content.text, "damsire");
    if (!damsireName) {
      return callback({ text: "Please specify the damsire's name for analysis." }, []);
    }

    const damsireId = await searchEntityByName(runtime, "damsires", damsireName);
    if (!damsireId) {
      return callback({ text: `No damsire found for "${damsireName}".` }, []);
    }

    // Use class analysis as an example
    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/damsires/${damsireId}/analysis/classes`;
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.error(`Damsire analysis error: ${resp.status} ${resp.statusText}`);
        return callback({ text: "Cannot retrieve damsire's analysis right now." }, []);
      }

      const data = await resp.json();
      if (!data || !data.classes || data.classes.length === 0) {
        return callback({ text: `No class analysis data for damsire "${damsireName}".` }, []);
      }

      let response = `**Class Analysis for Damsire ${damsireName}:**\n`;
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
      console.error(`Error fetching damsire analysis:`, error);
      callback({ text: "An error occurred while fetching the damsire's analysis." }, []);
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me analysis for damsire Green Desert." } },
      { user: "RacerBot", content: { text: "Gathering analysis for Green Desert...", action: "GET_DAMSIRE_ANALYSIS" } }
    ]
  ] as ActionExample[][]
};
