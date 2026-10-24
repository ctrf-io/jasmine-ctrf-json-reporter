import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
	rmSync,
	existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expectedReport, metadata } from "../expected.mjs";
import { catalogue, checkEntry } from "../shared/checks.mjs";
export function integrationContext(root, diagnostics) {
	const consumer = mkdtempSync(path.join(tmpdir(), "ctrf-jasmine-consumer-"));
	const npm = process.platform === "win32" ? "npm.cmd" : "npm";
	const env = { ...process.env };
	delete env.NODE_PATH;
	delete env.NODE_OPTIONS;
	const execute = (cmd, args, name, expected = 0) => {
		const result = spawnSync(cmd, args, {
			cwd: consumer,
			env,
			encoding: "utf8",
			timeout: 180000,
			maxBuffer: 8 * 1024 * 1024,
		});
		if (diagnostics) {
			mkdirSync(diagnostics, { recursive: true });
			writeFileSync(
				path.join(diagnostics, `${name}.log`),
				`${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error ?? ""}`,
			);
		}
		assert.ifError(result.error);
		assert.equal(result.signal, null);
		assert.equal(
			result.status,
			expected,
			`${name}: ${result.stdout} ${result.stderr}`,
		);
		return result;
	};
	try {
		const pkg = JSON.parse(
			readFileSync(path.join(root, "package.json"), "utf8"),
		);
		const packed = JSON.parse(
			execute(npm, ["pack", root, "--json", "--ignore-scripts"], "pack").stdout,
		)[0];
		assert.ok(
			packed.files.every(
				(f) =>
					!f.path.startsWith("tests/") &&
					!f.path.startsWith("test/") &&
					!f.path.startsWith("src/"),
			),
		);
		writeFileSync(
			path.join(consumer, "package.json"),
			JSON.stringify({ private: true }),
		);
		execute(
			npm,
			[
				"install",
				"--ignore-scripts",
				"--no-audit",
				"--no-fund",
				"--save-exact",
				`./${packed.filename}`,
				`jasmine@${pkg.devDependencies.jasmine}`,
			],
			"install",
		);
		cpSync(
			new URL("./fixtures/", import.meta.url),
			path.join(consumer, "fixtures"),
			{ recursive: true },
		);
		const scenarios = [
			{ name: "full", exit: 1 },
			{ name: "repeated", exit: 1 },
			{ name: "defaults", defaults: true, passed: true, exit: 0 },
			{ name: "minimal", options: { minimal: true }, exit: 1 },
			{ name: "empty", empty: true, exit: 2 },
			{ name: "empty-run-id", options: { runId: "" }, exit: 1 },
			{
				name: "fractional-build-number",
				options: { buildNumber: 1.5 },
				exit: 1,
			},
			{
				name: "nonfinite-build-number",
				options: { buildNumber: null },
				exit: 1,
			},
			{ name: "zero-build-number", options: { buildNumber: 0 }, exit: 1 },
			{
				name: "shard-one",
				shard: 0,
				passed: true,
				options: { shardId: "one" },
				exit: 0,
			},
			{
				name: "shard-two",
				shard: 1,
				passed: true,
				options: { shardId: "two" },
				exit: 0,
			},
			{
				name: "custom-identity",
				options: { customIdentity: true },
				passed: true,
				exit: 0,
			},
			{ name: "filtered", passed: true, exit: 0 },
			{ name: "hook-error", passed: true, exit: 1 },
			{ name: "timeout", passed: true, exit: 1 },
		];
		const samples = [];
		for (const scenario of scenarios) {
			const folder = path.join(consumer, scenario.name);
			mkdirSync(folder);
			env.CTRF_FIXTURE_SCENARIO = scenario.name;
			env.CTRF_FIXTURE_PASSED = String(scenario.passed ?? false);
			const options = {
				...(scenario.defaults ? {} : metadata),
				...scenario.options,
			};
			const config = {
				...scenario,
				options: { ...options, outputDir: folder, outputFile: "report.json" },
				native: path.join(folder, "native.json"),
			};
			const configFile = path.join(folder, "config.json");
			writeFileSync(configFile, JSON.stringify(config));
			const runWindow = [Date.now()];
			execute(
				process.execPath,
				["fixtures/run.mjs", configFile],
				scenario.name,
				scenario.exit,
			);
			runWindow.push(Date.now());
			const bytes = readFileSync(path.join(folder, "report.json"));
			const native = JSON.parse(readFileSync(config.native, "utf8"));
			const one = [
				"Root pass ✓",
				"Root isolated",
				"Root controlled outcome",
				"Root pending",
				"Root disabled",
				"Root First same",
				"Root Second same",
				"Disabled suite never executes",
			];
			const wanted = scenario.empty
				? []
				: scenario.shard === 0
					? one
					: scenario.shard === 1
						? ["Second file isolated"]
						: [...one, "Second file isolated"];
			if (scenario.name === "hook-error") wanted.push("Broken hook blocked");
			if (scenario.name === "timeout") wanted.push("Timing times out");
			assert.deepEqual(
				native.specs.map((s) => s.fullName).sort(),
				[...wanted].sort(),
				`${scenario.name}: independent native inventory`,
			);
			for (const spec of native.specs) {
				let status = [
					"Root pending",
					"Root disabled",
					"Disabled suite never executes",
				].includes(spec.fullName)
					? "pending"
					: "passed";
				if (spec.fullName === "Root controlled outcome" && !scenario.passed)
					status = "failed";
				if (["Broken hook blocked", "Timing times out"].includes(spec.fullName))
					status = "failed";
				if (scenario.name === "filtered" && spec.fullName !== "Root pass ✓")
					status = "excluded";
				assert.equal(
					spec.status,
					status,
					`${scenario.name}: planned outcome ${spec.fullName}`,
				);
			}
			if (scenario.name === "hook-error")
				assert.ok(native.suiteErrors.length > 0);
			if (scenario.empty) assert.equal(native.overallStatus, "incomplete");
			if (diagnostics)
				for (const file of ["report.json", "native.json"])
					cpSync(
						path.join(folder, file),
						path.join(diagnostics, `${scenario.name}-${file}`),
					);
			const expectedOptions =
				scenario.name === "nonfinite-build-number"
					? { ...options, buildNumber: Infinity }
					: options;
			const expected = expectedReport(native, expectedOptions);
			if (scenario.name === "custom-identity")
				for (const [index, test] of expected.results.tests.entries())
					test.testId = `custom:${native.specs[index].suite.join("/")}:${native.specs[index].description}`;
			samples.push({
				name: scenario.name,
				base64: bytes.toString("base64"),
				report: JSON.parse(bytes),
				native,
				expected,
				options: expectedOptions,
				runWindow,
			});
		}
		const proof = path.join(consumer, "parallel.txt");
		execute(
			process.execPath,
			["fixtures/parallel.cjs", consumer, proof],
			"parallel-unsupported",
		);
		assert.match(readFileSync(proof, "utf8"), /confirmed/);
		const full = samples.find((s) => s.name === "full");
		checkEntry(
			catalogue.entries.find((e) => e.rule === "single-json-object"),
			{
				samples: [{ ...full, bytes: Buffer.from(full.base64, "base64") }],
				warnings: [],
			},
		);
		for (const [rule, mutate] of [
			[
				"single-json-object",
				(r) => {
					r.results.tests[0].duration = "invalid";
				},
			],
			[
				"single-json-object",
				(r) => {
					r.results.tests[0].retries = -1;
				},
			],
			[
				"summary-matches-final-results",
				(r) => {
					r.results.summary.passed++;
				},
			],
			[
				"declares-supported-contract",
				(r) => {
					r.specVersion = "9.9.9";
				},
			],
		]) {
			const report = structuredClone(full.report);
			mutate(report);
			assert.throws(() =>
				checkEntry(
					catalogue.entries.find((e) => e.rule === rule),
					{
						samples: [
							{
								name: "corrupted installed output",
								report,
								bytes: Buffer.from(JSON.stringify(report)),
							},
						],
						warnings: [],
					},
				),
			);
		}
		return {
			samples,
			repeated: ["full", "repeated"],
			shards: ["shard-one", "shard-two"],
			warnings: [],
		};
	} finally {
		rmSync(consumer, { recursive: true, force: true });
	}
}
