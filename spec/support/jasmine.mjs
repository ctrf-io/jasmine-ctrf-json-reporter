export default {
	spec_dir: "test",
	spec_files: ["**/*.test.js", "**/*.test.cjs"],
	helpers: ["helpers/**/*.cjs", "helpers/**/*.mjs"],
	env: {
		random: false,
	},
};
