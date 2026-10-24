const fs = require("node:fs");
const assert = require("node:assert/strict");
const Parallel = require("jasmine/parallel");
const Reporter = require("jasmine-ctrf-json-reporter");
const runner = new Parallel({ numWorkers: 2 });
assert.throws(
	() => runner.addReporter(new Reporter({ outputDir: process.argv[2] })),
	/doesn't support parallel mode/,
);
fs.writeFileSync(
	process.argv[3],
	"unsupported reporter parallel mode confirmed",
);
