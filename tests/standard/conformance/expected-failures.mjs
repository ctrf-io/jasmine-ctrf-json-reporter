import { AssertionError } from "node:assert/strict";
import { checkJasmineEntry } from "./jasmine-checks.mjs";
import { runExpectedFailure } from "./shared/expected-failures.mjs";
const numericIssue = {
	issue: "invalid-build-number",
	reason: "Fractional and non-finite build numbers produce invalid output",
	followUp: "https://github.com/ctrf-io/jasmine-ctrf-json-reporter/issues/75",
	samples: {
		unit: ["fractional-build-number", "nonfinite-build-number"],
		integration: ["fractional-build-number", "nonfinite-build-number"],
	},
};
export const expectedFailures = {
	"conformance/property/results.environment.buildNumber": numericIssue,
	"conformance/report/single-json-object": numericIssue,
};
export function expectedFailure(entry, level) {
	const issue = expectedFailures[entry.id];
	return issue?.samples[level] ? issue : undefined;
}
export function matchesKnownFailure(entry, sample, issue, error) {
	if (
		!(error instanceof AssertionError) ||
		issue.issue !== "invalid-build-number"
	)
		return false;
	const value = sample.report.results.environment.buildNumber;
	if (value !== (sample.name === "fractional-build-number" ? 1.5 : null))
		return false;
	const detail =
		entry.kind === "property"
			? "results.environment.buildNumber: data must be integer"
			: "data/results/environment/buildNumber must be integer";
	return (
		error.message.split("\n")[0] === `${sample.name}: ${detail}` &&
		error.actual === false &&
		error.expected === true &&
		error.operator === "=="
	);
}
export function runConformance(entry, context, level) {
	return runExpectedFailure(
		entry,
		context,
		level,
		expectedFailure(entry, level),
		checkJasmineEntry,
		matchesKnownFailure,
	);
}
