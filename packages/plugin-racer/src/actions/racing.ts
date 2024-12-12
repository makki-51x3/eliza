import { IAgentRuntime, Action, HandlerCallback, Memory, ActionExample } from "@ai16z/eliza";
import { getRaceResults, getDriverStandings, getNextRace } from "../providers/racing.ts";

/**
 * Parse the racing series from user queries, defaulting to "f1" if no recognizable series found.
 */
function parseSeriesFromMessage(text: string): string {
  console.log(`parseSeriesFromMessage called with text: "${text}"`);
  const lower = text.toLowerCase();
  let series = "f1"; // default

  if (lower.includes("f1") || lower.includes("formula 1")) {
    series = "f1";
  } else if (lower.includes("nascar")) {
    series = "nascar";
  } else if (lower.includes("motogp")) {
    series = "motogp";
  } else if (lower.includes("indycar")) {
    series = "indycar";
  } else if (lower.includes("wec")) {
    series = "wec";
  }

  console.log(`Parsed series: "${series}"`);
  return series;
}

/**
 * Parse race identifier. If user mentions "last race" or "latest race", return "last".
 * Could be extended for specific event parsing if needed.
 */
function parseRaceIdFromMessage(text: string): string {
  console.log(`parseRaceIdFromMessage called with text: "${text}"`);
  const lower = text.toLowerCase();
  let raceId = "last"; // default

  if (lower.includes("last race") || lower.includes("latest race")) {
    raceId = "last";
  }

  console.log(`Parsed raceId: "${raceId}"`);
  return raceId;
}

export const getRaceResultsAction: Action = {
  name: "GET_RACE_RESULTS",
  similes: ["RACE_RESULTS", "LATEST_RESULTS", "WHO_WON"],
  description: "Fetches and returns race results for a requested series and race identifier.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const isValid = /race results|who won the last race|latest race results/i.test(message.content.text);
    console.log(`Validating GET_RACE_RESULTS with message: "${message.content.text}". Valid: ${isValid}`);
    return isValid;
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    console.log(`Handler for GET_RACE_RESULTS invoked with message: "${message.content.text}"`);
    const userText = message.content.text;
    const series = parseSeriesFromMessage(userText);
    const raceId = parseRaceIdFromMessage(userText);

    console.log(`Fetching race results for series: "${series}", raceId: "${raceId}"`);
    try {
      const results = await getRaceResults(runtime, series, raceId);
      console.log(`Received race results:`, results);

      if (results.length === 0) {
        console.log(`No race results found for series: "${series}", raceId: "${raceId}"`);
        return callback({ text: "I’m sorry, I can’t find the race results right now." }, []);
      }

      let formatted = `Here are the ${series.toUpperCase()} ${raceId === "last" ? "most recent" : raceId} race results:\n`;
      for (const r of results) {
        formatted += `${r.position}. ${r.driver} (${r.team})\n`;
      }

      console.log(`Formatted race results: "${formatted.trim()}"`);
      callback({ text: formatted.trim() }, []);
    } catch (error) {
      console.error(`Error fetching race results:`, error);
      callback({ text: "There was an error retrieving the race results. Please try again later." }, []);
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Who won the last F1 race?" }
      },
      {
        user: "RacerBot",
        content: {
          text: "Let me check the latest F1 results for you...",
          action: "GET_RACE_RESULTS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Show me the race results for last week's NASCAR event." }
      },
      {
        user: "RacerBot",
        content: {
          text: "Sure, pulling up last week’s NASCAR results...",
          action: "GET_RACE_RESULTS"
        }
      }
    ]
  ] as ActionExample[][]
};

export const getDriverStandingsAction: Action = {
  name: "GET_DRIVER_STANDINGS",
  similes: ["CURRENT_STANDINGS", "DRIVER_STANDINGS"],
  description: "Provides current driver standings for a specified racing series.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const isValid = /driver standings|current standings/i.test(message.content.text);
    console.log(`Validating GET_DRIVER_STANDINGS with message: "${message.content.text}". Valid: ${isValid}`);
    return isValid;
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    console.log(`Handler for GET_DRIVER_STANDINGS invoked with message: "${message.content.text}"`);
    const series = parseSeriesFromMessage(message.content.text);
    console.log(`Fetching driver standings for series: "${series}"`);

    try {
      const standings = await getDriverStandings(runtime, series);
      console.log(`Received driver standings:`, standings);

      if (standings.length === 0) {
        console.log(`No driver standings found for series: "${series}"`);
        return callback({ text: "I’m sorry, I can’t retrieve the current standings at the moment." }, []);
      }

      let formatted = `Current ${series.toUpperCase()} Driver Standings:\n`;
      standings.forEach((driver, i) => {
        formatted += `${i + 1}. ${driver.name} - ${driver.points} points\n`;
      });

      console.log(`Formatted driver standings: "${formatted.trim()}"`);
      callback({ text: formatted.trim() }, []);
    } catch (error) {
      console.error(`Error fetching driver standings:`, error);
      callback({ text: "There was an error retrieving the driver standings. Please try again later." }, []);
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "What are the current F1 driver standings?" }
      },
      {
        user: "RacerBot",
        content: {
          text: "Fetching the current F1 standings now...",
          action: "GET_DRIVER_STANDINGS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Show me who is leading in NASCAR right now." }
      },
      {
        user: "RacerBot",
        content: {
          text: "Let me get the current NASCAR driver standings for you...",
          action: "GET_DRIVER_STANDINGS"
        }
      }
    ]
  ] as ActionExample[][]
};

export const getNextRaceAction: Action = {
  name: "GET_NEXT_RACE",
  similes: ["UPCOMING_RACE", "NEXT_RACE"],
  description: "Provides details of the upcoming race in the specified racing series.",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const isValid = /next race|upcoming race/i.test(message.content.text);
    console.log(`Validating GET_NEXT_RACE with message: "${message.content.text}". Valid: ${isValid}`);
    return isValid;
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state, _options, callback: HandlerCallback) => {
    console.log(`Handler for GET_NEXT_RACE invoked with message: "${message.content.text}"`);
    const series = parseSeriesFromMessage(message.content.text);
    console.log(`Fetching next race for series: "${series}"`);

    try {
      const nextRace = await getNextRace(runtime, series);
      console.log(`Received next race details:`, nextRace);

      if (!nextRace) {
        console.log(`No upcoming race found for series: "${series}"`);
        return callback({ text: "I’m sorry, I can’t find the upcoming race details right now." }, []);
      }

      const info = `The next ${series.toUpperCase()} race is the ${nextRace.name} on ${nextRace.date} at ${nextRace.circuit}.`;
      console.log(`Formatted next race info: "${info}"`);
      callback({ text: info }, []);
    } catch (error) {
      console.error(`Error fetching next race details:`, error);
      callback({ text: "There was an error retrieving the next race details. Please try again later." }, []);
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "When is the next MotoGP race?" }
      },
      {
        user: "RacerBot",
        content: {
          text: "Let me check the upcoming MotoGP event details...",
          action: "GET_NEXT_RACE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "What’s the next IndyCar race scheduled?" }
      },
      {
        user: "RacerBot",
        content: {
          text: "One moment, I'll find the next IndyCar race information.",
          action: "GET_NEXT_RACE"
        }
      }
    ]
  ] as ActionExample[][]
};
