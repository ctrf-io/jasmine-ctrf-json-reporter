import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { metadata, expectedReport } from "../expected.mjs";
const require = createRequire(import.meta.url);
const Reporter = require("../../../../dist/index.cjs");
export function nativeFixture() {
	return {
		specs: [
			{
				id: "spec1",
				description: "pass ✓",
				fullName: "Root pass ✓",
				status: "passed",
				duration: 17,
				suite: ["Root"],
			},
			{
				id: "spec2",
				description: "failure",
				fullName: "Root failure",
				status: "failed",
				duration: 23,
				failedExpectations: [
					{
						message: "controlled failure",
						stack: "AssertionError: controlled failure",
					},
				],
				suite: ["Root"],
			},
			...["pending", "excluded", "skipped"].map((status, i) => ({
				id: `spec${i + 3}`,
				description: status,
				fullName: `Root ${status}`,
				status,
				duration: 0,
				suite: ["Root"],
			})),
			{
				id: "duplicate1",
				description: "same",
				fullName: "Root First same",
				status: "passed",
				suite: ["Root", "First"],
			},
			{
				id: "duplicate2",
				description: "same",
				fullName: "Root Second same",
				status: "passed",
				duration: 0,
				suite: ["Root", "Second"],
			},
		],
	};
}
export function emitSample(name, native, options = {}) {
	const scratch = mkdtempSync(path.join(tmpdir(), "ctrf-jasmine-unit-"));
	const cwd = process.cwd();
	const runtimeKey = "__ctrfJasmineRuntime__";
	const previous = globalThis[runtimeKey];
	try {
		process.chdir(scratch);
		const runWindow = [Date.now()];
		const reporter = new Reporter({
			...options,
			outputDir: scratch,
			outputFile: "report.json",
			...(options.customIdentity
				? { testIdResolver: ({ name }) => `custom:${name}` }
				: {}),
		});
		reporter.jasmineStarted({ totalSpecsDefined: native.specs.length });
		for (const t of native.specs) {
			for (const description of t.suite ?? [])
				reporter.suiteStarted({ description });
			reporter.specStarted(t);
			if (t.fullName === "Root pass ✓") {
				Reporter.ctrf.extra({
					owner: "first",
					nested: { first: true },
					list: ["one"],
				});
				Reporter.extra({
					owner: "last",
					nested: { second: true },
					list: ["two"],
				});
			}
			reporter.specDone(t);
			for (const _ of t.suite ?? []) reporter.suiteDone();
			Reporter.extra({ outside: "must not leak" });
		}
		reporter.jasmineDone({
			overallStatus: native.specs.some((t) => t.status === "failed")
				? "failed"
				: "passed",
		});
		runWindow.push(Date.now());
		const bytes = readFileSync(path.join(scratch, "report.json"));
		return {
			name,
			bytes,
			report: JSON.parse(bytes),
			expected: expectedReport(native, options),
			native,
			options,
			runWindow,
		};
	} finally {
		process.chdir(cwd);
		if (previous === undefined) delete globalThis[runtimeKey];
		else globalThis[runtimeKey] = previous;
		rmSync(scratch, { recursive: true, force: true });
	}
}
export function unitContext() {
	const native = nativeFixture();
	const samples = [
		emitSample("full", native, metadata),
		emitSample("repeated", native, metadata),
		emitSample("defaults", native),
		emitSample("minimal", native, { ...metadata, minimal: true }),
		emitSample("empty", { specs: [] }),
		emitSample("empty-run-id", native, { runId: "" }),
		emitSample(
			"custom-identity",
			{ specs: native.specs.slice(0, 1) },
			{ customIdentity: true },
		),
		emitSample("fractional-build-number", native, { buildNumber: 1.5 }),
		emitSample("nonfinite-build-number", native, { buildNumber: Infinity }),
		emitSample("zero-build-number", native, { buildNumber: 0 }),
	];
	for (const [index, shardId] of ["one", "two"].entries())
		samples.push(
			emitSample(
				`shard-${shardId}`,
				{ specs: native.specs.slice(index, index + 1) },
				{ ...metadata, shardId },
			),
		);
	return {
		samples,
		repeated: samples.slice(0, 2),
		shards: samples.filter((s) => s.name.startsWith("shard-")),
		warnings: [],
	};
}
