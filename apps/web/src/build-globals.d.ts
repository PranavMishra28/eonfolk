declare const __EONFOLK_E2E_CRASH_HOOKS__: boolean;
declare const __EONFOLK_DIAGNOSTICS_MODE__: "off" | "local" | "alpha";

interface Window {
	readonly __EONFOLK_OBSERVER__?: () => import("@eonfolk/diagnostics").ObserverProjection;
}
