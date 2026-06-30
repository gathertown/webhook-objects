/**
 * Parse macOS `pmset -g batt` output and decide whether the battery is "low".
 *
 * Low = on battery power AND at/below the percent threshold. Plugged in is
 * never low, however empty — you're not about to drop off a call.
 *
 * @module
 */

/** Default percent at/below which an unplugged battery counts as low. */
export const DEFAULT_THRESHOLD = 20;

export type BatteryReading = {
	/** Charge percent (0-100), or undefined if unparseable. */
	percent: number | undefined;
	/** True when drawing from AC / charging. */
	charging: boolean;
};

/** Parse the relevant bits out of `pmset -g batt` text. */
export function parseBattery(pmset: string): BatteryReading {
	const percentMatch = pmset.match(/(\d+)%/);
	const percent = percentMatch ? Number(percentMatch[1]) : undefined;
	// First line reads "Now drawing from 'AC Power'" or "'Battery Power'";
	// the per-battery line says "charging"/"charged"/"discharging".
	const charging =
		/'AC Power'/.test(pmset) ||
		/\b(charging|charged|finishing charge)\b/.test(pmset);
	return { percent, charging };
}

/** Is the machine running low on battery, per `pmset` text and threshold? */
export function isLowBattery(
	pmset: string,
	threshold = DEFAULT_THRESHOLD,
): boolean {
	const { percent, charging } = parseBattery(pmset);
	if (charging || percent === undefined) return false;
	return percent <= threshold;
}
