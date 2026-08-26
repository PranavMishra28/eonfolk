# Local playtest kit

This kit supports a 10–20 minute **private, local** session with one invited
person. It is for the maintainer and a consented participant. It is **not**
published research, not analytics, and not evidence of attachment or adoption.

Use it to learn whether a new player can observe the settlement, understand one
citizen, counsel or abstain, and read the Chronicle without you explaining the
architecture.

## What this is not

- Not a claim that anyone enjoyed the game.
- Not retention, adoption, or product-market-fit evidence.
- Not a substitute for [synthetic product evaluation](../TESTING.md#synthetic-product-evaluation),
  which is automated and also not human evidence.
- Not a network collection system. Raw notes stay on this machine.

## Files

| File | Use |
|---|---|
| [moderator-guide.md](moderator-guide.md) | Privacy, consent, and how little to say |
| [session-script.md](session-script.md) | The four-part 10–20 minute script |
| [observation-template.md](observation-template.md) | Moderator notes during the session |
| [participant-feedback-template.md](participant-feedback-template.md) | Optional end-of-session sheet |
| [informal-feedback-template.md](informal-feedback-template.md) | Friends/coworkers outside a scripted session |
| [sponsor-loop-trace.md](sponsor-loop-trace.md) | How to inspect the canonical sponsor journey |

## Where notes live

Write raw notes under `tmp/playtesting/` (gitignored with the rest of `tmp/`).
Use participant IDs `P01`, `P02`, … Never commit names, employers, or raw
quotes to this repository unless you later choose a deliberately anonymized
summary.

Templates in this directory are empty forms. They are not filled sessions.

## Setup before a session

1. `corepack pnpm install --frozen-lockfile --ignore-scripts`
2. `corepack pnpm dev`
3. Open the printed loopback URL in a current Chromium-family browser.
4. Confirm `/` loads and `/world` shows Dawnmere without an account or model.
5. Keep this kit and a paper or local text file ready. Do not screen-share
   private notes to a third party.

Record the commit SHA (`git rev-parse HEAD`) on every session sheet.
