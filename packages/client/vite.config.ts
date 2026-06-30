import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	build: {
		lib: {
			entry: {
				browser: "src/browser.ts",
				node: "src/node.ts",
				objects: "src/objects/index.ts",
			},
			formats: ["es"],
			fileName: (_, entryName) => `${entryName}.js`,
		},
		rolldownOptions: {
			// specifiy a regex to externalize everything except @webhook-objects/*
			external: /^(?!@webhook-objects).*$/,
		},
	},
	test: {
		globals: true,
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
		},
		projects: [
			{
				extends: true,
				test: {
					name: "node",
					environment: "node",
					include: ["src/**/*.spec.ts"],
					// The browser entry spec only makes sense in the chromium project.
					exclude: ["src/browser.spec.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "chromium",
					// Only environment-agnostic specs run in the browser. The Node
					// entry specs mock `undici`/use `process` and can't run here.
					include: ["src/client.spec.ts", "src/browser.spec.ts"],
					browser: {
						enabled: true,
						provider: playwright(),
						headless: true,
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
