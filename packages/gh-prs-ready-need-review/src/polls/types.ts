export type PollContext = {
	github: { owner: string; repo: string; token: string; login: string };
};

export type PollResult = {
	pollId: string;
	label: string;
	value: number;
};

export type Poll = (ctx: PollContext) => Promise<PollResult>;
