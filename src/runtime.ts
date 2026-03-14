/**
 * CTRF Runtime API for Jasmine
 *
 * The reporter sets a global runtime interface that forwards metadata to the reporter.
 *
 * ## Usage
 *
 * ```ts
 * import { extra } from 'jasmine-ctrf-json-reporter/runtime'
 *
 * it('should do something', () => {
 *   extra({ priority: 'high', owner: 'team-a' })
 *   // test code...
 * })
 * ```
 */

export const CTRF_JASMINE_RUNTIME_KEY = '__ctrfJasmineRuntime__'

export type MessageProcessor = (message: RuntimeMessage) => void

export interface RuntimeMessage {
  type: 'extra'
  data: Record<string, any>
}

/**
 * JasmineTestRuntime interface for type exports
 */
export interface JasmineTestRuntime {
  extra(data: Record<string, any>): void
}

/**
 * Internal JasmineTestRuntime implementation - forwards extra() calls to the reporter
 */
class JasmineTestRuntimeImpl implements JasmineTestRuntime {
  private messageProcessor: MessageProcessor

  constructor(messageProcessor: MessageProcessor) {
    this.messageProcessor = messageProcessor
  }

  extra(data: Record<string, any>): void {
    this.messageProcessor({
      type: 'extra',
      data,
    })
  }
}

/**
 * Set the global runtime (called by reporter)
 */
export function setGlobalTestRuntime(runtime: JasmineTestRuntime): void {
  ;(globalThis as any)[CTRF_JASMINE_RUNTIME_KEY] = runtime
}

/**
 * Get the global runtime (internal use)
 */
function getGlobalTestRuntime(): JasmineTestRuntime | undefined {
  return (globalThis as any)[CTRF_JASMINE_RUNTIME_KEY]
}

/**
 * Create a runtime instance with a message processor
 */
export function createTestRuntime(
  messageProcessor: MessageProcessor
): JasmineTestRuntime {
  return new JasmineTestRuntimeImpl(messageProcessor)
}

/**
 * CTRF runtime API object for Jasmine tests.
 * Import and use in specs to add metadata.
 *
 * @example
 * ```ts
 * import { ctrf } from 'jasmine-ctrf-json-reporter/runtime'
 *
 * it('should do something', () => {
 *   ctrf.extra({ priority: 'high', owner: 'team-a' })
 *   // test code...
 * })
 * ```
 */
export const ctrf = {
  /**
   * Add extra data to the current spec's CTRF output.
   * Call this from within spec code to attach custom metadata.
   * Safe to call from helper functions - binds to currently executing spec.
   */
  extra(data: Record<string, any>): void {
    const runtime = getGlobalTestRuntime()
    if (runtime) {
      runtime.extra(data)
    } else {
      // Safe no-op - don't throw, just warn in debug mode
      if (process.env.DEBUG) {
        console.warn(
          '[CTRF] Runtime not available - extra() called outside of spec context'
        )
      }
    }
  },
}

/**
 * Standalone extra function (alternative to ctrf.extra)
 *
 * @example
 * ```ts
 * import { extra } from 'jasmine-ctrf-json-reporter/runtime'
 *
 * it('should work', () => {
 *   extra({ owner: 'team-a' })
 * })
 * ```
 */
export function extra(data: Record<string, any>): void {
  ctrf.extra(data)
}
