export const maxCanalStock = 120;

export const state = {
  running: false,
  paused: false,
  tick: 0,
  score: 0,
  canalStock: 34,
  deleteMode: false,
  gridLocked: localStorage.getItem('CloudCanalsGrid') === 'true',
  soundOn: localStorage.getItem('CloudCanalsSound') !== 'false',
  nextSpawnTick: 1200,
  season: 1,
  seasonTick: 0,
  objective: null,
  objectiveCompleted: false,
  harvestsThisSeason: 0,
  bestScore: Number(localStorage.getItem('CloudCanalsBestScore') ?? 0),
  bestSeason: Number(localStorage.getItem('CloudCanalsBestSeason') ?? 1),
};

export const canals = [];
export const stations = [];
export const springs = [];
export const fields = [];
export const reservoirs = [];
export const blockers = [];
export const decorClouds = [];

export const resetState = () => {
  state.running = false;
  state.paused = false;
  state.tick = 0;
  state.score = 0;
  state.canalStock = 34;
  state.deleteMode = false;
  state.nextSpawnTick = 1200;
  state.season = 1;
  state.seasonTick = 0;
  state.objective = null;
  state.objectiveCompleted = false;
  state.harvestsThisSeason = 0;
  canals.length = 0;
  stations.length = 0;
  springs.length = 0;
  fields.length = 0;
  reservoirs.length = 0;
  blockers.length = 0;
  decorClouds.length = 0;
};
