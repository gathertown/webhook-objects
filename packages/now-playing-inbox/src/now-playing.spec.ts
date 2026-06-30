import { expect, test } from "vitest";
import { parseNowPlaying } from "./now-playing";

test("empty output -> null", () => {
	expect(parseNowPlaying("")).toBeNull();
	expect(parseNowPlaying("  \n")).toBeNull();
});

test("line with a url keeps it (Spotify)", () => {
	const t = parseNowPlaying(
		"spotify:track:abc\tDaft Punk — One More Time\thttps://open.spotify.com/track/abc",
	);
	expect(t).toEqual({
		id: "spotify:track:abc",
		text: "Daft Punk — One More Time",
		url: "https://open.spotify.com/track/abc",
	});
});

test("line without a url synthesizes a search link (Music)", () => {
	const t = parseNowPlaying("42\tFoo — Bar");
	expect(t?.url).toBe(
		"https://music.apple.com/search?term=Foo%20%E2%80%94%20Bar",
	);
});
