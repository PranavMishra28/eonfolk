import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import {
	advanceGeneratedCameraIntent,
	assertGeneratedAssetBudget,
	cameraIntentForGeneratedNavigation,
	GENERATED_FOLK_BINARY_ASSET,
	generatedCameraFidelity,
	generatedNavigationReferencesExist,
	INITIAL_GENERATED_NAVIGATION,
	parseGeneratedNavigationAction,
	planGeneratedActorTransition,
	poseAtGeneratedPresentationTick,
	poseForGeneratedActor,
	projectGeneratedEmbodiment,
	projectGeneratedWorldEmbodiment,
	reduceGeneratedNavigation,
	sampleGeneratedActorTransition,
	verifyGeneratedFolkAsset,
} from "../../../apps/web/src/generated-presentation/index.js";
import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import {
	type GeneratedCivilizationSpatialProjection,
	type GeneratedSpatialActivityInput,
	projectGeneratedCivilizationSpatial,
	type SpatialActorProjection,
} from "../../../packages/world-presentation/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

const SEED = "8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f";

async function fixture() {
	const world = await generateWorld({
		releaseGenesis: await createReleaseGenesis({
			releaseId: "generated-embodiment-unit",
			seedHex: SEED,
		}),
	});
	const run = await runCivilizationExperiment({ world, horizonDays: 30 });
	const settlementId = run.seedConditions.originSettlementId;
	const activities = run.activities.filter((activity) => {
		const citizen = run.state.citizens[activity.citizenId];
		return citizen?.settlementId === settlementId;
	});
	const projection = projectGeneratedCivilizationSpatial({
		world: run.world,
		civilization: run.state,
		checkpoint: run,
		settlementId,
		activities,
		presentationTick: run.metrics.simulationTime * 30,
	});
	const allProjections = Object.values(run.world.settlements)
		.map(({ value }) => value.settlementId)
		.sort()
		.map((candidateSettlementId) =>
			projectGeneratedCivilizationSpatial({
				world: run.world,
				civilization: run.state,
				checkpoint: run,
				settlementId: candidateSettlementId,
				activities: run.activities,
				presentationTick: run.metrics.simulationTime * 30,
			}),
		);
	return {
		projection,
		activities,
		allProjections,
		allActivities: run.activities,
		population: run.metrics.residentPopulation,
	};
}

function routeVariant(input: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly activities: readonly GeneratedSpatialActivityInput[];
	readonly progressBasisPoints: number;
}) {
	const route = input.projection.local.routes[0];
	const actor = input.projection.spatial.actors[0];
	if (route === undefined || actor === undefined)
		throw new Error("fixture lacks a route or actor");
	const waypointIndex =
		input.progressBasisPoints < 5_000 ? 0 : route.waypoints.length - 1;
	const waypoint = route.waypoints[waypointIndex];
	if (waypoint === undefined) throw new Error("fixture route lacks a waypoint");
	const action = {
		...actor.action,
		actionId: `route-action-${input.progressBasisPoints}`,
		kind: "walk" as const,
		originPlaceId: route.fromSiteId,
		destinationPlaceId: route.toSiteId,
		affordanceId: null,
		affordanceSlotIndex: null,
	};
	const routeActor: SpatialActorProjection = {
		...actor,
		placeId: route.fromSiteId,
		positionMm: {
			x: waypoint.xMillimeters,
			y: waypoint.elevationMillimeters,
			z: waypoint.yMillimeters,
		},
		routeNodeIds: route.waypoints.map(
			(_, index) => `${route.routeId}:waypoint:${index}`,
		),
		animationClass: "walk",
		travelState: {
			status: "travelling",
			originPlaceId: route.fromSiteId,
			destinationPlaceId: route.toSiteId,
			routeId: route.routeId,
			targetId: null,
		},
		action,
	};
	const routeActivity: GeneratedSpatialActivityInput = {
		schemaVersion: "eonfolk-generated-spatial-activity-v1",
		citizenId: actor.citizenId,
		canonicalAction: action,
		location: {
			kind: "route",
			routeId: route.routeId,
			progressBasisPoints: input.progressBasisPoints,
		},
		projectId: null,
		carriedProp: null,
		focal: actor.focal,
	};
	return {
		projection: {
			...input.projection,
			spatial: {
				...input.projection.spatial,
				actors: [routeActor, ...input.projection.spatial.actors.slice(1)],
			},
		},
		activities: [
			routeActivity,
			...input.activities.filter(
				(activity) => activity.citizenId !== actor.citizenId,
			),
		],
	};
}

describe("generated embodiment projection", () => {
	it("keeps every visible citizen on its authoritative route sample or interaction slot", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});

		expect(model.actors).toHaveLength(projection.spatial.actors.length);
		expect(model.actors.length).toBeGreaterThanOrEqual(3);
		expect(model.actors.some((actor) => actor.grounding.kind === "route")).toBe(
			true,
		);
		expect(model.growth.visibleChangeCount).toBe(0);
		expect(model.projects.every((project) => !project.changed)).toBe(true);
		for (const actor of model.actors) {
			const authoritative = projection.spatial.actors.find(
				(candidate) => candidate.citizenId === actor.citizenId,
			);
			expect(authoritative).toBeDefined();
			if (actor.grounding.kind === "route") {
				expect(actor.grounding.routeId).toBe(
					authoritative?.travelState.routeId,
				);
				expect(actor.grounding.progressBasisPoints).toBe(
					authoritative?.travelState.progressBasisPoints,
				);
				expect(actor.positionMm).toEqual(authoritative?.positionMm);
				continue;
			}
			const nodeId = actor.grounding.interactionSlotId;
			if (nodeId === null) throw new Error("expected interaction slot");
			const node = projection.scene.nodes[nodeId];
			expect(node).toBeDefined();
			expect(actor.positionMm).toEqual({
				x: node?.x,
				y: node?.y,
				z: node?.z,
			});
		}
	});

	it("accounts for all eight canonical residents across the generated world", async () => {
		const { allProjections, allActivities, population } = await fixture();
		const world = projectGeneratedWorldEmbodiment({
			current: allProjections,
			activities: allActivities,
		});

		expect(population).toBe(8);
		expect(world.visibleCitizenCount).toBe(population);
		expect(world.actors).toHaveLength(8);
		expect(new Set(world.actors.map((actor) => actor.citizenId)).size).toBe(8);
		expect(new Set(world.actors.map((actor) => actor.settlementId)).size).toBe(
			2,
		);
	});

	it("exposes full grounded route topology while reporting the upstream connector gap", async () => {
		const base = await fixture();
		const routed = routeVariant({
			...base,
			progressBasisPoints: 0,
		});
		const model = projectGeneratedEmbodiment({
			current: routed.projection,
			activities: routed.activities,
		});
		const actor = model.actors[0];
		if (actor === undefined) throw new Error("fixture lacks actor");

		expect(actor.grounding.kind).toBe("route");
		expect(actor.grounding.routeTopologyNodeIds.length).toBeGreaterThan(
			actor.grounding.authoritativeNodeIds.length,
		);
		expect(actor.grounding.provesEntranceToEntranceTraversal).toBe(false);
		expect(model.limitations).toEqual([
			expect.stringContaining("not expose entrance-connector progress"),
		]);
	});

	it("allows only monotonic same-route interpolation and samples it deterministically", async () => {
		const base = await fixture();
		const from = routeVariant({ ...base, progressBasisPoints: 0 });
		const to = routeVariant({ ...base, progressBasisPoints: 10_000 });
		const fromActor = projectGeneratedEmbodiment({
			current: from.projection,
			activities: from.activities,
		}).actors[0];
		const toActor = projectGeneratedEmbodiment({
			current: to.projection,
			activities: to.activities,
		}).actors[0];
		if (fromActor === undefined || toActor === undefined)
			throw new Error("fixture lacks transition actors");

		const transition = planGeneratedActorTransition(fromActor, toActor);
		expect(transition.kind).toBe("grounded-route");
		expect(sampleGeneratedActorTransition(transition, 0)).toEqual(
			fromActor.positionMm,
		);
		expect(sampleGeneratedActorTransition(transition, 10_000)).toEqual(
			toActor.positionMm,
		);
		expect(() => planGeneratedActorTransition(toActor, fromActor)).toThrow(
			/refusing teleport/u,
		);
	});

	it("maps every canonical animation class into visibly distinct pose families", () => {
		const classes = [
			"idle",
			"walk",
			"carry",
			"gather",
			"inspect",
			"talk",
			"listen",
			"exchange",
			"repair",
			"eat-rest",
			"react",
		] as const;
		const families = new Set(
			classes.map(
				(animationClass) =>
					poseForGeneratedActor({
						animationClass,
						positionMm: { x: 0, y: 0, z: 0 },
					}).family,
			),
		);
		expect(families).toEqual(
			new Set(["locomotion", "carry", "work", "social", "life", "reaction"]),
		);
	});

	it("uses an explicit deterministic pose clock without moving canonical positions", () => {
		const positionMm = Object.freeze({ x: 1_200, y: 0, z: -900 });
		const base = poseForGeneratedActor({
			animationClass: "walk",
			positionMm,
		});
		const tickZero = poseAtGeneratedPresentationTick(base, 0, 12, false);
		const tickOne = poseAtGeneratedPresentationTick(base, 8, 12, false);

		expect(tickZero).not.toEqual(tickOne);
		expect(poseAtGeneratedPresentationTick(base, 8, 12, false)).toEqual(
			tickOne,
		);
		expect(poseAtGeneratedPresentationTick(base, 8, 12, true)).toBe(base);
		expect(positionMm).toEqual({ x: 1_200, y: 0, z: -900 });
	});

	it("drives project stage and growth markers from projection deltas", async () => {
		const { projection, activities } = await fixture();
		const currentProject = projection.projects[0];
		if (currentProject === undefined) throw new Error("fixture lacks project");
		const previous: GeneratedCivilizationSpatialProjection = {
			...projection,
			projects: projection.projects.map((project, index) =>
				index === 0
					? {
							...project,
							state: "resourcing",
							progressBasisPoints: Math.max(
								0,
								project.progressBasisPoints - 2_500,
							),
						}
					: project,
			),
			local: {
				...projection.local,
				buildings: projection.local.buildings.slice(1),
			},
		};
		const model = projectGeneratedEmbodiment({
			current: projection,
			previous,
			activities,
		});

		expect(model.projects[0]?.changed).toBe(true);
		expect(model.projects[0]?.progressDeltaBasisPoints).toBeGreaterThanOrEqual(
			0,
		);
		expect(model.growth.addedBuildingIds).toHaveLength(1);
		expect(model.growth.visibleChangeCount).toBeGreaterThan(0);
	});
});

describe("generated navigation parity", () => {
	it("uses one state for semantic selection, zoom and follow", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const actor = model.actors[0];
		if (actor === undefined) throw new Error("fixture lacks actor");
		const selected = reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
			type: "select-citizen",
			citizenId: actor.citizenId,
		});
		const following = reduceGeneratedNavigation(selected, {
			type: "toggle-follow",
		});
		const intent = cameraIntentForGeneratedNavigation(
			projection,
			model,
			following,
		);

		expect(intent.targetMm).toEqual(actor.positionMm);
		expect(intent.followCitizenId).toBe(actor.citizenId);
		expect(intent.semanticLabel).toContain("Following");
	});

	it("derives four fidelity classes across region, town and citizen scales", () => {
		expect(generatedCameraFidelity(8_000)).toEqual({
			semanticScale: "citizen",
			fidelityClass: "LOD0",
		});
		expect(generatedCameraFidelity(24_000)).toEqual({
			semanticScale: "citizen",
			fidelityClass: "LOD1",
		});
		expect(generatedCameraFidelity(72_000)).toEqual({
			semanticScale: "town",
			fidelityClass: "LOD2",
		});
		expect(generatedCameraFidelity(140_000)).toEqual({
			semanticScale: "region",
			fidelityClass: "LOD3",
		});
	});

	it("shares bounded pan/orbit state without changing a projected actor", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const before = structuredClone(model);
		const panned = reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
			type: "pan",
			xDeltaMm: 8_000,
			zDeltaMm: -4_000,
		});
		const orbited = reduceGeneratedNavigation(panned, {
			type: "orbit",
			yawDeltaDegrees: 20,
			pitchDeltaDegrees: -8,
		});
		const intent = cameraIntentForGeneratedNavigation(
			projection,
			model,
			orbited,
		);

		expect(orbited.panOffsetMm).toEqual({ x: 8_000, z: -4_000 });
		expect(intent.yawDegrees).toBe(62);
		expect(model).toEqual(before);
	});

	it("advances camera presentation deterministically and honors reduced motion", () => {
		const current = Object.freeze({
			targetMm: Object.freeze({ x: 0, y: 0, z: 0 }),
			distanceMm: 72_000,
			yawDegrees: 350,
			pitchDegrees: -38,
			followCitizenId: null,
			semanticLabel: "current",
		});
		const desired = Object.freeze({
			...current,
			targetMm: Object.freeze({ x: 10_000, y: 0, z: -5_000 }),
			distanceMm: 24_000,
			yawDegrees: 10,
			semanticLabel: "desired",
		});
		const first = advanceGeneratedCameraIntent(current, desired, false);

		expect(first).toEqual(
			advanceGeneratedCameraIntent(current, desired, false),
		);
		expect(first.targetMm).toEqual({ x: 2_600, y: 0, z: -1_300 });
		expect(first.distanceMm).toBe(59_520);
		expect(first.yawDegrees).toBeCloseTo(355.2);
		expect(advanceGeneratedCameraIntent(current, desired, true)).toBe(desired);
	});

	it("fails closed on malformed DOM actions and corrupt navigation state", () => {
		expect(
			parseGeneratedNavigationAction({
				type: "select-building",
				buildingId: "building-authoritative",
			}),
		).toEqual({
			type: "select-building",
			buildingId: "building-authoritative",
		});
		expect(
			parseGeneratedNavigationAction({ type: "zoom", deltaMm: Number.NaN }),
		).toBeNull();
		expect(
			parseGeneratedNavigationAction({
				type: "select-building",
				buildingId: "building-authoritative",
				stateHash: "forged-authority",
			}),
		).toBeNull();
		expect(
			parseGeneratedNavigationAction({
				type: "select-citizen",
				citizenId: "citizen_mara",
				stateHash: "forged-authority",
			}),
		).toBeNull();
		expect(
			parseGeneratedNavigationAction({ type: "invent-reality" }),
		).toBeNull();
		expect(() =>
			reduceGeneratedNavigation(
				{
					...INITIAL_GENERATED_NAVIGATION,
					distanceMm: Number.NaN,
				},
				{ type: "overview" },
			),
		).toThrow(/must be finite/u);
	});

	it("admits only authoritative citizen, building, and project identities", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		expect(
			generatedNavigationReferencesExist(
				{ type: "select-citizen", citizenId: "foreign-citizen" },
				model,
				projection,
			),
		).toBe(false);
		expect(
			generatedNavigationReferencesExist(
				{ type: "select-project", projectId: "foreign-project" },
				model,
				projection,
			),
		).toBe(false);
		expect(
			generatedNavigationReferencesExist(
				{ type: "select-building", buildingId: "foreign-building" },
				model,
				projection,
			),
		).toBe(false);
		expect(
			generatedNavigationReferencesExist(
				{ type: "select-citizen", citizenId: model.actors[0]?.citizenId ?? "" },
				model,
				projection,
			),
		).toBe(true);
		expect(
			generatedNavigationReferencesExist(
				{
					type: "select-building",
					buildingId: projection.local.buildings[0]?.buildingId ?? "",
				},
				model,
				projection,
			),
		).toBe(true);
	});

	it("targets authoritative building positions and project sites", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const building = projection.local.buildings[0];
		const project = model.projects[0];
		if (building === undefined || project === undefined)
			throw new Error("fixture lacks contextual objects");
		const buildingIntent = cameraIntentForGeneratedNavigation(
			projection,
			model,
			reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
				type: "select-building",
				buildingId: building.buildingId,
			}),
		);
		expect(buildingIntent.targetMm).toEqual({
			x: building.position.xMillimeters,
			y: building.position.elevationMillimeters,
			z: building.position.yMillimeters,
		});
		expect(buildingIntent.distanceMm).toBe(24_000);
		const site = projection.local.sites.find(
			({ siteId }) => siteId === project.siteId,
		);
		if (site === undefined) throw new Error("fixture project site missing");
		const projectIntent = cameraIntentForGeneratedNavigation(
			projection,
			model,
			reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
				type: "select-project",
				projectId: project.projectId,
			}),
		);
		expect(projectIntent.targetMm).toEqual({
			x: Math.round(
				(site.bounds.minimum.xMillimeters + site.bounds.maximum.xMillimeters) /
					2,
			),
			y: site.bounds.minimum.elevationMillimeters,
			z: Math.round(
				(site.bounds.minimum.yMillimeters + site.bounds.maximum.yMillimeters) /
					2,
			),
		});
	});
});

describe("generated asset provenance", () => {
	it("tracks an embedded, external-request-free glTF well under the mobile budget", async () => {
		const bytes = await readFile(
			new URL(
				"../../../apps/web/public/assets/generated/eonfolk-folk-proxy.gltf",
				import.meta.url,
			),
		);
		const gltf = JSON.parse(bytes.toString("utf8")) as {
			readonly buffers: readonly Readonly<{ readonly uri: string }>[];
		};
		expect(bytes.byteLength).toBe(3_929);
		expect(createHash("sha256").update(bytes).digest("hex")).toBe(
			"a639294bb1ae71731265f510089d72bef0677ed5de64c98c70724ad5fce64179",
		);
		expect(gltf.buffers.every((buffer) => buffer.uri.startsWith("data:"))).toBe(
			true,
		);
		expect(
			(gltf as { extras: { eonfolk: { thirdPartyMaterial: boolean } } }).extras
				.eonfolk.thirdPartyMaterial,
		).toBe(false);
		expect(() =>
			assertGeneratedAssetBudget({ byteLength: bytes.byteLength }),
		).not.toThrow();
	});

	it("admits only the exact manifest-bound bytes", async () => {
		const [manifestBytes, assetBytes] = await Promise.all([
			readFile(
				new URL(
					"../../../apps/web/public/assets/generated/ASSET_MANIFEST.json",
					import.meta.url,
				),
			),
			readFile(
				new URL(
					"../../../apps/web/public/assets/generated/eonfolk-folk-proxy.glb",
					import.meta.url,
				),
			),
		]);
		const requests: string[] = [];
		const requestOptions: RequestInit[] = [];
		const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			requests.push(url);
			requestOptions.push(init ?? {});
			return url.endsWith("ASSET_MANIFEST.json")
				? new Response(manifestBytes, { status: 200 })
				: new Response(assetBytes, { status: 200 });
		};

		const integrity = await verifyGeneratedFolkAsset(fetcher as typeof fetch);
		expect(requests).toEqual([
			"/assets/generated/ASSET_MANIFEST.json",
			"/assets/generated/eonfolk-folk-proxy.glb",
		]);
		expect(requestOptions).toEqual([
			{ cache: "no-store", credentials: "same-origin", redirect: "error" },
			{ cache: "no-store", credentials: "same-origin", redirect: "error" },
		]);
		expect(integrity).toMatchObject({
			status: "verified",
			assetId: GENERATED_FOLK_BINARY_ASSET.assetId,
			byteLength: GENERATED_FOLK_BINARY_ASSET.byteLength,
			sha256: GENERATED_FOLK_BINARY_ASSET.sha256,
			manifestSha256:
				"69519819b59ddf72b8786a412e08145c3c235aaf6fe9ca932540821a20558392",
			rendererIntegration: "procedural-reference-only",
		});

		await expect(
			verifyGeneratedFolkAsset((async (input: RequestInfo | URL) => {
				const url = String(input);
				return url.endsWith("ASSET_MANIFEST.json")
					? new Response(manifestBytes, { status: 200 })
					: new Response(new Uint8Array(assetBytes.length), { status: 200 });
			}) as typeof fetch),
		).rejects.toThrow(/byte length|digest/u);

		const manifest = JSON.parse(manifestBytes.toString("utf8"));
		manifest.pipeline.determinism = "trust these unverified words";
		await expect(
			verifyGeneratedFolkAsset((async (input: RequestInfo | URL) => {
				const url = String(input);
				return url.endsWith("ASSET_MANIFEST.json")
					? new Response(JSON.stringify(manifest), { status: 200 })
					: new Response(assetBytes, { status: 200 });
			}) as typeof fetch),
		).rejects.toThrow(/manifest byte length|manifest digest/u);

		const sameLengthManifestCorruption = Buffer.from(manifestBytes);
		sameLengthManifestCorruption[0] ^= 1;
		await expect(
			verifyGeneratedFolkAsset((async (input: RequestInfo | URL) => {
				const url = String(input);
				return url.endsWith("ASSET_MANIFEST.json")
					? new Response(sameLengthManifestCorruption, { status: 200 })
					: new Response(assetBytes, { status: 200 });
			}) as typeof fetch),
		).rejects.toThrow(/manifest digest/u);
	});
});
