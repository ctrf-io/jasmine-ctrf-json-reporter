import { checkJasmineEntry } from "./jasmine-checks.mjs";
import { runExpectedFailure } from "./shared/expected-failures.mjs";
export const expectedFailures = {};
export function expectedFailure(entry, level) {
	const issue = expectedFailures[entry.id];
	return issue?.samples[level] ? issue : undefined;
}

export function runConformance(entry, context, level) {
	return runExpectedFailure(
		entry,
		context,
		level,
		expectedFailure(entry, level),
		checkJasmineEntry,
		() => false,
	);
}
