import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";

const CITIZENS = 8;
const RESOURCE_TYPES = ["food", "water", "wood"];

function rng(seed) {
  let value = seed >>> 0;
  return {
    next() {
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return value >>> 0;
    },
    state() {
      return value >>> 0;
    },
  };
}

function initialState(seed) {
  return {
    seed,
    time: 0,
    sequence: 0,
    resources: { food: 16, water: 16, wood: 0 },
    citizens: Array.from({ length: CITIZENS }, (_, id) => ({
      id: `c${id + 1}`,
      hunger: id % 2,
      thirst: (id + 1) % 2,
      energy: 10,
      inventory: { food: 0, water: 0, wood: 0 },
      lastEventId: null,
    })),
  };
}

function canonicalState(state) {
  return JSON.stringify({
    seed: state.seed,
    time: state.time,
    sequence: state.sequence,
    resources: state.resources,
    citizens: state.citizens,
  });
}

function hashState(state) {
  return createHash("sha256").update(canonicalState(state)).digest("hex");
}

function schedule(queue, item) {
  queue.push(item);
  queue.sort((a, b) => a.time - b.time || a.actor.localeCompare(b.actor));
}

function record(state, events, actor, kind, payload, causalParents) {
  const event = {
    id: `e${String(state.sequence + 1).padStart(6, "0")}`,
    sequence: state.sequence + 1,
    time: state.time,
    actor,
    kind,
    payload,
    causalParents: causalParents.filter(Boolean),
    preHash: hashState(state),
  };
  state.sequence += 1;
  events.push(event);
  return event;
}

function applyAction(state, events, random, actorId, queue) {
  const citizen = state.citizens.find(({ id }) => id === actorId);
  const parents = [citizen.lastEventId];

  if (citizen.thirst >= 3 && state.resources.water > 0) {
    const event = record(state, events, actorId, "consume", { resource: "water", amount: 1 }, parents);
    state.resources.water -= 1;
    citizen.thirst = Math.max(0, citizen.thirst - 3);
    citizen.energy = Math.min(10, citizen.energy + 1);
    citizen.lastEventId = event.id;
  } else if (citizen.hunger >= 3 && state.resources.food > 0) {
    const event = record(state, events, actorId, "consume", { resource: "food", amount: 1 }, parents);
    state.resources.food -= 1;
    citizen.hunger = Math.max(0, citizen.hunger - 3);
    citizen.energy = Math.min(10, citizen.energy + 1);
    citizen.lastEventId = event.id;
  } else {
    const resource = RESOURCE_TYPES[random.next() % RESOURCE_TYPES.length];
    const amount = resource === "wood" ? 2 : 1;
    const event = record(state, events, actorId, "gather", { resource, amount }, parents);
    state.resources[resource] += amount;
    citizen.energy = Math.max(0, citizen.energy - 1);
    citizen.hunger += 1;
    citizen.thirst += 1;
    citizen.lastEventId = event.id;
  }

  const delay = 45 + (random.next() % 31);
  schedule(queue, { time: state.time + delay, actor: actorId });
}

function simulate(seed, targetMinutes, mode) {
  const state = initialState(seed);
  const random = rng(seed);
  const events = [];
  const queue = state.citizens.map(({ id }, index) => ({ time: 10 + index * 2, actor: id }));
  const started = performance.now();

  if (mode === "tick") {
    for (let minute = 0; minute <= targetMinutes; minute += 1) {
      state.time = minute;
      while (queue[0]?.time === minute) {
        const next = queue.shift();
        applyAction(state, events, random, next.actor, queue);
      }
    }
  } else {
    while (queue[0]?.time <= targetMinutes) {
      const next = queue.shift();
      state.time = next.time;
      applyAction(state, events, random, next.actor, queue);
    }
    state.time = targetMinutes;
  }

  return {
    state,
    events,
    queue,
    prngState: random.state(),
    hash: hashState(state),
    elapsedMs: performance.now() - started,
  };
}

function replay(seed, targetMinutes, events) {
  const state = initialState(seed);
  for (const event of events) {
    state.time = event.time;
    state.sequence = event.sequence;
    const citizen = state.citizens.find(({ id }) => id === event.actor);
    if (event.kind === "gather") {
      state.resources[event.payload.resource] += event.payload.amount;
      citizen.energy = Math.max(0, citizen.energy - 1);
      citizen.hunger += 1;
      citizen.thirst += 1;
    } else {
      state.resources[event.payload.resource] -= event.payload.amount;
      if (event.payload.resource === "water") citizen.thirst = Math.max(0, citizen.thirst - 3);
      if (event.payload.resource === "food") citizen.hunger = Math.max(0, citizen.hunger - 3);
      citizen.energy = Math.min(10, citizen.energy + 1);
    }
    citizen.lastEventId = event.id;
  }
  state.time = targetMinutes;
  return { state, hash: hashState(state) };
}

for (const [label, minutes] of [["24h", 24 * 60], ["7d", 7 * 24 * 60]]) {
  const tick = simulate(0xe0f01c, minutes, "tick");
  const discrete = simulate(0xe0f01c, minutes, "discrete");
  const repeated = simulate(0xe0f01c, minutes, "discrete");
  const replayed = replay(0xe0f01c, minutes, discrete.events);
  const causalCoverage = discrete.events.filter(({ causalParents }) => causalParents.length > 0).length;

  const result = {
    horizon: label,
    events: discrete.events.length,
    tickMs: Number(tick.elapsedMs.toFixed(3)),
    discreteMs: Number(discrete.elapsedMs.toFixed(3)),
    speedup: Number((tick.elapsedMs / Math.max(discrete.elapsedMs, 0.001)).toFixed(2)),
    tickEqualsDiscrete: tick.hash === discrete.hash,
    repeatedRunEquals: repeated.hash === discrete.hash,
    replayEquals: replayed.hash === discrete.hash,
    causalParentCoverage: `${causalCoverage}/${discrete.events.length}`,
    finalHash: discrete.hash,
    prngState: discrete.prngState,
  };
  console.log(JSON.stringify(result));
  if (!result.tickEqualsDiscrete || !result.repeatedRunEquals || !result.replayEquals) process.exitCode = 1;
}
