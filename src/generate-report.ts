import {
  type CtrfTest,
  type CtrfEnvironment,
  type CtrfReport,
  type CtrfTestState,
} from '../types/ctrf.d'
import * as fs from 'fs'
import jasmine = require('jasmine')
import path = require('path')

interface ReporterConfigOptions {
  outputFile?: string
  outputDir?: string
  minimal?: boolean
  screenshot?: boolean
  testType?: string
  appName?: string | undefined
  appVersion?: string | undefined
  osPlatform?: string | undefined
  osRelease?: string | undefined
  osVersion?: string | undefined
  buildName?: string | undefined
  buildNumber?: string | undefined
}

class GenerateCtrfReport implements jasmine.CustomReporter {
  readonly ctrfReport: CtrfReport
  readonly ctrfEnvironment: CtrfEnvironment
  readonly reporterConfigOptions: ReporterConfigOptions
  readonly reporterName = 'jest-ctrf-json-reporter'
  readonly defaultOutputFile = 'ctrf-report.json'
  readonly defaultOutputDir = 'ctrf'
  filename = this.defaultOutputFile

  constructor(reporterOptions: ReporterConfigOptions) {
    this.reporterConfigOptions = {
      outputFile: reporterOptions?.outputFile ?? this.defaultOutputFile,
      outputDir: reporterOptions?.outputDir ?? this.defaultOutputDir,
      appName: reporterOptions?.appName ?? undefined,
      appVersion: reporterOptions?.appVersion ?? undefined,
      osPlatform: reporterOptions?.osPlatform ?? undefined,
      osRelease: reporterOptions?.osRelease ?? undefined,
      osVersion: reporterOptions?.osVersion ?? undefined,
      buildName: reporterOptions?.buildName ?? undefined,
      buildNumber: reporterOptions?.buildNumber ?? undefined,
    }
    this.ctrfReport = {
      results: {
        tool: {
          name: 'jasmine',
        },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          pending: 0,
          skipped: 0,
          other: 0,
          start: 0,
          stop: 0,
        },
        tests: [],
      },
    }

    this.ctrfEnvironment = {}

    if (this.reporterConfigOptions?.outputFile !== undefined)
      this.setFilename(this.reporterConfigOptions.outputFile)

    if (
      !fs.existsSync(
        this.reporterConfigOptions.outputDir ?? this.defaultOutputDir
      )
    ) {
      fs.mkdirSync(
        this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
        { recursive: true }
      )
    }
  }

  jasmineStarted(suiteInfo: jasmine.JasmineStartedInfo): void {
    fs.writeFileSync('suite-info.json', JSON.stringify(suiteInfo))
    this.ctrfReport.results.summary.start = Date.now()
    this.setEnvironmentDetails(this.reporterConfigOptions ?? {})
    if (this.hasEnvironmentDetails(this.ctrfEnvironment)) {
      this.ctrfReport.results.environment = this.ctrfEnvironment
    }
  }

  specDone(result: jasmine.SpecResult): void {
    fs.writeFileSync('spec-result.json', JSON.stringify(result))
    this.updateCtrfTestResultsFromTestStats(result)
    this.updateCtrfTotalsFromSpecDone(result)
  }

  jasmineDone(_info: jasmine.JasmineDoneInfo): void {
    fs.writeFileSync('done.json', JSON.stringify(_info))

    this.ctrfReport.results.summary.stop = Date.now()
    this.writeReportToFile(this.ctrfReport)
  }

  private setFilename(filename: string): void {
    if (filename.endsWith('.json')) {
      this.filename = filename
    } else {
      this.filename = `${filename}.json`
    }
  }

  private mapStatus(jamineStatus: string): CtrfTestState {
    switch (jamineStatus) {
      case 'passed':
        return 'passed'
      case 'failed':
        return 'failed'
      case 'skipped':
        return 'skipped'
      case 'pending':
        return 'pending'
      default:
        return 'other'
    }
  }

  private updateCtrfTotalsFromSpecDone(result: any): void {
    this.ctrfReport.results.summary.tests += 1

    const status = this.mapStatus(result.status)

    switch (status) {
      case 'passed':
        this.ctrfReport.results.summary.passed += 1
        break
      case 'failed':
        this.ctrfReport.results.summary.failed += 1
        break
      case 'skipped':
        this.ctrfReport.results.summary.skipped += 1
        break
      case 'pending':
        this.ctrfReport.results.summary.pending += 1
        break
      default:
        this.ctrfReport.results.summary.other += 1
        break
    }
  }

  private updateCtrfTestResultsFromTestStats(result: any): void {
    const test: CtrfTest = {
      name: result.fullName,
      status: result.status,
      duration: typeof result.duration === 'number' ? result.duration : 0,
    }

    test.message = this.extractFailureDetails(result).message
    test.trace = this.extractFailureDetails(result).trace

    this.ctrfReport.results.tests.push(test)
  }

  setEnvironmentDetails(reporterConfigOptions: ReporterConfigOptions): void {
    if (reporterConfigOptions.appName !== undefined) {
      this.ctrfEnvironment.appName = reporterConfigOptions.appName
    }
    if (reporterConfigOptions.appVersion !== undefined) {
      this.ctrfEnvironment.appVersion = reporterConfigOptions.appVersion
    }
    if (reporterConfigOptions.osPlatform !== undefined) {
      this.ctrfEnvironment.osPlatform = reporterConfigOptions.osPlatform
    }
    if (reporterConfigOptions.osRelease !== undefined) {
      this.ctrfEnvironment.osRelease = reporterConfigOptions.osRelease
    }
    if (reporterConfigOptions.osVersion !== undefined) {
      this.ctrfEnvironment.osVersion = reporterConfigOptions.osVersion
    }
    if (reporterConfigOptions.buildName !== undefined) {
      this.ctrfEnvironment.buildName = reporterConfigOptions.buildName
    }
    if (reporterConfigOptions.buildNumber !== undefined) {
      this.ctrfEnvironment.buildNumber = reporterConfigOptions.buildNumber
    }
  }

  hasEnvironmentDetails(environment: CtrfEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  extractFailureDetails(testResult: jasmine.SpecResult): Partial<CtrfTest> {
    if (
      testResult.status === 'failed' &&
      testResult.failedExpectations !== undefined
    ) {
      const failureDetails: Partial<CtrfTest> = {}
      if (testResult.failedExpectations[0].message !== undefined) {
        failureDetails.message = testResult.failedExpectations[0].message
      }
      if (testResult.failedExpectations[0].stack !== undefined) {
        failureDetails.trace = testResult.failedExpectations[0].stack
      }
      return failureDetails
    }
    return {}
  }

  private writeReportToFile(data: CtrfReport): void {
    const filePath = path.join(
      this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
      this.filename
    )
    const str = JSON.stringify(data, null, 2)
    try {
      fs.writeFileSync(filePath, str + '\n')
      console.log(
        `${this.reporterName}: successfully written ctrf json to %s/%s`,
        this.reporterConfigOptions.outputDir,
        this.filename
      )
    } catch (error) {
      console.error(`Error writing ctrf json report:, ${String(error)}`)
    }
  }
}

export = GenerateCtrfReport
