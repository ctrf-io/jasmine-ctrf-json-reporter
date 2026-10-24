import { mkdirSync, writeFileSync } from "node:fs";
import { createReport } from "../../tests/standard/conformance/reporters/ctrf.mjs";
export function specRecord(spec) {
	return {
		name: spec.fullName,
		status: spec.status === "excluded" ? "skipped" : spec.status,
		duration: spec.duration ?? 0,
		message:
			spec.failedExpectations?.map((e) => e.message).join("\n") ||
			spec.pendingReason,
		trace: spec.failedExpectations
			?.map((e) => e.stack)
			.filter(Boolean)
			.join("\n"),
	};
}
export function errorRecords(label, errors = []) {
	return errors.map((error, index) => ({
		name: `${label} ${index + 1}`,
		status: "failed",
		message: error.message,
		trace: error.stack,
	}));
}
export default class CompletedJasmineReporter {
	jasmineStarted() {
		this.start = Date.now();
		this.records = [];
	}
	specDone(spec) {
		this.records.push(specRecord(spec));
	}
	suiteDone(suite) {
		this.records.push(
			...errorRecords(
				`Suite error: ${suite.fullName}`,
				suite.failedExpectations,
			),
		);
	}
	jasmineDone(result) {
		this.records.push(
			...errorRecords("Runner error", result.failedExpectations),
		);
		if (
			result.overallStatus === "incomplete" ||
			(result.overallStatus === "failed" &&
				!this.records.some((r) => r.status === "failed"))
		)
			this.records.push({
				name: "Runner completion failure",
				status: "failed",
				message: result.incompleteReason ?? result.overallStatus,
			});
		const report = createReport(
			this.records,
			"reporter",
			"jasmine",
			this.start ?? Date.now(),
		);
		for (const test of report.results.tests) test.suite = ["Reporter tests"];
		mkdirSync("ctrf", { recursive: true });
		writeFileSync("ctrf/reporter-tests.json", JSON.stringify(report, null, 2));
	}
}
