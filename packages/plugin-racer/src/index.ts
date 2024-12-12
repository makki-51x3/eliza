// src/index.ts
import { Plugin } from "@ai16z/eliza";
import { noneAction } from "./actions/none.js";
import { getRaceResultsAction, getDriverStandingsAction, getNextRaceAction } from "./actions/racing.js";
import { getHorseDetailsAction } from "./actions/horse.js";
import { getMeetsForDateAction, getMeetDetailsAction, getDataForDateRangeAction } from "./actions/extendedRacing.js";
import { factEvaluator } from "./evaluators/fact.js";
import { goalEvaluator } from "./evaluators/goal.js";
import { timeProvider } from "./providers/time.js";
import { factsProvider } from "./providers/facts.js";
import { racingAPIProvider } from "./providers/racing.js";

/**
 * The racerPlugin integrates all actions, evaluators, and providers into a cohesive whole.
 * The agent can now respond to user requests about racing data, update its internal goal/fact state,
 * and leverage time/facts providers.
 */
const racerPlugin: Plugin = {
  name: "racer",
  description: "Provides racing data actions and evaluators along with basic actions.",
  actions: [
    noneAction,
    getRaceResultsAction,
    getDriverStandingsAction,
    getNextRaceAction,
    getMeetsForDateAction,
    getMeetDetailsAction,
    getDataForDateRangeAction,
    getHorseDetailsAction
  ],
  evaluators: [
    factEvaluator,
    goalEvaluator
  ],
  providers: [
    timeProvider,
    factsProvider,
    racingAPIProvider,
  ]
};

export { racerPlugin };
export default racerPlugin;
