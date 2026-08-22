import type { AnimationClass } from "./types";

export interface HumanoidPose {
	readonly leftArmDegrees: number;
	readonly rightArmDegrees: number;
	readonly leftLegDegrees: number;
	readonly rightLegDegrees: number;
}

export const requiredAnimationClasses = Object.freeze([
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
] as const satisfies readonly AnimationClass[]);

export function humanoidPose(
	animationClass: AnimationClass,
	tick: number,
): HumanoidPose {
	if (!Number.isSafeInteger(tick) || tick < 0)
		throw new RangeError("animation tick must be a non-negative safe integer");
	const phase = tick * 0.24;
	const swing = Math.sin(phase) * 30;
	let leftArmDegrees = 0;
	let rightArmDegrees = 0;
	let leftLegDegrees = 0;
	let rightLegDegrees = 0;
	switch (animationClass) {
		case "walk":
			leftArmDegrees = swing;
			rightArmDegrees = -swing;
			leftLegDegrees = -swing;
			rightLegDegrees = swing;
			break;
		case "carry":
			leftArmDegrees = -58;
			rightArmDegrees = -58;
			leftLegDegrees = -swing * 0.72;
			rightLegDegrees = swing * 0.72;
			break;
		case "gather":
			leftArmDegrees = -35 + Math.sin(phase * 0.7) * 32;
			rightArmDegrees = -72 - Math.sin(phase * 0.7) * 35;
			break;
		case "inspect":
			leftArmDegrees = -42;
			rightArmDegrees = -20 + Math.sin(phase * 0.4) * 8;
			break;
		case "talk":
			leftArmDegrees = -15 + Math.sin(phase * 0.55) * 25;
			rightArmDegrees = -30 - Math.sin(phase * 0.42) * 20;
			break;
		case "listen":
			leftArmDegrees = -12;
			rightArmDegrees = -8;
			break;
		case "exchange":
			leftArmDegrees = -68;
			rightArmDegrees = -68;
			break;
		case "repair":
			leftArmDegrees = -30;
			rightArmDegrees = -75 + Math.sin(phase * 0.85) * 52;
			break;
		case "eat-rest":
			leftArmDegrees = -75;
			rightArmDegrees = -60;
			leftLegDegrees = 65;
			rightLegDegrees = 65;
			break;
		case "react":
			leftArmDegrees = -110 + Math.sin(phase) * 18;
			rightArmDegrees = -110 - Math.sin(phase) * 18;
			break;
		case "idle":
			leftArmDegrees = Math.sin(phase * 0.2) * 4;
			rightArmDegrees = -leftArmDegrees;
			break;
	}
	return Object.freeze({
		leftArmDegrees,
		rightArmDegrees,
		leftLegDegrees,
		rightLegDegrees,
	});
}
