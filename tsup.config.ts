import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: {
			index: "src/index.ts",
			runtime: "src/runtime.ts",
		},
		format: ["esm"],
		dts: {
			entry: {
				index: "src/index.ts",
				runtime: "src/runtime.ts",
			},
		},
		clean: true,
		shims: true,
		splitting: false,
		outDir: "dist",
	},
	{
		entry: {
			"index.generated": "src/index.ts",
			runtime: "src/runtime.ts",
		},
		format: ["cjs"],
		dts: false,
		clean: false,
		shims: true,
		splitting: false,
		outDir: "dist",
	},
]);
