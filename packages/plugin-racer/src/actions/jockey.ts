import { Action, HandlerCallback, Memory } from "@ai16z/eliza";
import fetch from "node-fetch";
import { buildHeaders } from "../providers/racing";
import { searchEntityByName, extractEntityName } from "./utils";

// GET_JOCKEY_DETAILS (as an example; create results and analysis similarly)
export const getJockeyDetailsAction: Action = {
  name: "GET_JOCKEY_DETAILS",
  similes: [""],
  description: "Fetches basic info about a jockey",
  validate: async (_runtime, message) => {
    const text = message.content.text.toLowerCase();
    return text.includes("jockey") && (text.includes("details") || text.includes("info"));
  },
  handler: async (runtime, message, _state, _options, callback: HandlerCallback) => {
    const jockeyName = extractEntityName(message.content.text, "jockey");
    if (!jockeyName) {
      return callback({ text: "Please specify the jockey name." }, []);
    }

    const jockeyId = await searchEntityByName(runtime, "jockeys", jockeyName);
    if (!jockeyId) {
      return callback({ text: `No jockey found for "${jockeyName}".` }, []);
    }

    const response = `Jockey Details:\n- Name: ${jockeyName}\n- ID: ${jockeyId}\nAsk for results or analysis.`;
    callback({ text: response }, []);
  },
  examples: []
};
