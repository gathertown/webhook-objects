import { Client } from "./node";

const SECRET = process.env.GATHER_TOWN_WHO_SECRET ?? "";
const OBJECT_URL = process.env.GATHER_TOWN_WHO_URL ?? "";

// Integration test: hits a live endpoint. Skipped unless both env vars are set,
// so the unit-test run stays green without them.
describe.skipIf(!SECRET || !OBJECT_URL)("Client (integration)", () => {
	it("should request metadata", async () => {
		const client = new Client({
			url: OBJECT_URL,
			secret: SECRET,
		});

		const metadata = await client.requestMetadata();

		console.log(metadata);

		expect(metadata).toBeDefined();
		expect(metadata.status).toBe("pong");
		expect(metadata.objectId).toBe("28191462-e0c7-441d-a82f-07f13182648c");
		expect(metadata.spaceId).toBe("eb638dc6-570a-43ce-822f-c2a3f0fd9f3b");
		expect(metadata.preset).toBe("inbox");
		expect(metadata.capabilities).toBeDefined();
	});

	it("should send a counter set event", async () => {
		const client = new Client({
			url: OBJECT_URL,
			secret: SECRET,
		});

		const res = await client.send({
			type: "counter.set",
			timestamp: "2026-06-29T00:00:00.000Z",
			data: { count: 1 },
		});

		console.log(res);

		expect(res).toBeDefined();
		expect(res.status).toBe("dispatched");
	});

	it("should send an activity add event", async () => {
		const client = new Client({
			url: OBJECT_URL,
			secret: SECRET,
		});

		const res = await client.send({
			type: "activity.add",
			timestamp: "2026-06-29T00:00:00.000Z",
			data: {
				id: "best-website-ever",
				text: "Best Website Ever",
				url: "https://gather.town",
			},
		});

		console.log(res);

		expect(res).toBeDefined();
		expect(res.status).toBe("dispatched");
	});
});
