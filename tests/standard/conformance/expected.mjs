export const metadata = {
	runId: "controlled-run",
	shardId: "one",
	appName: "fixture",
	appVersion: "1.2.3",
	osPlatform: "linux",
	osRelease: "controlled",
	osVersion: "6",
	buildName: "build",
	buildNumber: 42,
};
export const expectedExtra = {
	owner: "last",
	nested: { first: true, second: true },
	list: ["one", "two"],
};
export function expectedReport(native, options) {
	const tests = native.specs.map((t) => ({
		name: t.fullName,
		status: ["passed", "failed", "skipped", "pending"].includes(t.status)
			? t.status
			: "other",
		duration: typeof t.duration === "number" ? t.duration : 0,
		...(t.status === "failed" && t.failedExpectations?.[0]
			? {
					message: t.failedExpectations[0].message,
					trace: t.failedExpectations[0].stack,
				}
			: {}),
		...(t.fullName === "Root pass ✓"
			? { extra: structuredClone(expectedExtra) }
			: {}),
		...(options.customIdentity ? { testId: `custom:${t.description}` } : {}),
	}));
	const environment = Object.fromEntries(
		Object.entries(options).filter(
			([key]) => key in metadata && key !== "runId",
		),
	);
	if (
		environment.buildNumber !== undefined &&
		!Number.isInteger(environment.buildNumber)
	)
		delete environment.buildNumber;
	const summary = { tests: tests.length };
	for (const status of ["passed", "failed", "pending", "skipped", "other"])
		summary[status] = tests.filter((t) => t.status === status).length;
	return {
		reportFormat: "CTRF",
		specVersion: "0.2.0",
		generatedBy: "jasmine-ctrf-json-reporter",
		...(options.runId ? { runId: options.runId } : {}),
		results: {
			tool: { name: "jasmine" },
			summary,
			tests,
			...(Object.keys(environment).length ? { environment } : {}),
		},
	};
}
