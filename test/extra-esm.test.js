import CtrfReporter, { ctrf, extra } from "jasmine-ctrf-json-reporter";

describe("Jasmine CTRF Runtime ESM", () => {
	it("exposes the reporter and attaches extra metadata", () => {
		expect(typeof CtrfReporter).toBe("function");
		expect(typeof extra).toBe("function");
		expect(typeof ctrf.extra).toBe("function");

		extra({
			api: "esm",
			tags: ["root-extra"],
			nested: { first: true },
		});
		ctrf.extra({
			tags: ["ctrf-extra"],
			nested: { second: true },
		});
	});
});
