import assert from "node:assert/strict";
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

describe("buildNumber configuration", () => {
	for (const [buildNumber, expected, warningCount] of [
		[0, 0, 0],
		[-1, -1, 0],
		[100, 100, 0],
		[Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1, 0],
		[undefined, undefined, 0],
		[1.5, undefined, 1],
		[NaN, undefined, 1],
		[Infinity, undefined, 1],
		[-Infinity, undefined, 1],
	]) {
		it(`serializes ${String(buildNumber)} with ${warningCount} warning(s)`, () => {
			const warn = console.warn;
			const warnings = [];
			console.warn = (message) => warnings.push(message);
			try {
				const reporter = new CtrfReporter({ buildNumber });
				reporter.jasmineStarted({});
				const report = JSON.parse(JSON.stringify(reporter.ctrfReport));
				assert.equal(report.results.environment?.buildNumber, expected);
				assert.equal(
					Object.hasOwn(report.results.environment ?? {}, "buildNumber"),
					expected !== undefined,
				);
				assert.equal(warnings.length, warningCount);
				if (warningCount)
					assert.equal(
						warnings[0],
						"[CTRF] buildNumber must be a finite integer; omitting invalid value.",
					);
				assert.doesNotThrow(() => validateStrict(report));
			} finally {
				console.warn = warn;
			}
		});
	}
});
