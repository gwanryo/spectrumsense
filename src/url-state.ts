import type { TestResult, Locale } from './types'

// Encoding format (compact binary):
// - 7 boundary hues: each stored as 2 bytes (uint16, 0-360 mapped to 0-3600 for 0.1° precision)
// - 1 byte: mode (0=normal, 1=refine)
// - 1 byte: locale (0=en, 1=ko, 2=ja)
// Total: 16 bytes → ~22 chars Base64URL

const LOCALE_MAP: Locale[] = ['en', 'ko', 'ja']
const BASE_URL = 'https://rwe.kr/spectrumsense/'

/** Encode a TestResult into a compact Base64URL string */
export function encodeResult(result: TestResult): string {
  const buffer = new ArrayBuffer(16)
  const view = new DataView(buffer)

  // 7 boundaries × 2 bytes each (stored as tenths of degrees, 0–3600)
  for (let i = 0; i < 7; i++) {
    const hue = Math.round(((result.boundaries[i] ?? 0) % 360 + 360) % 360 * 10)
    view.setUint16(i * 2, hue, false) // big-endian
  }

  // Mode byte
  view.setUint8(14, result.mode === 'refine' ? 1 : 0)

  // Locale byte
  const localeIndex = LOCALE_MAP.indexOf(result.locale)
  view.setUint8(15, localeIndex >= 0 ? localeIndex : 0)

  // Convert to Base64URL
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Decode a Base64URL string back to TestResult. Returns null on any error. */
export function decodeResult(encoded: string): TestResult | null {
  if (!encoded || typeof encoded !== 'string') return null

  try {
    // Restore Base64 padding and characters
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(encoded.length + (4 - (encoded.length % 4)) % 4, '=')

    const binary = atob(base64)
    if (binary.length !== 16) return null

    const buffer = new ArrayBuffer(16)
    const view = new DataView(buffer)
    for (let i = 0; i < 16; i++) {
      view.setUint8(i, binary.charCodeAt(i))
    }

    // Decode 7 boundaries
    const boundaries: number[] = []
    for (let i = 0; i < 7; i++) {
      const raw = view.getUint16(i * 2, false)
      const hue = raw / 10 // convert back from tenths
      if (hue < 0 || hue > 360) return null
      boundaries.push(hue)
    }

    // Decode mode
    const modeByte = view.getUint8(14)
    if (modeByte !== 0 && modeByte !== 1) return null
    const mode: 'normal' | 'refine' = modeByte === 1 ? 'refine' : 'normal'

    // Decode locale
    const localeByte = view.getUint8(15)
    const locale: Locale = LOCALE_MAP[localeByte] ?? 'en'

    return {
      boundaries,
      mode,
      timestamp: Date.now(),
      locale,
    }
  } catch {
    return null
  }
}

/** Build a full shareable URL with encoded results */
export function buildShareUrl(result: TestResult): string {
  const encoded = encodeResult(result)
  return `${BASE_URL}#/results?r=${encoded}`
}

/** Read and decode result from the current page URL's hash parameter */
export function readResultFromUrl(): TestResult | null {
  try {
    const hash = window.location.hash
    const queryIndex = hash.indexOf('?')
    if (queryIndex === -1) return null
    const params = new URLSearchParams(hash.slice(queryIndex))
    const encoded = params.get('r')
    if (!encoded) return null
    return decodeResult(encoded)
  } catch {
    return null
  }
}
