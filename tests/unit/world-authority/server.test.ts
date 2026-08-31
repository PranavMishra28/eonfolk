import { describe, expect, it } from "vitest";
import { worldAuthorityHostIsLoopback } from "../../../apps/world-authority/src/server.js";

describe("local world authority HTTP binding", () => {
	it("accepts only loopback Host headers", () => {
		expect(worldAuthorityHostIsLoopback("127.0.0.1:4175")).toBe(true);
		expect(worldAuthorityHostIsLoopback("localhost:4175")).toBe(true);
		expect(worldAuthorityHostIsLoopback("0.0.0.0:4175")).toBe(false);
		expect(worldAuthorityHostIsLoopback("example.com")).toBe(false);
		expect(worldAuthorityHostIsLoopback(undefined)).toBe(false);
	});
});
