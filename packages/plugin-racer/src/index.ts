// src/index.ts
import { Plugin } from "@ai16z/eliza";

// Import evaluators and providers
import { factEvaluator } from "./evaluators/fact.js";
import { goalEvaluator } from "./evaluators/goal.js";
import { timeProvider } from "./providers/time.js";
import { factsProvider } from "./providers/facts.js";
import { racingAPIProvider } from "./providers/racing.js";

// Import all actions
import { noneAction } from "./actions/none.js";
import { getRaceResultsAction, getDriverStandingsAction, getNextRaceAction } from "./actions/racing.js";
import { getMeetsForDateAction, getMeetDetailsAction, getDataForDateRangeAction } from "./actions/extendedRacing.js";

import { getHorseDetailsAction, getHorseResultsAction, getHorseAnalysisAction } from "./actions/horse.js";
import { getTrainerDetailsAction, getTrainerResultsAction, getTrainerAnalysisAction } from "./actions/trainer";
import { getJockeyDetailsAction, getJockeyResultsAction, getJockeyAnalysisAction } from "./actions/jockey";
import { getOwnerDetailsAction, getOwnerResultsAction, getOwnerAnalysisAction } from "./actions/owner.js";
import { getSireDetailsAction, getSireResultsAction, getSireAnalysisAction } from "./actions/sire.js";
import { getDamDetailsAction, getDamResultsAction, getDamAnalysisAction } from "./actions/dam.js";
import { getDamsireDetailsAction, getDamsireResultsAction, getDamsireAnalysisAction } from "./actions/damsire.js";

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

    // Horse actions
    getHorseDetailsAction,
    getHorseResultsAction,
    getHorseAnalysisAction,

    // Trainer actions
    getTrainerDetailsAction,
    getTrainerResultsAction,
    getTrainerAnalysisAction,

    // Jockey actions
    getJockeyDetailsAction,
    getJockeyResultsAction,
    getJockeyAnalysisAction,

    // Owner actions
    getOwnerDetailsAction,
    getOwnerResultsAction,
    getOwnerAnalysisAction,

    // Sire actions
    getSireDetailsAction,
    getSireResultsAction,
    getSireAnalysisAction,

    // Dam actions
    getDamDetailsAction,
    getDamResultsAction,
    getDamAnalysisAction,

    // Damsire actions
    getDamsireDetailsAction,
    getDamsireResultsAction,
    getDamsireAnalysisAction,
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