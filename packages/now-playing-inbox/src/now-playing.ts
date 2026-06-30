/**
 * Read macOS now-playing metadata (Spotify, then Music) via `osascript`.
 *
 * Each player is queried with its own script. A player that isn't installed
 * makes its script fail to compile (its terminology is missing) — we treat any
 * failure as "not playing" and fall through to the next player.
 *
 * @module
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** A track read from a now-playing source. */
export type Track = { id: string; text: string; url?: string };

/** Tab-delimited `id\ttext\turl` (url present for Spotify only). */
const SPOTIFY_SCRIPT = `
tell application "Spotify"
	if it is running and player state is playing then
		set t to current track
		return (id of t) & tab & (artist of t) & " — " & (name of t) & tab & (spotify url of t)
	end if
end tell
return ""
`;

/** Tab-delimited `id\ttext` (no url; a search link is synthesized). */
const MUSIC_SCRIPT = `
tell application "Music"
	if it is running and player state is playing then
		set t to current track
		return (database ID of t as string) & tab & (artist of t) & " — " & (name of t)
	end if
end tell
return ""
`;

/**
 * Parse a tab-delimited `id\ttext[\turl]` line into a {@link Track}, or `null`
 * when the line is empty / malformed. When no url is given, an Apple Music
 * search link is synthesized from the text.
 */
export function parseNowPlaying(raw: string): Track | null {
	const line = raw.trim();
	if (!line) return null;
	const [id, text, url] = line.split("\t");
	if (!id || !text) return null;
	return {
		id,
		text,
		url:
			url || `https://music.apple.com/search?term=${encodeURIComponent(text)}`,
	};
}

/** Run one player's AppleScript; returns its track, or `null` on any failure. */
async function readPlayer(script: string): Promise<Track | null> {
	try {
		const { stdout } = await exec("osascript", ["-e", script]);
		return parseNowPlaying(stdout);
	} catch {
		return null; // player not installed, or osascript errored — skip it
	}
}

/** Read the current track (Spotify preferred), or `null` if nothing is playing. */
export async function readNowPlaying(): Promise<Track | null> {
	return (await readPlayer(SPOTIFY_SCRIPT)) ?? (await readPlayer(MUSIC_SCRIPT));
}
