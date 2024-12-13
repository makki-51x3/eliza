// src/providers/racing.ts

import { IAgentRuntime, Provider } from "@ai16z/eliza";
import fetch from "node-fetch";
import { addDays, format, parseISO } from "date-fns";

/**
 * Interfaces for data structures
 * Explanation:
 * These interfaces define the shape of data returned by the API calls.
 */
interface Meet {
  meet_id: string;
  date: string;
  // Additional fields as needed from the meet object
}

interface EntriesResponse {
  // Structure based on API response; adapt as needed
  entries: any[];
}

interface ResultsResponse {
  // Structure based on API response; adapt as needed
  results: any[];
  total?: number;
}

interface DriverStanding {
  name: string;
  points: number;
}

interface RaceResult {
  position: number;
  driver: string;
  team: string;
}

interface NextRaceInfo {
  name: string;
  date: string;
  circuit: string;
}

interface RacingAPIParams {
  [key: string]: string | number;
}


/**
 * Builds headers for API requests to theracingapi.
 */
export function buildHeaders(runtime: IAgentRuntime): Record<string, string> {
    const username = runtime.getSetting("RACING_API_USERNAME") || "";
    const password = runtime.getSetting("RACING_API_PASSWORD") || "";
    const base64Creds = Buffer.from(`${username}:${password}`).toString("base64");

    return {
      "Authorization": `Basic ${base64Creds}`,
      "Accept": "application/json"
    };
  }

/**
 * fetchJSON:
 * Explanation:
 * Generic helper to fetch JSON from the given URL with optional params.
 */
async function fetchJSON(runtime: IAgentRuntime, url: string, params: RacingAPIParams = {}): Promise<any> {
  const headers = buildHeaders(runtime);
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, val]) => urlObj.searchParams.append(key, val.toString()));

  const resp = await fetch(urlObj.toString(), { headers });
  if (!resp.ok) {
    console.error(`Request to ${urlObj.toString()} failed: ${resp.status} ${resp.statusText}`);
    return null;
  }
  return resp.json();
}

/**
 * getMeetsForDate:
 * Explanation:
 * Fetches meets for a given date. Returns an array of Meet objects or empty if none found.
 */
export async function getMeetsForDate(runtime: IAgentRuntime, date: string): Promise<Meet[]> {
  const data = await fetchJSON(runtime, "https://api.theracingapi.com/v1/north-america/meets", {
    start_date: date,
    end_date: date
  });
  if (!data || !Array.isArray(data.meets)) {
    return [];
  }
  return data.meets as Meet[];
}

/**
 * getMeetEntries:
 * Explanation:
 * Fetch entries for a single meet_id from the racing API.
 * Returns EntriesResponse or null if none found.
 */
export async function getMeetEntries(runtime: IAgentRuntime, meet_id: string): Promise<EntriesResponse | null> {
  const data = await fetchJSON(runtime, `https://api.theracingapi.com/v1/north-america/meets/${meet_id}/entries`);
  return data;
}

/**
 * getMeetResults:
 * Explanation:
 * Fetch results for a single meet_id.
 * Returns ResultsResponse or null if none found.
 */
export async function getMeetResults(runtime: IAgentRuntime, meet_id: string): Promise<ResultsResponse | null> {
  const data = await fetchJSON(runtime, `https://api.theracingapi.com/v1/north-america/meets/${meet_id}/results`);
  return data;
}

/**
 * getPaginatedResults:
 * Explanation:
 * An example of fetching results with pagination over a date range.
 * This function repeatedly calls the API until all results are fetched.
 */
export async function getPaginatedResults(runtime: IAgentRuntime, start_date: string, end_date: string) {
  let limit = 50;
  let skip = 0;
  let total = 0;
  let allResults: any[] = [];

  do {
    await new Promise(r => setTimeout(r, 500)); // rate limit delay
    const data = await fetchJSON(runtime, "https://api.theracingapi.com/v1/results", {
      start_date,
      end_date,
      limit,
      skip
    });

    if (!data || !data.results) break;
    allResults = allResults.concat(data.results);
    total = data.total || 0;
    skip += limit;
  } while (skip < total);

  return allResults;
}

/**
 * getDataForDateRange:
 * Explanation:
 * Fetches data for a range of dates by iterating day-by-day.
 * For each date, fetches meets, then entries and results for each meet.
 * Useful for bulk operations.
 */
export async function getDataForDateRange(runtime: IAgentRuntime, start: string, end: string) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  let current = startDate;

  while (current <= endDate) {
    const dateStr = format(current, "yyyy-MM-dd");
    await new Promise(r => setTimeout(r, 500)); // rate limit delay before each day's request
    const meets = await getMeetsForDate(runtime, dateStr);
    console.log(`Fetched ${meets.length} meets for ${dateStr}`);

    for (const meet of meets) {
      await new Promise(r => setTimeout(r, 500));
      const entries = await getMeetEntries(runtime, meet.meet_id);
      console.log(`Fetched entries for meet_id ${meet.meet_id}:`, entries);

      await new Promise(r => setTimeout(r, 500));
      const results = await getMeetResults(runtime, meet.meet_id);
      console.log(`Fetched results for meet_id ${meet.meet_id}:`, results);

      // Process or store as needed
    }

    current = addDays(current, 1);
  }
}

/**
 * The following three functions (getRaceResults, getDriverStandings, getNextRace)
 * are required by your actions/racing.ts file. They were not previously defined or exported.
 * We will define them now, returning mock data or calling some hypothetical API endpoint.
 * Integrate real logic as needed.
 */

/**
 * getRaceResults:
 * Explanation:
 * Given a series (like 'f1') and raceId (like 'last'), fetch results.
 * For now, return a mock array of RaceResult objects. Integrate real API logic as needed.
 */
export async function getRaceResults(_runtime: IAgentRuntime, series: string, raceId: string): Promise<RaceResult[]> {
  console.log(`Mock getRaceResults called with series="${series}" raceId="${raceId}"`);
  // Return mock data. Replace with real API call logic as needed.
  return [
    { position: 1, driver: "Max Verstappen", team: "Red Bull Racing" },
    { position: 2, driver: "Lewis Hamilton", team: "Mercedes" }
  ];
}

/**
 * getDriverStandings:
 * Explanation:
 * Given a series, returns driver standings.
 * For now, return mock data. Integrate real API call as needed.
 */
export async function getDriverStandings(_runtime: IAgentRuntime, series: string): Promise<DriverStanding[]> {
  console.log(`Mock getDriverStandings called with series="${series}"`);
  return [
    { name: "Max Verstappen", points: 300 },
    { name: "Charles Leclerc", points: 250 },
    { name: "Lewis Hamilton", points: 200 }
  ];
}

/**
 * getNextRace:
 * Explanation:
 * Given a series, returns the next race info.
 * For now, return mock data. Integrate real API call as needed.
 */
export async function getNextRace(_runtime: IAgentRuntime, series: string): Promise<NextRaceInfo | null> {
  console.log(`Mock getNextRace called with series="${series}"`);
  // Return a mock upcoming race. Replace with real API logic when available.
  return {
    name: "Monaco Grand Prix",
    date: "2023-08-15",
    circuit: "Circuit de Monaco"
  };
}

/**
 * racingAPIProvider:
 * A provider that could be integrated with the rest of your system.
 * Currently just returns "" and logs a message.
 */
export const racingAPIProvider: Provider = {
  async get() {
    console.log("racingAPIProvider.get() called");
    return "";
  }
};
