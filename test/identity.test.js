import Reporter from "jasmine-ctrf-json-reporter";

describe("identity lifecycle", () => {
	it("retains logical identity under randomized registration IDs", () => {
		const one = new Reporter({ runId: "run", shardId: "one" });
		const two = new Reporter({ runId: "run", shardId: "two" });
		const test = {
			description: "case",
			fullName: "suite case",
			status: "passed",
			duration: 1,
		};
		for (const reporter of [one, two])
			reporter.suiteStarted({ description: "suite" });
		one.specDone({ ...test, id: "spec0" });
		two.specDone({ ...test, id: "spec99" });
		expect(one.ctrfReport.results.tests[0].testId).toBe(
			two.ctrfReport.results.tests[0].testId,
		);
		expect(one.ctrfReport.results.tests[0].executionId).not.toBe(
			two.ctrfReport.results.tests[0].executionId,
		);
		expect(one.ctrfReport.runId).toBe("run");
	});
	it("allows explicit scope for otherwise indistinguishable specs", () => {
		const reporter = new Reporter({
			runId: "",
			testIdResolver: () => "file-a-case",
		});
		expect(
			JSON.parse(JSON.stringify(reporter.ctrfReport)).runId,
		).toBeUndefined();
		reporter.specDone({ fullName: "case", status: "pending", duration: 0 });
		expect(reporter.ctrfReport.results.tests[0].testId).toBe("file-a-case");
	});
});
it("starts a fresh run when the runner reuses the reporter", () => {
	const reporter = new Reporter();
	reporter.jasmineStarted({});
	reporter.specDone({
		id: "spec0",
		description: "case",
		fullName: "case",
		status: "passed",
		duration: 1,
	});
	const first = { ...reporter.ctrfReport };
	const logical = reporter.ctrfReport.results.tests[0].testId;
	reporter.jasmineStarted({});
	reporter.specDone({
		id: "spec1",
		description: "case",
		fullName: "case",
		status: "passed",
		duration: 1,
	});
	expect(reporter.ctrfReport.results.tests.length).toBe(1);
	expect(reporter.ctrfReport.runId).toBeUndefined();
	expect(first.runId).toBeUndefined();
	expect(reporter.ctrfReport.reportId).not.toBe(first.reportId);
	expect(reporter.ctrfReport.results.tests[0].testId).toBe(logical);
});
