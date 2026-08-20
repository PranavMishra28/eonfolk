import { createHash } from "node:crypto";
import { GATE0_OPTION_SETS, GATE_ID, VISUAL_ASSIGNMENTS } from "./contract.ts";

const u32be = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const frame = (bytes: Uint8Array) => Buffer.concat([u32be(bytes.byteLength), Buffer.from(bytes)]);
const utf8 = (value: string) => Buffer.from(value.normalize("NFC"), "utf8");

export function sha256Hex(bytes: string | Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }
export function studySeed(planBase: string, gateId = GATE_ID): string { return sha256Hex(`EONFOLK-STUDY-v1\n${planBase}\n${gateId}`); }

export function tupleV2(tag: string, fields: readonly Uint8Array[]): Buffer {
  return Buffer.concat([Buffer.from("EONFOLK-TUPLE-v2\0", "ascii"), frame(utf8(tag)), ...fields.map(frame)]);
}

export function optionSeedDigest(seedHex: string, studyId: string, presentation: string, questionId: string): string {
  if (!/^[0-9a-f]{64}$/.test(seedHex)) throw new Error("seed must be lowercase 64-hex");
  if ([studyId, presentation, questionId].some((id) => id.includes("/"))) throw new Error("tuple ID component contains /");
  return sha256Hex(tupleV2("EONFOLK:PRNG-SEED:v2", [Buffer.from(seedHex, "hex"), utf8("study-options"), utf8(`${studyId}/${presentation}`), utf8(questionId)]));
}

export function xoshiroDraws(digestHex: string): () => number {
  const digest = Buffer.from(digestHex, "hex");
  const state = [0, 4, 8, 12].map((offset) => digest.readUInt32LE(offset));
  if (state.every((word) => word === 0)) state.splice(0, 4, 0x9e3779b9, 0x243f6a88, 0xb7e15162, 0xdeadbeef);
  const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;
  return () => {
    const result = Math.imul(rotl(Math.imul(state[1]!, 5) >>> 0, 7), 9) >>> 0;
    const t = (state[1]! << 9) >>> 0;
    state[2] = (state[2]! ^ state[0]!) >>> 0; state[3] = (state[3]! ^ state[1]!) >>> 0;
    state[1] = (state[1]! ^ state[2]!) >>> 0; state[0] = (state[0]! ^ state[3]!) >>> 0;
    state[2] = (state[2]! ^ t) >>> 0; state[3] = rotl(state[3]!, 11);
    return result;
  };
}

export function shuffledTokens(seedHex: string, studyId: string, presentation: string, questionId: string, tokens: readonly string[], acceptedDraws?: number[]): string[] {
  const draw = xoshiroDraws(optionSeedDigest(seedHex, studyId, presentation, questionId));
  const result = [...tokens];
  for (let i = result.length - 1; i >= 1; i -= 1) {
    const m = i + 1;
    const limit = Math.floor(0x1_0000_0000 / m) * m;
    let value: number;
    do { value = draw(); } while (value >= limit);
    acceptedDraws?.push(value);
    const j = value % m;
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function gate0OptionOrders(seedHex: string) {
  return VISUAL_ASSIGNMENTS.flatMap(({ studyId }) => GATE0_OPTION_SETS.map(({ questionId, options }) => ({
    studyId, presentation: "observer" as const, questionId,
    tokens: shuffledTokens(seedHex, studyId, "observer", questionId, options.map(({ token }) => token)),
  }))).sort((a, b) => Buffer.compare(Buffer.from(`${a.studyId}\0${a.presentation}\0${a.questionId}`), Buffer.from(`${b.studyId}\0${b.presentation}\0${b.questionId}`)));
}

export function deriveProductTimeline(t0: number, confirmationAt: number | null) {
  if (!Number.isFinite(t0) || confirmationAt !== null && (!Number.isFinite(confirmationAt) || confirmationAt < t0)) throw new Error("invalid monotonic time");
  const raw = confirmationAt === null ? 90_000 : confirmationAt - t0;
  const decisionElapsedMs = Math.ceil(Math.max(0, Math.min(raw, 90_000)));
  const timedOut = confirmationAt === null || raw >= 90_000;
  const decisionAt = timedOut ? t0 + 90_000 : confirmationAt!;
  return { timedOut, decisionElapsedMs, decisionAt, immediateLockAt: decisionAt + 45_000, consequenceFrom: decisionAt + 45_000, consequenceThrough: decisionAt + 60_000, replayFrom: decisionAt + 60_000, replayLockAt: decisionAt + 75_000, resetThrough: decisionAt + 135_000, slotEndsAt: t0 + 225_000 };
}

export function validConsequenceDelivery(decisionAt: number, deliveryAt: number): boolean { const elapsed = deliveryAt - decisionAt; return elapsed >= 45_000 && elapsed <= 46_000; }
export function persistedElapsed(rawElapsedMs: number): number { return Math.ceil(Math.max(0, rawElapsedMs)); }
