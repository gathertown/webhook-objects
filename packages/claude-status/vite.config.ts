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
			// artifact (the client and its deps like standardwebhooks live in other
			// packages' node_modules and aren't resolvable from ours at runtime).
			// undici stays external: it's the client's optional fetch backend (615kB)
			// and we use the global `fetch` instead, so it's never imported.
			// index.ts keeps its own `#!/usr/bin/env node`; hook-entry.js is always
			// run via an explicit `node`.
			external: (id) => isBuiltin(id) || id === "undici",
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.spec.ts"],
	},
});
