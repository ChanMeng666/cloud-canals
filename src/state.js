export const state = {
  running: false,
  paused: false,
  tick: 0,
  score: 0,
  canalStock: 22,
  deleteMode: false,
  gridLocked: localStorage.getItem('CloudCanalsGrid') === 'true',
  soundOn: localStorage.getItem('CloudCanalsSound') !== 'false',
  nextSpawnTick: 1200,
};

export const canals = [];
export const stations = [];
export const springs = [];
export const fields = [];
export const reservoirs = [];
export const blockers = [];

export const resetState = () => {
  state.running = false;
  state.paused = false;
  state.tick = 0;
  state.score = 0;
  state.canalStock = 22;
  state.deleteMode = false;
  state.nextSpawnTick = 1200;
  canals.length = 0;
  stations.length = 0;
  springs.length = 0;
  fields.length = 0;
  reservoirs.length = 0;
  blockers.length = 0;
};
