import { isAbsolute } from "node:path";
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
			// Externalize bare dependencies (e.g. standardwebhooks, undici, node
			// builtins), but bundle internal modules — relative, absolute (resolved
			// source paths), and @webhook-objects/* — so the emitted entries never
			// reference un-emitted source files.
			external: (id) =>
				!id.startsWith(".") &&
				!isAbsolute(id) &&
				!id.startsWith("@webhook-objects"),
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
