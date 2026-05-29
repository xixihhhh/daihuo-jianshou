/**
 * 视频下载到相册服务
 * 支持: 浏览器下载 / File System API / 后端代理下载
 */

export interface DownloadResult {
  success: boolean
  fileName: string
  filePath?: string
  error?: string
}

export interface DownloadOptions {
  /** 下载的文件名（不含路径） */
  fileName?: string
  /** 下载方式: browser = 浏览器下载, api = 后端代理下载 */
  method?: 'browser' | 'api'
  /** API 下载时传入的额外参数 */
  apiBody?: Record<string, unknown>
}

/**
 * 下载视频到本地
 * 优先使用浏览器 native 下载，回退到后端代理
 */
export async function downloadVideo(
  videoUrl: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const { fileName = `video_${Date.now()}.mp4`, method = 'browser' } = options

  try {
    if (method === 'browser') {
      return await downloadViaBrowser(videoUrl, fileName)
    }
    return await downloadViaApi(videoUrl, fileName, options.apiBody)
  } catch (error) {
    const msg = error instanceof Error ? error.message : '下载失败'
    console.error('[下载服务]', msg)
    return { success: false, fileName, error: msg }
  }
}

// ========== 浏览器直接下载 ==========
async function downloadViaBrowser(
  videoUrl: string,
  fileName: string
): Promise<DownloadResult> {
  // 同源或已配置 CORS 的直接下载
  try {
    const response = await fetch(videoUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()

    // 清理
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 5000)

    return { success: true, fileName }
  } catch (err) {
    // fallback: 直接打开链接
    console.warn('[下载服务] 浏览器 fetch 失败，尝试直接跳转:', err)
    window.open(videoUrl, '_blank')
    return { success: true, fileName }
  }
}

// ========== 后端 API 代理下载 ==========
async function downloadViaApi(
  videoUrl: string,
  fileName: string,
  extraBody?: Record<string, unknown>
): Promise<DownloadResult> {
  const res = await fetch('/api/ai/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: videoUrl,
      fileName,
      ...extraBody,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '下载失败' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  // API 返回文件流时触发浏览器下载
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()

  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 5000)

  return { success: true, fileName }
}

/**
 * 通过 Show Save File Picker 保存到相册
 * 使用 File System Access API（需要用户手势触发）
 */
export async function saveToGallery(
  videoUrl: string,
  fileName: string = `video_${Date.now()}.mp4`
): Promise<DownloadResult> {
  try {
    // 先 fetch 视频
    const response = await fetch(videoUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()

    // 尝试 File System Access API（Chrome 86+）
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'MP4 视频',
            accept: { 'video/mp4': ['.mp4'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return { success: true, fileName, filePath: handle.name }
    }

    // 降级：浏览器下载
    return await downloadViaBrowser(videoUrl, fileName)
  } catch (error) {
    // 用户取消或出错
    if ((error as DOMException)?.name === 'AbortError') {
      return { success: false, fileName, error: '用户取消保存' }
    }
    const msg = error instanceof Error ? error.message : '保存到相册失败'
    console.error('[保存到相册]', msg)
    return { success: false, fileName, error: msg }
  }
}

/**
 * 将视频分享到其他应用（Web Share API）
 */
export async function shareVideo(videoUrl: string, title?: string): Promise<boolean> {
  if (!navigator.share) {
    // 不支持 Web Share API，复制链接到剪贴板
    try {
      await navigator.clipboard.writeText(videoUrl)
      return true
    } catch {
      return false
    }
  }

  try {
    const response = await fetch(videoUrl)
    const blob = await response.blob()
    const file = new File([blob], 'video.mp4', { type: 'video/mp4' })

    await navigator.share({
      title: title || '带货视频',
      files: [file],
    })
    return true
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') return false
    console.error('[分享视频]', error)
    return false
  }
}
