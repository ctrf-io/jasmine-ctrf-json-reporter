import assert from "node:assert/strict";
import { checkEntry } from "./shared/checks.mjs";
export function checkJasmineEntry(entry, context) {
	checkEntry(entry, context);
	if (entry.path === "results.tests[].extra")
		for (const sample of context.samples)
			assert.deepEqual(
				sample.report.results.tests.map((t) => t.extra),
				sample.expected.results.tests.map((t) => t.extra),
				`${sample.name}: runtime metadata source mapping`,
			);
}
