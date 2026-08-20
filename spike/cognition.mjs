import { createHash } from "node:crypto";

const MODEL = "qwen3-coder:30b";
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["action", "target", "publicJustification"],
  properties: {
    action: { type: "string", enum: ["help_mara", "speak_to_ioren", "gather_wood"] },
    target: { type: "string", enum: ["mara", "ioren", "north_grove"] },
    publicJustification: { type: "string", minLength: 1, maxLength: 120 },
  },
};

const initialContext = {
  expectedRevision: 41,
  visibleFacts: ["Mara asked for help repairing the east well", "Ioren is waiting at the market"],
  sourcedBeliefs: [{ claim: "Mara keeps promises", confidence: 0.7, source: "direct-memory-17" }],
  standingPlan: "Keep the east household supplied without breaking the promise to Ioren.",
  actions: [
    { type: "help_mara", target: "mara", effort: 2 },
    { type: "speak_to_ioren", target: "ioren", effort: 1 },
    { type: "gather_wood", target: "north_grove", effort: 2 },
  ],
  budget: { effort: 2 },
};

function standardBrain(context) {
  const affordable = context.actions.filter((action) => action.effort <= context.budget.effort);
  const preferred = affordable.find((action) => action.type === "help_mara") ?? affordable[0];
  return {
    action: preferred.type,
    target: preferred.target,
    publicJustification: "I will address the most urgent visible commitment within today's effort.",
  };
}

function validate(proposal, context, actualRevision) {
  if (actualRevision !== context.expectedRevision) return { accepted: false, reason: "stale_revision" };
  const known = context.actions.find(
    (action) => action.type === proposal.action && action.target === proposal.target,
  );
  if (!known) return { accepted: false, reason: "unknown_action" };
  if (known.effort > context.budget.effort) return { accepted: false, reason: "over_budget" };
  return { accepted: true, reason: "validated" };
}

async function propose(context) {
  const prompt = [
    "Return one JSON intent proposal. Do not reveal hidden reasoning.",
    "Use only the supplied visible facts and exact action catalog.",
    "The justification is public and must be one short sentence.",
    JSON.stringify(context),
  ].join("\n");
  const started = performance.now();
  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      format: SCHEMA,
      stream: false,
      think: false,
      options: { temperature: 0, seed: 17, num_predict: 90 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const body = await response.json();
  return {
    proposal: JSON.parse(body.response),
    elapsedMs: performance.now() - started,
    promptEvalCount: body.prompt_eval_count,
    evalCount: body.eval_count,
  };
}

const deterministicFallback = standardBrain(initialContext);
let firstModelRun = null;
let replannedModelRun = null;
let modelError = null;

try {
  firstModelRun = await propose(initialContext);
  firstModelRun.validation = validate(firstModelRun.proposal, initialContext, 41);

  const changedContext = {
    ...initialContext,
    expectedRevision: 42,
    visibleFacts: [...initialContext.visibleFacts, "The east well repair is already under way"],
    actions: initialContext.actions.filter((action) => action.type !== "help_mara"),
  };
  firstModelRun.staleValidation = validate(firstModelRun.proposal, initialContext, 42);
  replannedModelRun = await propose(changedContext);
  replannedModelRun.validation = validate(replannedModelRun.proposal, changedContext, 42);
} catch (error) {
  modelError = error instanceof Error ? error.message : String(error);
}

const result = {
  recordedAt: new Date().toISOString(),
  model: MODEL,
  modelProvenance: "existing local Ollama model; no network inference or new download",
  contextHash: createHash("sha256").update(JSON.stringify(initialContext)).digest("hex"),
  deterministicFallback,
  fallbackValidation: validate(deterministicFallback, initialContext, 41),
  firstModelRun,
  replannedModelRun,
  modelError,
};

console.log(JSON.stringify(result, null, 2));
