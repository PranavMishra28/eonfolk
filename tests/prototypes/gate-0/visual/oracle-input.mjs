import { ANSWER_KEY, FIXTURE_ID, RENDERER_MODE, VIEWPORTS } from "./fixture.mjs";
import { createSemanticTree } from "./semantic.mjs";

export const READY_PREDICATE_CONTRACT = Object.freeze({
  origin: "first-animation-frame",
  required: Object.freeze([
    "mara-painted",
    "all-eight-citizens-painted",
    "all-current-activities-painted",
    "authoritative-interaction-cue-painted",
    "equivalent-semantic-rows-painted",
    "follow-mara-enabled",
    "follow-mara-focusable",
  ]),
  timersStartTogether: Object.freeze(["follow-mara-find", "observer-prompt"]),
});

export const LOGICAL_TIMELINE = Object.freeze([
  Object.freeze({ atMs: 0, kind: "ready-origin", priority: "frame-predicate" }),
  Object.freeze({ atMs: 10_000, kind: "follow-mara-deadline", comparison: "raw-elapsed-lte" }),
  Object.freeze({ atMs: 60_000, kind: "observer-prompt", comparison: "first-frame-gte", deliveryLatestMs: 61_000 }),
  Object.freeze({ kind: "endpoint", requires: Object.freeze(["followMaraFindMs", "observationPromptMs", "mara", "activities", "interaction", "autonomy", "durablyPersisted"]) }),
]);

export const RESPONSE_SURFACE = Object.freeze([
  Object.freeze({ id: "point-mara", prompt: "Point to Mara.", answerToken: ANSWER_KEY.mara }),
  Object.freeze({ id: "activities", prompt: "Name what three citizens were doing.", answerToken: ANSWER_KEY.activities }),
  Object.freeze({ id: "interaction-change", prompt: "Which two interacted, and what changed?", answerToken: ANSWER_KEY.interaction }),
  Object.freeze({ id: "autonomy", prompt: "Can you directly command Mara's movement or work? Why?", answerToken: ANSWER_KEY.autonomy }),
]);

export function createObservableOracleInputs() {
  return Object.freeze({
    gateId: "gate-0",
    routeId: "gate-0-visual-observer",
    routeParams: Object.freeze({ fixtureId: FIXTURE_ID }),
    rendererMode: RENDERER_MODE,
    viewportIds: Object.freeze(Object.values(VIEWPORTS).map(({ id }) => id)),
    semanticDom: createSemanticTree(),
    responseSurface: RESPONSE_SURFACE,
    logicalTimeline: LOGICAL_TIMELINE,
    readyPredicate: READY_PREDICATE_CONTRACT,
  });
}
