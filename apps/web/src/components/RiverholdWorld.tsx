import "pixi.js/unsafe-eval";
import { Application, Container, Graphics, Text } from "pixi.js";
import { useEffect, useRef } from "react";
import type { ActivityKind, RiverholdProjection } from "../projection";

const ink = 0x20231e;
const paper = 0xe6d7b5;
const ochre = 0xb36832;
const river = 0x5b8690;
const moss = 0x7f8752;
const gold = 0xd6a84b;
const rust = 0x934b35;

function propFor(kind: ActivityKind) {
	const prop = new Graphics();
	switch (kind) {
		case "water":
			return prop
				.roundRect(-6, -7, 12, 14, 3)
				.fill(river)
				.stroke({ color: ink, width: 1.5 });
		case "wood":
			prop.moveTo(-9, -5).lineTo(9, 4).stroke({ color: 0x73472c, width: 4 });
			return prop
				.moveTo(-8, 4)
				.lineTo(8, -4)
				.stroke({ color: 0x73472c, width: 4 });
		case "food":
			return prop.circle(0, 0, 7).fill(gold).stroke({ color: ink, width: 1.5 });
		case "trade":
			prop.circle(-4, 0, 5).fill(gold);
			return prop
				.rect(2, -5, 12, 10)
				.fill(0x70442a)
				.stroke({ color: ink, width: 1.5 });
		case "mill":
			return prop.circle(0, 0, 9).stroke({ color: 0x70442a, width: 4 });
		case "council":
			return prop
				.moveTo(-8, 6)
				.lineTo(0, -8)
				.lineTo(8, 6)
				.closePath()
				.fill(rust)
				.stroke({ color: ink, width: 1.5 });
		case "investigate":
			return prop
				.circle(-2, -2, 7)
				.stroke({ color: river, width: 3 })
				.moveTo(4, 4)
				.lineTo(10, 10)
				.stroke({ color: river, width: 3 });
	}
}

function hatch(graphics: Graphics, width: number, height: number) {
	for (let x = -height; x < width; x += 28) {
		graphics
			.moveTo(x, 0)
			.lineTo(x + height, height)
			.stroke({ color: 0x392f24, alpha: 0.08, width: 1 });
	}
}

export function RiverholdWorld({
	projection,
	reducedMotion,
	onFailure,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly onFailure: () => void;
}) {
	const host = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!host.current) return;
		let destroyed = false;
		let initialized = false;
		let app: Application | null = new Application();
		const container = host.current;
		const render = async () => {
			if (sessionStorage.getItem("eonfolk:e2e-renderer-failure") === "1")
				throw new Error("Injected renderer initialization failure");
			await app?.init({
				antialias: true,
				autoDensity: true,
				backgroundAlpha: 0,
				resizeTo: container,
				resolution: Math.min(window.devicePixelRatio, 1.5),
				preference: "webgl",
			});
			initialized = true;
			if (!app) return;
			if (destroyed) {
				app.destroy(true);
				app = null;
				return;
			}
			container.replaceChildren(app.canvas);
			const { width, height } = app.screen;
			const mobile = width < 560;
			const world = new Graphics()
				.roundRect(0, 0, width, height, mobile ? 0 : 22)
				.fill(paper);
			world.rect(0, height * 0.68, width, height * 0.32).fill(moss);
			world
				.moveTo(-30, height * 0.28)
				.bezierCurveTo(
					width * 0.25,
					height * 0.48,
					width * 0.68,
					height * 0.34,
					width + 40,
					height * 0.56,
				)
				.stroke({ color: river, width: Math.max(36, height * 0.09) });
			hatch(world, width, height);
			app.stage.addChild(world);

			const landmarkLayer = new Container();
			const labelStyle = {
				fill: "#24241f",
				fontFamily: "Georgia",
				fontSize: mobile ? 14 : 16,
				fontWeight: "bold" as const,
			};
			const addLandmark = (
				name: string,
				x: number,
				y: number,
				shape: Graphics,
			) => {
				shape.position.set(width * x, height * y);
				landmarkLayer.addChild(shape);
				const label = new Text({ text: name, style: labelStyle });
				label.position.set(width * x - label.width / 2, height * y + 23);
				landmarkLayer.addChild(label);
			};
			addLandmark(
				"old well",
				0.24,
				0.59,
				new Graphics()
					.circle(0, 0, 15)
					.fill(0x78a4a6)
					.stroke({ color: ink, width: 3 }),
			);
			addLandmark(
				"market",
				0.59,
				0.45,
				new Graphics()
					.moveTo(-28, 16)
					.lineTo(0, -17)
					.lineTo(28, 16)
					.closePath()
					.fill(ochre)
					.stroke({ color: ink, width: 3 }),
			);
			addLandmark(
				"mill",
				0.82,
				0.68,
				new Graphics()
					.rect(-19, -18, 38, 36)
					.fill(0xc49d68)
					.stroke({ color: ink, width: 3 })
					.circle(20, 0, 18)
					.stroke({ color: ink, width: 3 }),
			);
			addLandmark(
				"woodpath",
				0.15,
				0.33,
				new Graphics()
					.moveTo(-24, 11)
					.lineTo(-4, -18)
					.lineTo(4, 2)
					.lineTo(21, -15)
					.stroke({ color: 0x4d5e38, width: 8 }),
			);
			app.stage.addChild(landmarkLayer);

			const people = new Container();
			const sprites: Container[] = [];
			for (const [index, citizen] of projection.citizens.entries()) {
				const person = new Container();
				const direction = index % 2 === 0 ? 1 : -1;
				const body = new Graphics()
					.circle(0, -8, citizen.focal ? 13 : 10)
					.fill(citizen.focal ? gold : ink)
					.stroke({
						color: citizen.focal ? 0xf3ddb0 : 0xc8af7e,
						width: citizen.focal ? 4 : 2,
					});
				body
					.moveTo(-10 - (index % 3), 2)
					.lineTo(index % 2 === 0 ? -5 : 0, 25 + (index % 3) * 2)
					.lineTo(11 + (index % 2) * 3, 5)
					.closePath()
					.fill(citizen.focal ? 0x9a562d : 0x44463d);
				// Eight deliberately different silhouettes: headwear, stance, and arm
				// angle are tied to stable citizen order rather than decorative motion.
				if (index % 4 === 0)
					body
						.rect(-15, -20, 30, 5)
						.fill(0x73472c)
						.rect(-8, -26, 16, 8)
						.fill(0x73472c);
				else if (index % 4 === 1)
					body
						.moveTo(-13, -16)
						.lineTo(0, -29)
						.lineTo(13, -16)
						.closePath()
						.fill(0x667047);
				else if (index % 4 === 2)
					body.circle(0, -18, 14).stroke({ color: rust, width: 4 });
				else
					body
						.moveTo(-11, -20)
						.lineTo(11, -20)
						.lineTo(0, -30)
						.closePath()
						.fill(river);
				body
					.moveTo(direction * 2, 5)
					.lineTo(direction * 18, -1 + (index % 3) * 5)
					.stroke({ color: ink, width: 4 });
				const prop = propFor(citizen.activityKind);
				prop.position.set(direction * 22, -1 + (index % 3) * 5);
				const label = new Text({
					text: citizen.name,
					style: {
						fill: "#171914",
						fontFamily: "Georgia",
						fontSize: mobile ? 14 : 16,
						fontWeight: citizen.focal ? "bold" : "normal",
					},
				});
				label.anchor.set(0.5, 0);
				label.position.set(0, 31);
				person.addChild(body, prop, label);
				person.position.set(
					(width * citizen.x) / 100,
					(height * citizen.y) / 100,
				);
				people.addChild(person);
				sprites.push(person);
			}

			const toma = projection.citizens.find(
				(citizen) => citizen.id === "citizen:toma",
			);
			const iven = projection.citizens.find(
				(citizen) => citizen.id === "citizen:iven",
			);
			const mara = projection.citizens[0];
			if (toma && mara) {
				const edge = new Graphics();
				const color =
					projection.mara.relationshipBand === "strained" ? rust : 0x90743d;
				edge
					.moveTo((width * mara.x) / 100, (height * mara.y) / 100)
					.lineTo((width * toma.x) / 100, (height * toma.y) / 100)
					.stroke({ color, width: 2, alpha: 0.75 });
				app.stage.addChild(edge);
			}
			if (toma && iven && projection.branch === null) {
				const tx = (width * toma.x) / 100;
				const ty = (height * toma.y) / 100;
				const ix = (width * iven.x) / 100;
				const iy = (height * iven.y) / 100;
				const midpointX = (tx + ix) / 2;
				const midpointY = (ty + iy) / 2;
				const exchange = new Graphics()
					.moveTo(tx + 18, ty - 8)
					.lineTo(ix - 18, iy - 8)
					.stroke({ color: ochre, width: 5 })
					.rect(midpointX - 10, midpointY - 18, 20, 16)
					.fill(0x70442a)
					.stroke({ color: ink, width: 2 });
				const exchangeLabel = new Text({
					text: "Toma ↔ Iven · wood for rations",
					style: {
						fill: "#171914",
						fontFamily: "Georgia",
						fontSize: mobile ? 14 : 16,
						fontWeight: "bold",
					},
				});
				exchangeLabel.anchor.set(0.5, 1);
				exchangeLabel.position.set(midpointX, midpointY - 23);
				app.stage.addChild(exchange, exchangeLabel);
			}
			app.stage.addChild(people);

			// The first slice renders on authoritative projection changes instead of
			// running a decorative frame loop. This keeps the world legible while
			// protecting the solo-builder desktop/mobile frame budget.
			void reducedMotion;
			void sprites;
			app.ticker.stop();
			app.renderer.render(app.stage);
			container.dataset.ready = "true";
		};
		void render().catch(() => {
			if (!destroyed) onFailure();
		});
		return () => {
			destroyed = true;
			if (initialized) app?.destroy(true);
			app = null;
		};
	}, [onFailure, projection, reducedMotion]);

	return (
		<div
			ref={host}
			className="world-canvas"
			aria-hidden="true"
			data-testid="riverhold-canvas"
		/>
	);
}
