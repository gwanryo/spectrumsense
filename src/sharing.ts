import type { TestResult } from './types'
import { buildShareUrl } from './url-state'
import { t } from './i18n/index'

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function shareWebApi(result: TestResult): Promise<ShareResult> {
  if (!isWebShareSupported()) return 'failed'

  const shareUrl = buildShareUrl(result)
  const shareTitle = t('share.title')
  const shareDescription = t('share.description')
  const isMobile = isLikelyMobileDevice()

  if (isWindowsDesktop()) {
    const copied = await copyToClipboard(`${shareDescription}\n${shareUrl}`)
    return copied ? 'copied' : 'failed'
  }

  try {
    if (isMobile) {
      await navigator.share({
        title: shareTitle,
        text: shareDescription,
        url: shareUrl,
      })
    } else {
      await navigator.share({
        title: shareTitle,
        text: `${shareDescription}\n${shareUrl}`,
      })
    }
    return 'shared'
  } catch (err) {
    // User cancelled or share failed
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled'
    }
    return 'failed'
  }
}

function isLikelyMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) {
    return true
  }

  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1
}

function isWindowsDesktop(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  return /Windows/i.test(ua) && !isLikelyMobileDevice()
}

/**
 * Copy a URL to the clipboard.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      return false
    }
  }
}

/**
 * Check if the Web Share API is available.
 * Primarily available on mobile browsers.
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

