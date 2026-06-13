export default {
	spec_dir: "test",
	spec_files: ["**/*.test.js", "**/*.test.cjs"],
	helpers: ["helpers/**/*.cjs"],
	env: {
		random: false,
	},
};
