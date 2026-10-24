import fs from "node:fs";
import Jasmine from "jasmine";
import Reporter from "jasmine-ctrf-json-reporter";
const config = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const options = config.options;
if (config.name === "nonfinite-build-number") options.buildNumber = Infinity;
if (options.customIdentity)
	options.testIdResolver = ({ name, suite }) =>
		`custom:${suite.join("/")}:${name}`;
const runner = new Jasmine();
runner.exitOnCompletion = false;
runner.loadConfig({
	spec_dir: "fixtures",
	spec_files: config.empty
		? []
		: config.shard === 0
			? ["one.cjs"]
			: config.shard === 1
				? ["two.cjs"]
				: ["one.cjs", "two.cjs"],
	helpers: [],
	random: false,
});
const native = { specs: [], suiteErrors: [], start: 0, stop: 0 };
const suites = [];
runner.env.addReporter({
	jasmineStarted() {
		native.start = Date.now();
	},
	suiteStarted(t) {
		suites.push(t.description);
	},
	suiteDone(t) {
		if (t.failedExpectations?.length)
			native.suiteErrors.push({
				description: t.description,
				failures: t.failedExpectations,
			});
		suites.pop();
	},
	specDone(t) {
		native.specs.push({
			id: t.id,
			description: t.description,
			fullName: t.fullName,
			status: t.status,
			duration: t.duration,
			suite: [...suites],
			failedExpectations: t.failedExpectations.map((e) => ({
				message: e.message,
				stack: e.stack,
			})),
		});
	},
	jasmineDone(t) {
		native.stop = Date.now();
		native.overallStatus = t.overallStatus;
		native.incompleteReason = t.incompleteReason;
		fs.writeFileSync(config.native, JSON.stringify(native));
	},
});
runner.addReporter(new Reporter(options));
if (config.name === "filtered")
	runner.env.configure({
		specFilter: (spec) => spec.getFullName() === "Root pass ✓",
	});
runner.jasmine.DEFAULT_TIMEOUT_INTERVAL = 60;
const result = await runner.execute();
process.exitCode =
	result.overallStatus === "passed"
		? 0
		: result.overallStatus === "failed"
			? 1
			: 2;
