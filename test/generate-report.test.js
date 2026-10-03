import CtrfReporter from "jasmine-ctrf-json-reporter";
import { CURRENT_SPEC_VERSION, validateStrict } from "ctrf";

describe("jasmine-ctrf-json-reporter", () => {
	it("runs with the native Jasmine test framework", () => {
		expect(true).toBeTrue();
	});

	it("emits the current CTRF specification version", () => {
		const reporter = new CtrfReporter({});

		expect(reporter.ctrfReport.specVersion).toBe(CURRENT_SPEC_VERSION);
	});

	it("produces a strictly valid base report", () => {
		const reporter = new CtrfReporter({});

		expect(() =>
			validateStrict(reporter.ctrfReport, {
				specVersion: CURRENT_SPEC_VERSION,
			}),
		).not.toThrow();
	});

	it("emits a numeric environment build number", () => {
		const reporter = new CtrfReporter({ buildNumber: 100 });
		reporter.jasmineStarted({});

		expect(reporter.ctrfReport.results.environment.buildNumber).toBe(100);
		expect(() =>
			validateStrict(reporter.ctrfReport, {
				specVersion: CURRENT_SPEC_VERSION,
			}),
		).not.toThrow();
	});

	it("maps non-CTRF Jasmine statuses to other", () => {
		const reporter = new CtrfReporter({});
		reporter.specDone({
			fullName: "excluded spec",
			status: "excluded",
			duration: 0,
		});

		expect(reporter.ctrfReport.results.tests[0].status).toBe("other");
		expect(() =>
			validateStrict(reporter.ctrfReport, {
				specVersion: CURRENT_SPEC_VERSION,
			}),
		).not.toThrow();
	});
});
