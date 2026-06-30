/**
 * AI Provider base abstract class
 * Provides common HTTP request, error handling, and task polling capabilities
 */

import type {
  AIProvider,
  ProviderConfig,
  ImageOptions,
  ImageResult,
  VideoOptions,
  VideoResult,
  TaskStatus,
  Model,
  MediaType,
  TaskStatusEnum,
} from './types'

/** API request error */
export class ProviderError extends Error {
  /** Error code */
  code: string
  /** HTTP status code */
  statusCode?: number
  /** Provider name */
  provider: string

  constructor(message: string, code: string, provider: string, statusCode?: number) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.provider = provider
    this.statusCode = statusCode
  }
}

/** Base Provider abstract class */
export abstract class BaseProvider implements AIProvider {
  abstract readonly name: string
  abstract readonly displayName: string

  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  // ==================== abstract methods (subclasses must implement) ====================

  abstract generateImage(options: ImageOptions): Promise<ImageResult>
  abstract generateVideo(options: VideoOptions): Promise<VideoResult>
  abstract getTaskStatus(taskId: string): Promise<TaskStatus>
  abstract listModels(mediaType?: MediaType): Promise<Model[]>

  // ==================== common utility methods ====================

  /**
   * Send an HTTP request
   * @param path API path (relative to baseUrl)
   * @param options Request options
   * @returns Parsed JSON data
   */
  protected async request<T = unknown>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: unknown
      headers?: Record<string, string>
      timeout?: number
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, timeout } = options
    const url = `${this.config.baseUrl}${path}`
    const requestTimeout = timeout ?? this.config.timeout ?? 30000

    // build request headers
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...this.config.headers,
      ...headers,
    }

    // auto-retry on transient errors (429 rate-limit, 5xx, network failure, timeout), up to 2 retries with exponential backoff
    const maxRetries = 2
    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout)
      try {
        const response = await fetch(url, {
          method,
          headers: mergedHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          // 429/5xx are retryable transient errors
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            lastError = new ProviderError(
              `API 请求失败: ${response.status} ${response.statusText}`,
              'API_ERROR',
              this.name,
              response.status
            )
            await this.sleep(500 * Math.pow(2, attempt))
            continue
          }
          throw new ProviderError(
            `API 请求失败: ${response.status} ${response.statusText} - ${errorBody}`,
            'API_ERROR',
            this.name,
            response.status
          )
        }

        return (await response.json()) as T
      } catch (error) {
        clearTimeout(timeoutId)
        // non-transient errors like 4xx: throw immediately without retry
        if (error instanceof ProviderError && error.statusCode && error.statusCode < 500 && error.statusCode !== 429) {
          throw error
        }
        const isTimeout = error instanceof DOMException && error.name === 'AbortError'
        lastError = isTimeout
          ? new ProviderError(`请求超时（${requestTimeout}ms）`, 'TIMEOUT', this.name)
          : error instanceof ProviderError
            ? error
            : new ProviderError(`网络请求异常: ${error instanceof Error ? error.message : String(error)}`, 'NETWORK_ERROR', this.name)
        // network/timeout/transient errors: back off and retry if attempts remain
        if (attempt < maxRetries) {
          await this.sleep(500 * Math.pow(2, attempt))
          continue
        }
        throw lastError
      } finally {
        clearTimeout(timeoutId)
      }
    }
    // should never reach here — fallback guard
    throw lastError instanceof Error ? lastError : new ProviderError('请求失败', 'UNKNOWN', this.name)
  }

  /**
   * Get authentication headers
   * Subclasses can override to customize the authentication scheme
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    }
  }

  /**
   * Poll task status until completion
   * @param taskId Task ID
   * @param options Polling options
   * @returns Final task status
   */
  protected async pollTaskStatus(
    taskId: string,
    options: {
      /** Polling interval in milliseconds, default 3000 */
      interval?: number
      /** Maximum number of poll attempts, default 200 */
      maxAttempts?: number
      /** Terminal state check; defaults to checking for completed/failed/cancelled */
      isTerminal?: (status: TaskStatusEnum) => boolean
    } = {}
  ): Promise<TaskStatus> {
    const {
      interval = 3000,
      maxAttempts = 200,
      isTerminal = (s) => ['completed', 'failed', 'cancelled'].includes(s),
    } = options

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getTaskStatus(taskId)

      if (isTerminal(status.status)) {
        if (status.status === 'failed') {
          throw new ProviderError(
            `任务失败: ${status.error ?? '未知错误'}`,
            status.errorCode ?? 'TASK_FAILED',
            this.name
          )
        }
        return status
      }

      // wait for the specified interval before the next poll
      await this.sleep(interval)
    }

    throw new ProviderError(
      `任务轮询超时，已尝试 ${maxAttempts} 次`,
      'POLL_TIMEOUT',
      this.name
    )
  }

  /**
   * Assert that an async task has a result after completion, or throw a unified NO_RESULT error.
   * Consolidates the repeated `if (!finalStatus.result) throw` guard across providers — reduces it
   * from 3 lines to 1, enforces a consistent error code, and eliminates the risk of a provider
   * silently failing by forgetting the guard (audits found duplicate bugs from per-provider implementations).
   */
  protected requireResult<T>(result: T | undefined | null, message = '任务完成但未返回结果', code = 'NO_RESULT'): T {
    if (result == null) throw new ProviderError(message, code, this.name)
    return result
  }

  /**
   * Sleep for a given duration
   * @param ms Duration in milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Upload a file to a given URL and return its remote address
   * Some platforms require images/videos to be uploaded before use
   * @param fileUrl Local or remote file URL
   * @param uploadPath Upload API path
   * @returns Remote file URL after upload
   */
  protected async uploadMedia(fileUrl: string, uploadPath: string): Promise<string> {
    // default implementation: return the original URL as-is (assumes platform supports remote URLs)
    // subclasses can override this method to implement platform-specific upload logic
    return fileUrl
  }
}
