const freeze = (value) => Object.freeze(value);

export const FIXTURE_ID = "gate0-visual-v1";
export const RENDERER_MODE = "pixi-semantic";

export const VIEWPORTS = freeze({
  desktop: freeze({ id: "desktop-1728x1117", width: 1728, height: 1117 }),
  laptop: freeze({ id: "laptop-1366x768", width: 1366, height: 768 }),
  mobile: freeze({ id: "mobile-390x844", width: 390, height: 844 }),
});

export const ACTIVITY_FAMILIES = freeze([
  freeze({ id: "activity:carry-water", label: "carrying water" }),
  freeze({ id: "activity:exchange-rations", label: "exchanging wood and rations" }),
  freeze({ id: "activity:gather-wood", label: "gathering wood" }),
]);

export const CITIZENS = freeze([
  freeze({ id: "citizen:mara", name: "Mara", activityId: "activity:carry-water", activity: "carrying water to the market tally", prop: "blue water jug", salient: true }),
  freeze({ id: "citizen:toma", name: "Toma", activityId: "activity:exchange-rations", activity: "exchanging wood and rations with Iven", prop: "ration bundle" }),
  freeze({ id: "citizen:iven", name: "Iven", activityId: "activity:exchange-rations", activity: "exchanging wood and rations with Toma", prop: "forked wood bundle" }),
  freeze({ id: "citizen:sera", name: "Sera", activityId: "activity:carry-water", activity: "carrying water from the well", prop: "blue bucket" }),
  freeze({ id: "citizen:nadi", name: "Nadi", activityId: "activity:gather-wood", activity: "gathering wood by the north path", prop: "forked sticks" }),
  freeze({ id: "citizen:owen", name: "Owen", activityId: "activity:gather-wood", activity: "gathering wood near the mill", prop: "wood bundle" }),
  freeze({ id: "citizen:bela", name: "Bela", activityId: "activity:carry-water", activity: "carrying water toward the bridge", prop: "blue jug" }),
  freeze({ id: "citizen:corin", name: "Corin", activityId: "activity:gather-wood", activity: "gathering wood beside the woodpile", prop: "forked sticks" }),
]);

export const MARA_PROJECTION = freeze({
  citizenId: "citizen:mara",
  autonomy: "She acts for herself",
  standingPlan: "Standing Plan: check Iven's tally, then decide what to tell Toma.",
  visibleReason: "Reason: the public ledger and the open-bin count differ.",
  tension: "Mara's concern could strain her trust with Toma.",
});

export const AUTHORITATIVE_INTERACTION = freeze({
  token: "interaction:iven,toma|exchange-settled",
  actorIds: freeze(["citizen:iven", "citizen:toma"]),
  changeId: "exchange-settled",
  label: "Iven and Toma exchanged wood and rations; the exchange settled.",
  authoritative: true,
});

export const MARA_TOMA_CUE = freeze({
  actorIds: freeze(["citizen:mara", "citizen:toma"]),
  label: "Mara and Toma compare the market tally; their concern remains unresolved.",
  status: "relationship cue — no authoritative change",
  authoritative: false,
});

export const CHRONICLE_BEAT = freeze({
  id: "chronicle:exchange-settled",
  heading: "Exchange settled",
  text: "Iven and Toma exchanged wood and rations at the Riverhold market.",
  evidenceToken: "interaction:iven,toma|exchange-settled",
});

export const ANSWER_KEY = freeze({
  mara: "citizen:mara",
  activities: "activity:carry-water,activity:exchange-rations,activity:gather-wood",
  interaction: "interaction:iven,toma|exchange-settled",
  autonomy: "cannot-command|standing-plan",
});

export const FIXTURE = freeze({
  fixtureId: FIXTURE_ID,
  rendererMode: RENDERER_MODE,
  region: freeze({ id: "riverhold", name: "Riverhold", revision: 12, simulationTime: 60 }),
  citizens: CITIZENS,
  activities: ACTIVITY_FAMILIES,
  mara: MARA_PROJECTION,
  authoritativeInteraction: AUTHORITATIVE_INTERACTION,
  relationshipCue: MARA_TOMA_CUE,
  chronicleBeat: CHRONICLE_BEAT,
  answerKey: ANSWER_KEY,
});
