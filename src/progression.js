import {
  fields, reservoirs, state,
} from './state.js';
import { hasWaterAt } from './canal.js';
import { sounds } from './audio.js';

export const seasonLength = 900;

const objectiveTemplates = {
  harvest: (season) => ({
    type: 'harvest',
    label: 'Harvest crops',
    target: Math.min(10, 2 + Math.floor(season / 2)),
    reward: 'Canals +5',
  }),
  water: (season) => ({
    type: 'water',
    label: 'Keep fields watered',
    target: Math.min(78, 56 + season * 3),
    reward: 'Field moisture +12',
  }),
  connected: (season) => ({
    type: 'connected',
    label: 'Connect fields',
    target: Math.min(fields.length, 2 + Math.floor(season / 2)),
    reward: 'Score +2, canals +4',
  }),
  reservoir: () => ({
    type: 'reservoir',
    label: 'Fill a reservoir',
    target: 58,
    reward: 'Canals +8',
  }),
};

const averageFieldWater = () => (
  fields.length
    ? fields.reduce((sum, field) => sum + field.moisture, 0) / fields.length
    : 0
);

const connectedFieldCount = () => fields.filter((field) => field.connectors.some(hasWaterAt)).length;

const maxReservoirStorage = () => (
  reservoirs.length
    ? Math.max(...reservoirs.map((reservoir) => reservoir.storage))
    : 0
);

const chooseObjective = () => {
  if (reservoirs.length && state.season % 4 === 0) return objectiveTemplates.reservoir(state.season);
  if (fields.length >= 3 && state.season % 3 === 0) return objectiveTemplates.connected(state.season);
  if (state.season % 2 === 0) return objectiveTemplates.water(state.season);
  return objectiveTemplates.harvest(state.season);
};

export const initProgression = () => {
  state.objective = chooseObjective();
  state.objectiveCompleted = false;
  state.harvestsThisSeason = 0;
};

export const recordHarvest = () => {
  state.harvestsThisSeason++;
};

const objectiveProgress = () => {
  if (!state.objective) return 0;
  if (state.objective.type === 'harvest') return state.harvestsThisSeason;
  if (state.objective.type === 'water') return averageFieldWater();
  if (state.objective.type === 'connected') return connectedFieldCount();
  if (state.objective.type === 'reservoir') return maxReservoirStorage();
  return 0;
};

const applyReward = () => {
  if (state.objective.type === 'harvest') {
    state.canalStock = Math.min(99, state.canalStock + 5);
  } else if (state.objective.type === 'water') {
    fields.forEach((field) => {
      field.moisture = Math.min(100, field.moisture + 12);
    });
  } else if (state.objective.type === 'connected') {
    state.score += 2;
    state.canalStock = Math.min(99, state.canalStock + 4);
  } else if (state.objective.type === 'reservoir') {
    state.canalStock = Math.min(99, state.canalStock + 8);
    reservoirs.forEach((reservoir) => {
      reservoir.storage = Math.min(100, reservoir.storage + 12);
    });
  }
};

const persistBests = () => {
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem('CloudCanalsBestScore', state.bestScore);
  }
  if (state.season > state.bestSeason) {
    state.bestSeason = state.season;
    localStorage.setItem('CloudCanalsBestSeason', state.bestSeason);
  }
};

export const updateProgression = () => {
  const messages = [];
  state.seasonTick++;

  if (state.objective && !state.objectiveCompleted && objectiveProgress() >= state.objective.target) {
    state.objectiveCompleted = true;
    applyReward();
    persistBests();
    sounds.objective();
    messages.push(`Objective complete: ${state.objective.reward}`);
  }

  if (state.seasonTick >= seasonLength) {
    if (state.objective && !state.objectiveCompleted) {
      messages.push(`Season ${state.season} ended. New objective ready.`);
    } else {
      messages.push(`Season ${state.season + 1} begins.`);
    }
    state.season++;
    state.seasonTick = 0;
    state.harvestsThisSeason = 0;
    state.objective = chooseObjective();
    state.objectiveCompleted = false;
    persistBests();
    sounds.season();
  }

  return messages;
};

export const getObjectiveSummary = () => {
  if (!state.objective) {
    return {
      label: 'Preparing objective',
      progressText: '0/0',
      progressRatio: 0,
      completed: false,
      seasonRatio: 0,
    };
  }

  const progress = objectiveProgress();
  const ratio = Math.min(1, progress / state.objective.target);
  const percentObjective = state.objective.type === 'water' || state.objective.type === 'reservoir';

  return {
    label: state.objective.label,
    progressText: percentObjective
      ? `${Math.floor(progress)}%/${state.objective.target}%`
      : `${Math.floor(progress)}/${state.objective.target}`,
    progressRatio: ratio,
    completed: state.objectiveCompleted,
    reward: state.objective.reward,
    seasonRatio: state.seasonTick / seasonLength,
  };
};
