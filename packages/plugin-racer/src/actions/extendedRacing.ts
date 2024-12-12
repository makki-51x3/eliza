// src/actions/extendedRacing.ts
import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { getMeetsForDate, getMeetEntries, getMeetResults, getDataForDateRange } from "../providers/racing.js";
import { parseISO, format } from "date-fns";

/**
 * Utility: Parse a date mentioned by the user. This could be improved with NLP,
 * but here we assume the user gives a date in YYYY-MM-DD format, or relative terms like "yesterday".
 */
function parseUserDate(input: string): string | null {
  const lower = input.toLowerCase();
  // simple examples of relative parsing:
  if (lower.includes("yesterday")) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return format(yesterday, "yyyy-MM-dd");
  } else if (/\d{4}-\d{2}-\d{2}/.test(lower)) {
    // direct date format: 2023-07-15
    const match = lower.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  // If no recognized date pattern, return null:
  return null;
}

/**
 * GET_MEETS_FOR_DATE Action:
 * User might say: "Show me all the racing meets for 2023-07-15" or "Show me all meets for yesterday."
 * We parse the date, then fetch meets, and present them.
 */
export const getMeetsForDateAction: Action = {
  name: "GET_MEETS_FOR_DATE",
  description: "Fetches all racing meets for a given date.",
  similes: ["GET_MEETS", "SHOW_MEETS_FOR_DATE"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    return text.includes("meets") && (text.includes("yesterday") || /\d{4}-\d{2}-\d{2}/.test(text));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const text = message.content.text;
    const dateStr = parseUserDate(text);
    if (!dateStr) {
      return callback({ text: "I’m sorry, I couldn’t understand the date you mentioned." }, []);
    }

    // Fetch meets for that date
    const meets = await getMeetsForDate(runtime, dateStr);
    if (meets.length === 0) {
      return callback({ text: `No meets found for ${dateStr}.` }, []);
    }

    let response = `Meets for ${dateStr}:\n`;
    meets.forEach(meet => {
      response += `- Meet ID: ${meet.meet_id}, Date: ${meet.date}\n`;
    });

    callback({ text: response.trim() }, []);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Show me all the racing meets for yesterday." }
      },
      {
        user: "Ava",
        content: {
          text: "Sure, retrieving meets for yesterday...",
          action: "GET_MEETS_FOR_DATE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "What meets happened on 2023-07-15?" }
      },
      {
        user: "Ava",
        content: {
          text: "Let me check the meets for that date...",
          action: "GET_MEETS_FOR_DATE"
        }
      }
    ]
  ] as ActionExample[][]
};

/**
 * GET_MEET_DETAILS Action:
 * User might say: "Show me entries and results for meet_id XYZ"
 * We'll fetch entries and results using our provider functions.
 */
export const getMeetDetailsAction: Action = {
  name: "GET_MEET_DETAILS",
  description: "Fetches entries and results for a given meet_id.",
  similes: ["MEET_DETAILS", "SHOW_MEET_INFO"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    // Simple validation: check if user mentions 'meet_id'
    return message.content.text.toLowerCase().includes("meet_id");
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const text = message.content.text;
    // Extract meet_id from text. Assuming user says something like: "meet_id 12345"
    const match = text.match(/meet_id\s+(\S+)/i);
    if (!match) {
      return callback({ text: "I’m sorry, I couldn’t find a meet_id in your request." }, []);
    }
    const meet_id = match[1];

    const entries = await getMeetEntries(runtime, meet_id);
    const results = await getMeetResults(runtime, meet_id);

    let response = `Details for meet_id ${meet_id}:\n`;

    if (entries && Array.isArray(entries.entries)) {
      response += `Entries:\n`;
      entries.entries.forEach((entry: any, i: number) => {
        response += `${i + 1}. ${entry.horse_name} - ${entry.jockey}\n`;
      });
    } else {
      response += `No entries found.\n`;
    }

    if (results && Array.isArray(results.results)) {
      response += `\nResults:\n`;
      results.results.forEach((res: any, i: number) => {
        response += `${i + 1}. ${res.horse_name} finished at position ${res.position}\n`;
      });
    } else {
      response += `No results found.\n`;
    }

    callback({ text: response.trim() }, []);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Show me entries and results for meet_id A123" }
      },
      {
        user: "Ava",
        content: { text: "Fetching meet details...", action: "GET_MEET_DETAILS" }
      }
    ]
  ] as ActionExample[][]
};

/**
 * GET_DATA_FOR_DATE_RANGE Action:
 * Fetch data for a range of dates (e.g., from 2023-07-01 to 2023-07-07),
 * summarizing how many meets were found.
 * This might be useful if the user says: "Summarize all meets from last week."
 */
export const getDataForDateRangeAction: Action = {
  name: "GET_DATA_FOR_DATE_RANGE",
  description: "Fetches and summarizes data for a given date range.",
  similes: ["GET_DATA_RANGE", "SHOW_DATA_RANGE"],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    // Validate if user mentions something like 'from 2023-07-01 to 2023-07-05'
    return /from\s+\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}/.test(text);
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    const text = message.content.text;
    const match = text.match(/from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/);
    if (!match) {
      return callback({ text: "I’m sorry, I couldn’t parse the date range." }, []);
    }

    const start = match[1];
    const end = match[2];

    // Using the provider function getDataForDateRange,
    // currently it logs and fetches meets/entries/results for each day.
    // We can store the data or just trust the logs. For now, let's just confirm we did it.
    await getDataForDateRange(runtime, start, end);

    callback({ text: `Fetched and processed data for the range ${start} to ${end}. Check the logs for details.` }, []);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Summarize data from 2023-07-01 to 2023-07-07." }
      },
      {
        user: "Ava",
        content: {
          text: "Alright, fetching data for that date range...",
          action: "GET_DATA_FOR_DATE_RANGE"
        }
      }
    ]
  ] as ActionExample[][]
};
