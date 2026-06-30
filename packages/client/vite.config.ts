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
		rollupOptions: {
			external: ["standardwebhooks", "undici"],
		},
	},
	test: {
		globals: true,
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
		},
	},
});
