import { isBuiltin } from "node:module";
import { defineConfig } from "vitest/config";

export default defineConfig({
	build: {
		target: "node22",
		lib: {
			entry: {
				index: "src/index.ts",
				"hook-entry": "src/hook-entry.ts",
			},
			formats: ["es"],
			fileName: (_, entryName) => `${entryName}.js`,
		},
		rolldownOptions: {
			// Bundle everything except node builtins so the CLI is a self-contained
			// artifact (the SDK and its standardwebhooks dep live in node_modules,
			// which isn't resolvable from dist at runtime).
			// index.ts keeps its own `#!/usr/bin/env node`; hook-entry.js is always
			// run via an explicit `node`.
			external: (id) => isBuiltin(id),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.spec.ts"],
	},
});
