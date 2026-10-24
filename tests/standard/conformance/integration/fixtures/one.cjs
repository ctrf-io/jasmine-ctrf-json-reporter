const { extra } = require("jasmine-ctrf-json-reporter");
const { ctrf } = require("jasmine-ctrf-json-reporter/runtime");
describe("Root", () => {
	beforeAll(() => extra({ outside: "must not leak" }));
	it("pass ✓", () => {
		extra({ owner: "first", nested: { first: true }, list: ["one"] });
		ctrf.extra({ owner: "last", nested: { second: true }, list: ["two"] });
		expect(true).toBeTrue();
	});
	it("isolated", () => expect(true).toBeTrue());
	it("controlled outcome", () =>
		expect(process.env.CTRF_FIXTURE_PASSED === "true").toBeTrue());
	it("pending", () => pending("controlled pending"));
	xit("disabled", () => fail("must not execute"));
	describe("First", () => it("same", () => expect(true).toBeTrue()));
	describe("Second", () => it("same", () => expect(true).toBeTrue()));
});
xdescribe("Disabled suite", () =>
	it("never executes", () => fail("must not execute")));
if (process.env.CTRF_FIXTURE_SCENARIO === "hook-error")
	describe("Broken hook", () => {
		beforeAll(() => {
			throw new Error("controlled hook error");
		});
		it("blocked", () => fail("must not execute"));
	});
if (process.env.CTRF_FIXTURE_SCENARIO === "timeout")
	describe("Timing", () => it("times out", () => new Promise(() => {})));
