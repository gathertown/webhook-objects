import { expect, test } from "vitest";
import { isLowBattery, parseBattery } from "./battery";

const ON_BATTERY_LOW = `Now drawing from 'Battery Power'
 -InternalBattery-0 (id=12345)\t15%; discharging; 0:42 remaining present: true`;

const ON_BATTERY_OK = `Now drawing from 'Battery Power'
 -InternalBattery-0 (id=12345)\t80%; discharging; 4:10 remaining present: true`;

const PLUGGED_IN_LOW = `Now drawing from 'AC Power'
 -InternalBattery-0 (id=12345)\t12%; charging; 1:05 remaining present: true`;

const CHARGED = `Now drawing from 'AC Power'
 -InternalBattery-0 (id=12345)\t100%; charged; 0:00 remaining present: true`;

test("parses percent and charging state", () => {
	expect(parseBattery(ON_BATTERY_LOW)).toEqual({
		percent: 15,
		charging: false,
	});
	expect(parseBattery(PLUGGED_IN_LOW)).toEqual({ percent: 12, charging: true });
	expect(parseBattery(CHARGED)).toEqual({ percent: 100, charging: true });
});

test("low only when unplugged and at/below threshold", () => {
	expect(isLowBattery(ON_BATTERY_LOW)).toBe(true);
	expect(isLowBattery(ON_BATTERY_OK)).toBe(false);
	expect(isLowBattery(PLUGGED_IN_LOW)).toBe(false); // plugged in is never low
	expect(isLowBattery(CHARGED)).toBe(false);
});

test("threshold is configurable", () => {
	expect(isLowBattery(ON_BATTERY_OK, 90)).toBe(true); // 80% <= 90
	expect(isLowBattery(ON_BATTERY_LOW, 10)).toBe(false); // 15% > 10
});

test("unparseable output is never low", () => {
	expect(isLowBattery("garbage")).toBe(false);
});
