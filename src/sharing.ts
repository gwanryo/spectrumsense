import type { TestResult } from './types'
import { buildShareUrl } from './url-state'
import { t } from './i18n/index'

/**
 * Open Twitter/X intent URL to share results.
 * Opens in a new window (popup).
 */
export function shareTwitter(result: TestResult): void {
  const shareUrl = buildShareUrl(result)
  const roBoundary = Math.round(result.boundaries[0])
  const tweetText = t('share.tweet', { ro: roBoundary })

  const params = new URLSearchParams({
    text: tweetText,
    url: shareUrl,
  })

   const intentUrl = `https://x.com/intent/post?${params.toString()}`
  window.open(intentUrl, '_blank', 'width=550,height=420,noopener,noreferrer')
}

/**
 * Use the Web Share API to share results (primarily mobile).
 * Returns true if share was initiated, false if API not available.
 */
export async function shareWebApi(result: TestResult): Promise<boolean> {
  if (!isWebShareSupported()) return false

  const shareUrl = buildShareUrl(result)

  try {
    await navigator.share({
      title: t('share.title'),
      text: t('share.description'),
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
