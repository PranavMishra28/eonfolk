import type { SpatialSceneDefinition } from "./types";

export interface PathPlanner {
	plan(input: {
		readonly fromNodeId: string;
		readonly toNodeId: string;
	}): readonly string[] | null;
}

export function createAuthoredPathPlanner(
	scene: SpatialSceneDefinition,
): PathPlanner {
	const outgoing = new Map<string, { nodeId: string; cost: number }[]>();
	for (const edge of scene.edges) {
		const entries = outgoing.get(edge.fromNodeId) ?? [];
		entries.push({ nodeId: edge.toNodeId, cost: edge.costMm });
		outgoing.set(edge.fromNodeId, entries);
	}
	for (const entries of outgoing.values())
		entries.sort((left, right) => left.nodeId.localeCompare(right.nodeId));

	return {
		plan({ fromNodeId, toNodeId }) {
			if (
				scene.nodes[fromNodeId] === undefined ||
				scene.nodes[toNodeId] === undefined
			)
				return null;
			const frontier = [{ nodeId: fromNodeId, cost: 0 }];
			const best = new Map<string, number>([[fromNodeId, 0]]);
			const previous = new Map<string, string>();
			while (frontier.length > 0) {
				frontier.sort(
					(left, right) =>
						left.cost - right.cost || left.nodeId.localeCompare(right.nodeId),
				);
				const current = frontier.shift();
				if (current === undefined) break;
				if (current.nodeId === toNodeId) {
					const route = [toNodeId];
					let cursor = toNodeId;
					while (cursor !== fromNodeId) {
						const prior = previous.get(cursor);
						if (prior === undefined) return null;
						route.push(prior);
						cursor = prior;
					}
					return Object.freeze(route.reverse());
				}
				for (const next of outgoing.get(current.nodeId) ?? []) {
					const nextCost = current.cost + next.cost;
					const known = best.get(next.nodeId);
					if (known !== undefined && known <= nextCost) continue;
					best.set(next.nodeId, nextCost);
					previous.set(next.nodeId, current.nodeId);
					frontier.push({ nodeId: next.nodeId, cost: nextCost });
				}
			}
			return null;
		},
	};
}
