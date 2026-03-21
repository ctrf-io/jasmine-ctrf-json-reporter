# Jasmine JSON test results report

> Save Jasmine test results as a JSON file

A jasmine JSON test reporter to create test reports that follow the CTRF standard.

[Common Test Report Format](https://ctrf.io) ensures the generation of uniform JSON test reports, independent of programming languages or test framework in use.

## CTRF Open Standard

CTRF is a community-driven open standard for test reporting.

By standardizing test results, reports can be validated, merged, compared, and analyzed consistently across languages and frameworks.

- **CTRF Specification**: https://github.com/ctrf-io/ctrf  
  The official specification defining the format and semantics
- **Discussions**: https://github.com/orgs/ctrf-io/discussions  
  Community forum for questions, ideas, and support

> [!NOTE]  
> ⭐ Starring the **CTRF specification repository** (https://github.com/ctrf-io/ctrf)
> helps support the standard.

## Features

- Generate JSON test reports that are [CTRF](https://ctrf.io) compliant
- Straightforward integration with jasmine

```json
{
  "results": {
    "tool": {
      "name": "jasmine"
    },
    "summary": {
      "tests": 1,
      "passed": 1,
      "failed": 0,
      "pending": 0,
      "skipped": 0,
      "other": 0,
      "start": 1706828654274,
      "stop": 1706828655782
    },
    "tests": [
      {
        "name": "ctrf should generate the same report with any tool",
        "status": "passed",
        "duration": 100
      }
    ],
    "environment": {
      "appName": "MyApp",
      "buildName": "MyBuild",
      "buildNumber": "1"
    }
  }
}
```

## What is CTRF?

CTRF is a universal JSON test report schema that addresses the lack of a standardized format for JSON test reports.

**Consistency Across Tools:** Different testing tools and frameworks often produce reports in varied formats. CTRF ensures a uniform structure, making it easier to understand and compare reports, regardless of the testing tool used.

**Language and Framework Agnostic:** It provides a universal reporting schema that works seamlessly with any programming language and testing framework.

**Facilitates Better Analysis:** With a standardized format, programatically analyzing test outcomes across multiple platforms becomes more straightforward.

## Installation

```bash
npm install --save-dev jasmine-ctrf-json-reporter
```

Add the reporter to your spec/helpers file:

```javascript
const CtrfReporter = require('jasmine-ctrf-json-reporter')

jasmine.getEnv().addReporter(new CtrfReporter({}))
```

Run your tests:

```bash
npx jasmine
```

You'll find a JSON file named `ctrf-report.json` in the `ctrf` directory.

## Reporter Options

The reporter supports several configuration options:

```javascript
jasmine.getEnv().addReporter(
  new CtrfReporter({
    outputFile: 'custom-name.json', // Optional: Output file name. Defaults to 'ctrf-report.json'.
    outputDir: 'custom-directory', // Optional: Output directory path. Defaults to 'ctrf'.
    appName: 'MyApp', // Optional: Specify the name of the application under test.
    appVersion: '1.0.0', // Optional: Specify the version of the application under test.
    osPlatform: 'linux', // Optional: Specify the OS platform.
    osRelease: '18.04', // Optional: Specify the OS release version.
    osVersion: '5.4.0', // Optional: Specify the OS version.
    buildName: 'MyApp Build', // Optional: Specify the build name.
    buildNumber: '100', // Optional: Specify the build number.
  })
)
```

## Extra

The `extra` field lets you attach custom metadata to individual test results at runtime.
See the [CTRF extra specification](https://www.ctrf.io/docs/specification/extra) for full details.

### Usage

Import `ctrf` from the reporter and call `ctrf.extra()` inside any test:

```javascript
const { ctrf } = require('jasmine-ctrf-json-reporter')

describe('Checkout', () => {
  it('checkout flow', () => {
    ctrf.extra({ owner: 'checkout-team', priority: 'P1' })

    // ... test logic ...
  })
})
```

You can call it multiple times in a single test:

```javascript
describe('Search', () => {
  it('search results', () => {
    ctrf.extra({ owner: 'search-team' })
    ctrf.extra({ feature: 'search', environment: 'staging' })

    // ... test logic ...

    ctrf.extra({ customMetric: 'some-value' })
  })
})
```

The resulting `extra` field in the CTRF report:

```json
{
  "name": "search results",
  "status": "passed",
  "duration": 300,
  "extra": {
    "owner": "search-team",
    "feature": "search",
    "environment": "staging",
    "customMetric": "some-value"
  }
}
```

### Merge behaviour

| Data type  | Behaviour                           | Example                                                                                                        |
| ---------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Primitives | Later call overwrites earlier       | `extra({ owner: 'a' })` then `extra({ owner: 'b' })` → `{ owner: 'b' }`                                        |
| Objects    | Deep merged - nested keys preserved | `extra({ build: { id: '1' } })` then `extra({ build: { url: '...' } })` → `{ build: { id: '1', url: '...' } }` |
| Arrays     | Concatenated across calls           | `extra({ tags: ['smoke'] })` then `extra({ tags: ['e2e'] })` → `{ tags: ['smoke', 'e2e'] }`                    |

## Test Object Properties

The test object in the report includes the following [CTRF properties](https://ctrf.io/docs/schema/test):

| Name       | Type   | Required | Details                                                                             |
| ---------- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `name`     | String | Required | The name of the test.                                                               |
| `status`   | String | Required | The outcome of the test. One of: `passed`, `failed`, `skipped`, `pending`, `other`. |
| `duration` | Number | Required | The time taken for the test execution, in milliseconds.                             |
| `message`  | String | Optional | The failure message if the test failed.                                             |
| `trace`    | String | Optional | The stack trace captured if the test failed.                                        |
