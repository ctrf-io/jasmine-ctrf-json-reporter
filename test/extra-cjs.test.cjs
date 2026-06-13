const CtrfReporter = require("jasmine-ctrf-json-reporter");
const { ctrf, extra } = CtrfReporter;

describe("Jasmine CTRF Runtime CJS", () => {
	it("exposes the reporter and attaches extra metadata", () => {
		expect(typeof CtrfReporter).toBe("function");
		expect(typeof extra).toBe("function");
		expect(typeof ctrf.extra).toBe("function");

		extra({
			api: "cjs",
			tags: ["root-extra"],
			nested: { first: true },
		});
		ctrf.extra({
			tags: ["ctrf-extra"],
			nested: { second: true },
		});
	});
});
