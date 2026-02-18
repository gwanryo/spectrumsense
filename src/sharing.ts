import type { TestResult } from './types'
import { buildShareUrl } from './url-state'
import { computeDeviations } from './result'
import { t } from './i18n/index'

export async function shareWebApi(result: TestResult): Promise<boolean> {
  if (!isWebShareSupported()) return false

  const shareUrl = buildShareUrl(result)
  const deviations = computeDeviations(result.boundaries)
  const meanDeviation = Math.round(
    deviations.reduce((sum, d) => sum + Math.abs(d.difference), 0) / deviations.length
  )

  try {
    await navigator.share({
      title: t('share.title'),
      text: t('share.description', { deviation: meanDeviation }),
      url: shareUrl,
    })
    return true
  } catch (err) {
    // User cancelled or share failed
    if (err instanceof Error && err.name === 'AbortError') {
      return false
    }
    return false
  }
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

/**
 * Get the shareable URL for a result (convenience wrapper).
 */
export function getShareUrl(result: TestResult): string {
  return buildShareUrl(result)
}
