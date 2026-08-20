import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
	ACTIVITY_FAMILIES,
	ANSWER_KEY,
	activateSemanticAction,
	CITIZENS,
	canonicalReadyFacts,
	createObservableOracleInputs,
	createObserverClock,
	createPixiCommands,
	createProjection,
	createSemanticTree,
	FIXTURE,
	isObserverEndpointDurable,
	isObserverReady,
	processObserverFrame,
	recordFollowMara,
	SEMANTIC_ACTIONS,
	VIEWPORTS,
} from "./index.mjs";

test("fixed gate0-visual-v1 fixture is deterministic and answer keys are exact", () => {
	assert.equal(FIXTURE.fixtureId, "gate0-visual-v1");
	assert.equal(FIXTURE.rendererMode, "pixi-semantic");
	assert.equal(CITIZENS.length, 8);
	assert.equal(ACTIVITY_FAMILIES.length, 3);
	assert.deepEqual(ANSWER_KEY, {
		mara: "citizen:mara",
		activities:
			"activity:carry-water,activity:exchange-rations,activity:gather-wood",
		interaction: "interaction:iven,toma|exchange-settled",
		autonomy: "cannot-command|standing-plan",
	});
	assert.deepEqual(FIXTURE.authoritativeInteraction.actorIds, [
		"citizen:iven",
		"citizen:toma",
	]);
	assert.deepEqual(FIXTURE.relationshipCue.actorIds, [
		"citizen:mara",
		"citizen:toma",
	]);
	assert.equal(FIXTURE.relationshipCue.authoritative, false);
	assert.equal(FIXTURE.chronicleBeat.evidenceToken, ANSWER_KEY.interaction);
});

test("Riverhold dominates all three required viewports and projection remains reproducible", () => {
	for (const viewport of Object.values(VIEWPORTS)) {
		const first = createProjection(viewport);
		const second = createProjection(viewport);
		assert.deepEqual(first, second);
		assert.equal(first.settlement.dominates, true);
		assert.equal(first.peek.citizenId, "citizen:mara");
		assert.equal(first.chronicleBeat.id, "chronicle:exchange-settled");
		assert.ok(first.layout.worldHeightPercent >= 55);
		assert.equal(
			createPixiCommands(first).filter(({ kind }) => kind === "citizen-sprite")
				.length,
			8,
		);
	}
	assert.equal(createProjection(VIEWPORTS.mobile).layout.peekHeightPercent, 33);
});

test("weak devices keep the same facts through semantic markers and discrete motion", () => {
	const projection = createProjection({
		...VIEWPORTS.mobile,
		weakDevice: true,
	});
	assert.equal(projection.quality, "semantic-markers");
	assert.equal(projection.motion, "discrete");
	assert.equal(
		createPixiCommands(projection).filter(({ kind }) => kind === "marker")
			.length,
		8,
	);
	assert.deepEqual(
		projection.citizens.map(({ id, activityId }) => [id, activityId]),
		CITIZENS.map(({ id, activityId }) => [id, activityId]),
	);
});

test("semantic actions expose stable roles, names, order, and keyboard activation", () => {
	const tree = createSemanticTree();
	assert.deepEqual(
		tree.map(({ order }) => order),
		[...tree.keys()].map((index) => index + 1),
	);
	assert.equal(tree[0].name, "Riverhold world");
	assert.equal(tree[1].name, "Mara");
	assert.match(tree[1].text, /She acts for herself/);
	assert.match(tree[1].text, /Standing Plan/);
	assert.deepEqual(
		SEMANTIC_ACTIONS.map(({ role, name }) => [role, name]),
		[
			["button", "Follow Mara"],
			["button", "People"],
		],
	);
	assert.equal(
		activateSemanticAction("follow-mara", "Enter").selectedCitizenId,
		"citizen:mara",
	);
	assert.equal(activateSemanticAction("follow-mara", " ").activated, true);
	assert.equal(
		activateSemanticAction("follow-mara", "ArrowRight").activated,
		false,
	);
});

test("ready predicate starts only after Pixi and equivalent semantic facts are complete", () => {
	const projection = createProjection(VIEWPORTS.laptop);
	const facts = canonicalReadyFacts(projection);
	assert.equal(isObserverReady(facts), true);
	assert.equal(
		isObserverReady({
			...facts,
			paintedCitizenIds: facts.paintedCitizenIds.slice(1),
		}),
		false,
	);
	assert.equal(
		isObserverReady({
			...facts,
			semanticRowCitizenIds: facts.semanticRowCitizenIds.slice(1),
		}),
		false,
	);
	assert.equal(
		isObserverReady({
			...facts,
			followMara: { ...facts.followMara, focusable: false },
		}),
		false,
	);
});

test("follow Mara accepts the 10,000ms boundary and persists ceil once", () => {
	const facts = canonicalReadyFacts(createProjection(VIEWPORTS.desktop));
	const started = processObserverFrame(createObserverClock(), 1_000.25, facts);
	const followed = recordFollowMara(started, 11_000.25);
	assert.equal(followed.followMaraFindMs, 10_000);
	assert.equal(followed.followMaraWithinTarget, true);
	assert.equal(recordFollowMara(followed, 20_000).followMaraFindMs, 10_000);
	const late = recordFollowMara(started, 11_000.251);
	assert.equal(late.followMaraWithinTarget, false);
	assert.equal(late.followMaraFindMs, null);
	assert.equal(late.followMaraLocked, true);
});

test("observer prompt occurs on first delivered frame from 60,000 through 61,000ms", () => {
	const facts = canonicalReadyFacts(createProjection(VIEWPORTS.desktop));
	const started = processObserverFrame(createObserverClock(), 50.5, facts);
	assert.equal(
		processObserverFrame(started, 60_050.499, facts).promptDue,
		false,
	);
	const atThreshold = processObserverFrame(started, 60_050.5, facts);
	assert.equal(atThreshold.promptDue, true);
	assert.equal(atThreshold.observationPromptMs, 60_000);
	const atCeil = processObserverFrame(started, 61_050.499, facts);
	assert.equal(atCeil.observationPromptMs, 61_000);
	const overrun = processObserverFrame(started, 61_050.501, facts);
	assert.equal(overrun.invalidationReason, "timer-delivery-overrun");
});

test("observer endpoint requires both timers, four opaque responses, and durable persistence", () => {
	const record = {
		followMaraFindMs: 8_000,
		observationPromptMs: 60_001,
		responses: { ...ANSWER_KEY },
		durablyPersisted: true,
	};
	assert.equal(isObserverEndpointDurable(record), true);
	assert.equal(
		isObserverEndpointDurable({ ...record, durablyPersisted: false }),
		false,
	);
	assert.equal(
		isObserverEndpointDurable({
			...record,
			responses: { ...record.responses, autonomy: null },
		}),
		false,
	);
	assert.equal(
		isObserverEndpointDurable({ ...record, observationPromptMs: 61_001 }),
		false,
	);
});

test("observable-oracle inputs close route, semantic tree, response surface, timeline, and ready predicate", () => {
	const first = createObservableOracleInputs();
	const second = createObservableOracleInputs();
	assert.deepEqual(first, second);
	assert.equal(first.rendererMode, "pixi-semantic");
	assert.deepEqual(first.routeParams, { fixtureId: "gate0-visual-v1" });
	assert.deepEqual(first.viewportIds, [
		"desktop-1728x1117",
		"laptop-1366x768",
		"mobile-390x844",
	]);
	assert.deepEqual(
		first.responseSurface.map(({ answerToken }) => answerToken),
		Object.values(ANSWER_KEY),
	);
	assert.equal(first.logicalTimeline[2].atMs, 60_000);
	assert.equal(first.logicalTimeline[2].deliveryLatestMs, 61_000);
	assert.equal(first.readyPredicate.timersStartTogether.length, 2);
});

test("responsive CSS names all required layouts, reduced motion, focus, targets, and semantic fallback", async () => {
	const css = await readFile(
		new URL("./gate0-visual.css", import.meta.url),
		"utf8",
	);
	assert.match(css, /max-width: 1499px/);
	assert.match(css, /max-width: 480px/);
	assert.match(css, /min-height: 44px/);
	assert.match(css, /focus-visible/);
	assert.match(css, /prefers-reduced-motion: reduce/);
	assert.match(css, /semantic-markers/);
});

test("participant-visible model contains no private codename, treatment IDs, or research framing", () => {
	const visible = JSON.stringify({
		fixture: FIXTURE,
		tree: createSemanticTree(),
		pixi: createPixiCommands(createProjection(VIEWPORTS.desktop)),
	});
	assert.doesNotMatch(
		visible,
		/EONFOLK|\bFAM\b|\bTRI\b|\bFAC\b|\bECH\b|\bDIR\b|research|experiment/i,
	);
});
