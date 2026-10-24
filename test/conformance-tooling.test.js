import { checkJasmineEntry } from "../tests/standard/conformance/jasmine-checks.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
	catalogue,
	disposition,
	checkEntry,
} from "../tests/standard/conformance/shared/checks.mjs";
import {
	unitContext,
	nativeFixture,
	emitSample,
} from "../tests/standard/conformance/unit/fixtures.mjs";
import { runConformance } from "../tests/standard/conformance/expected-failures.mjs";
import { specRecord, errorRecords } from "./reporters/jasmine.mjs";
const context = unitContext();
const cloneContext = () => {
	const copy = structuredClone(context);
	for (const sample of copy.samples) sample.bytes = Buffer.from(sample.bytes);
	return copy;
};
const find = (name) => {
	const sample = context.samples.find((s) => s.name === name);
	assert.ok(sample, name);
	return sample;
};
it("Jasmine tooling / reviewed shared snapshot is unchanged", () => {
	const base = new URL("../tests/standard/", import.meta.url);
	const manifest = JSON.parse(
		readFileSync(new URL("shared-files.json", base), "utf8"),
	);
	for (const [file, hash] of Object.entries(manifest.files))
		assert.equal(
			createHash("sha256")
				.update(readFileSync(new URL(file, base)))
				.digest("hex"),
			hash,
			file,
		);
});
it("Jasmine tooling / capabilities cover exactly the common inventory", () => {
	const m = JSON.parse(
		readFileSync(
			new URL("../tests/standard/conformance/jasmine.json", import.meta.url),
			"utf8",
		),
	);
	for (const entry of catalogue.entries) disposition(entry, m);
	assert.deepEqual(
		Object.keys(m.properties).sort(),
		catalogue.entries
			.filter((e) => e.kind === "property")
			.map((e) => e.path)
			.sort(),
	);
	assert.deepEqual(
		Object.keys(m.rules).sort(),
		catalogue.entries
			.filter((e) => e.kind === "report")
			.map((e) => e.rule)
			.sort(),
	);
});
for (const [label, mutate, rule] of [
	[
		"invalid duration",
		(r) => {
			r.results.tests[0].duration = "invalid";
		},
		"single-json-object",
	],
	[
		"invalid optional field",
		(r) => {
			r.results.tests[0].retries = -1;
		},
		"single-json-object",
	],
	[
		"wrong counter",
		(r) => {
			r.results.summary.passed++;
		},
		"summary-matches-final-results",
	],
	[
		"wrong declaration",
		(r) => {
			r.specVersion = "9.9.9";
		},
		"declares-supported-contract",
	],
])
	it(`Jasmine tooling / rejects ${label}`, () => {
		const report = structuredClone(find("full").report);
		mutate(report);
		assert.throws(() =>
			checkEntry(
				catalogue.entries.find((e) => e.rule === rule),
				{
					samples: [
						{
							name: "mutated",
							report,
							bytes: Buffer.from(JSON.stringify(report)),
						},
					],
					warnings: [],
				},
			),
		);
	});
it("Jasmine tooling / independent source mapping rejects schema-valid renamed tests", () => {
	const sample = structuredClone(find("full"));
	sample.report.results.tests[0].name = "incorrect mapping";
	assert.throws(() =>
		checkEntry(
			catalogue.entries.find((e) => e.path === "results.tests[].name"),
			{ samples: [sample] },
		),
	);
});
for (const id of [
	"conformance/property/results.environment.buildNumber",
	"conformance/report/single-json-object",
]) {
	const entry = catalogue.entries.find((e) => e.id === id);
	it(`Jasmine matcher / ${id} reproduces both exact defects`, () => {
		const result = runConformance(entry, context, "unit");
		assert.equal(result.issue, "invalid-build-number");
		assert.deepEqual(result.samples, [
			"fractional-build-number",
			"nonfinite-build-number",
		]);
	});
	it(`Jasmine matcher / ${id} rejects a partial fix`, () => {
		const c = cloneContext();
		const sample = c.samples.find((s) => s.name === "fractional-build-number");
		sample.report.results.environment.buildNumber = 0;
		sample.expected.results.environment = { buildNumber: 0 };
		sample.bytes = Buffer.from(JSON.stringify(sample.report));
		assert.throws(() => runConformance(entry, c, "unit"), /Unexpected pass/);
	});
	it(`Jasmine matcher / ${id} rejects changed violations`, () => {
		const c = cloneContext();
		const sample = c.samples.find((s) => s.name === "fractional-build-number");
		sample.report.results.environment.buildNumber = "wrong";
		sample.bytes = Buffer.from(JSON.stringify(sample.report));
		assert.throws(() => runConformance(entry, c, "unit"));
	});
	it(`Jasmine matcher / ${id} requires every recorded sample`, () => {
		assert.throws(
			() =>
				runConformance(
					entry,
					{
						...context,
						samples: context.samples.filter(
							(s) => s.name !== "nonfinite-build-number",
						),
					},
					"unit",
				),
			/fixture missing/,
		);
	});
	it(`Jasmine matcher / ${id} rejects unrelated sample failures`, () => {
		const c = cloneContext();
		const sample = c.samples.find((s) => s.name === "full");
		sample.report.results.environment.buildNumber = "wrong";
		sample.bytes = Buffer.from(JSON.stringify(sample.report));
		assert.throws(() => runConformance(entry, c, "unit"));
	});
}
it("Jasmine behavior / zero build number is preserved", () =>
	assert.equal(
		find("zero-build-number").report.results.environment.buildNumber,
		0,
	));
it("Jasmine behavior / empty runId is omitted", () =>
	assert.equal(Object.hasOwn(find("empty-run-id").report, "runId"), false));
it("Jasmine behavior / nested duplicate descriptions retain distinct logical identity", () => {
	const tests = find("full").report.results.tests.filter((t) =>
		t.name.endsWith(" same"),
	);
	assert.equal(tests.length, 2);
	assert.notEqual(tests[0].testId, tests[1].testId);
});
it("Jasmine behavior / no retry history is invented from final aggregates", () => {
	for (const t of find("full").report.results.tests)
		for (const key of ["retries", "retryAttempts", "flaky", "attemptId"])
			assert.equal(Object.hasOwn(t, key), false);
});
it("Jasmine behavior / actual producer leaves native input intact", () => {
	const native = nativeFixture();
	const before = structuredClone(native);
	emitSample("unchanged", native);
	assert.deepEqual(native, before);
});
it("Jasmine runtime / merged metadata matches independent input and stays isolated", () => {
	const tests = find("full").report.results.tests;
	assert.deepEqual(tests[0].extra, {
		owner: "last",
		nested: { first: true, second: true },
		list: ["one", "two"],
	});
	for (const t of tests.slice(1)) assert.equal(t.extra, undefined);
});
it("Jasmine runtime / deep metadata corruption is rejected", () => {
	const sample = structuredClone(find("full"));
	sample.report.results.tests[0].extra.nested.first = false;
	assert.throws(() =>
		checkJasmineEntry(
			catalogue.entries.find((e) => e.path === "results.tests[].extra"),
			{ samples: [sample] },
		),
	);
});
it("Reporter results / completed records preserve passed, failed, pending and excluded outcomes", () => {
	assert.deepEqual(
		["passed", "failed", "pending", "excluded"].map(
			(status) =>
				specRecord({
					fullName: status,
					status,
					duration: 1,
					failedExpectations: [],
				}).status,
		),
		["passed", "failed", "pending", "skipped"],
	);
});
it("Reporter results / suite and runner failures retain diagnostics", () => {
	const records = errorRecords("suite", [
		{ message: "hook failed", stack: "hook stack" },
	]);
	assert.equal(records[0].status, "failed");
	assert.equal(records[0].message, "hook failed");
	assert.equal(records[0].trace, "hook stack");
});
