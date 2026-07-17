import { expect, test } from "vitest";
import { parseRepo } from "./config";

test("parseRepo accepts owner/repo", () => {
	expect(parseRepo("acme/widget")).toEqual({ owner: "acme", name: "widget" });
});

test("parseRepo rejects invalid shapes", () => {
	expect(() => parseRepo("not-a-repo")).toThrow(/owner\/repo/);
	expect(() => parseRepo("a/b/c")).toThrow(/owner\/repo/);
});

test("parseRepo trims whitespace", () => {
	expect(parseRepo("  acme/widget  ")).toEqual({
		owner: "acme",
		name: "widget",
	});
});
