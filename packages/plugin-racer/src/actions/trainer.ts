import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { buildHeaders } from "../providers/racing";
import { searchEntityByName, extractEntityName } from "./utils";
import fetch from "node-fetch";

// GET_TRAINER_DETAILS:
// Just find the trainer by name and return basic info
export const getTrainerDetailsAction: Action = {
  name: "GET_TRAINER_DETAILS",
  similes: [""],
  description: "Fetches basic details (id, name) about a trainer.",
  validate: async (_runtime, message) => {
    const text = message.content.text.toLowerCase();
    return text.includes("trainer") && (text.includes("details") || text.includes("info") || text.includes("about"));
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const trainerName = extractEntityName(message.content.text, "trainer");
    if (!trainerName) {
      return callback({ text: "I couldn't identify the trainer's name. Please specify the trainer name." }, []);
    }

    const trainerId = await searchEntityByName(runtime, "trainers", trainerName);
    if (!trainerId) {
      return callback({ text: `No trainer found matching "${trainerName}".` }, []);
    }

    // As no direct details endpoint, we just show the id and name
    const response = `Trainer Details:\n- Name: ${trainerName}\n- ID: ${trainerId}\nYou can ask for their results or analysis.`;
    callback({ text: response.trim() }, []);
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Show me details about trainer John Smith." } },
      { user: "RacerBot", content: { text: "One moment...", action: "GET_TRAINER_DETAILS" } }
    ]
  ] as ActionExample[][]
};

// GET_TRAINER_RESULTS:
export const getTrainerResultsAction: Action = {
  name: "GET_TRAINER_RESULTS",
  similes: [""],
  description: "Fetches historic results for a trainer.",
  validate: async (_runtime, message) => {
    const text = message.content.text.toLowerCase();
    return text.includes("trainer") && text.includes("results");
  },
  handler: async (runtime, message, _state, _options, callback) => {
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
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.error(`Trainer results error: ${resp.status} ${resp.statusText}`);
      return callback({ text: "I couldn’t fetch the trainer’s results right now." }, []);
    }

    const data = await resp.json();
    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      return callback({ text: `No results found for trainer "${trainerName}".` }, []);
    }

    let response = `Results for Trainer ${trainerName}:\n`;
    const recent = data.results.slice(0,5);
    for (const r of recent) {
      // Similar formatting as horse results
      response += `- ${r.date} at ${r.course}: "${r.race_name}"\n`;
    }
    if (data.results.length > 5) {
      response += `(Showing last 5 of ${data.results.length} total)`;
    }

    callback({ text: response.trim() }, []);
  },
  examples: []
};

// GET_TRAINER_ANALYSIS:
// We'll choose one analysis endpoint, e.g. distances
export const getTrainerAnalysisAction: Action = {
  name: "GET_TRAINER_ANALYSIS",
  similes: [""],
  description: "Fetches analysis data for a trainer (e.g., distance stats).",
  validate: async (_runtime, message) => {
    const text = message.content.text.toLowerCase();
    return text.includes("trainer") && (text.includes("analysis") || text.includes("stats") || text.includes("distance"));
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const trainerName = extractEntityName(message.content.text, "trainer");
    if (!trainerName) {
      return callback({ text: "Please specify the trainer name for analysis." }, []);
    }

    const trainerId = await searchEntityByName(runtime, "trainers", trainerName);
    if (!trainerId) {
      return callback({ text: `No trainer found for "${trainerName}".` }, []);
    }

    // Use distances analysis as an example
    const headers = buildHeaders(runtime);
    const url = `https://api.theracingapi.com/v1/trainers/${trainerId}/analysis/distances`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.error(`Trainer analysis error: ${resp.status} ${resp.statusText}`);
      return callback({ text: "Cannot retrieve trainer's analysis right now." }, []);
    }

    const data = await resp.json();
    if (!data || !data.distances || data.distances.length === 0) {
      return callback({ text: `No distance analysis data for trainer "${trainerName}".` }, []);
    }

    let response = `Distance Analysis for Trainer ${trainerName}:\nTotal Runners: ${data.total_runners}\nDistances:\n`;
    data.distances.slice(0,3).forEach((d:any) => {
      response += `- ${d.dist_f}f: ${d.runners} runs, ${d["1st"]} wins, win% ${(d.win_*100).toFixed(1)}%\n`;
    });
    if (data.distances.length > 3) {
      response += `(Showing first 3 distances)`;
    }

    callback({ text: response.trim() }, []);
  },
  examples: []
};
