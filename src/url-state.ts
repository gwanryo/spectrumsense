import type { TestResult, Locale } from './types'

// Encoding format (compact binary, minimum 19 bytes):
// - 8 boundary hues: 16 bytes (uint16 each, 0-360 mapped to 0-3600 for 0.1° precision)
// - 1 byte: mode (0=normal, 1=refine)
// - 1 byte: locale (0=en, 1=ko, 2=ja)
// - 1 byte: nickname length in UTF-8 bytes (0 = no nickname)
// - N bytes: nickname UTF-8 bytes

const BOUNDARY_COUNT = 8
const HEADER_SIZE = BOUNDARY_COUNT * 2 + 2
const MIN_PAYLOAD_SIZE = HEADER_SIZE + 1

const LOCALE_MAP: Locale[] = ['en', 'ko', 'ja']
const BASE_URL = 'https://rwe.kr/spectrumsense/'

/** Encode a TestResult into a compact Base64URL string */
export function encodeResult(result: TestResult): string {
  const nickname = (result.nickname ?? '').trim()
  const nicknameBytes = nickname ? new TextEncoder().encode(nickname) : new Uint8Array(0)
  const payloadSize = MIN_PAYLOAD_SIZE + nicknameBytes.length

  const buffer = new ArrayBuffer(payloadSize)
  const view = new DataView(buffer)

  for (let i = 0; i < BOUNDARY_COUNT; i++) {
    const hue = Math.round(((result.boundaries[i] ?? 0) % 360 + 360) % 360 * 10)
    view.setUint16(i * 2, hue, false)
  }

  const modeOffset = BOUNDARY_COUNT * 2
  view.setUint8(modeOffset, result.mode === 'refine' ? 1 : 0)

  const localeIndex = LOCALE_MAP.indexOf(result.locale)
  view.setUint8(modeOffset + 1, localeIndex >= 0 ? localeIndex : 0)

  view.setUint8(HEADER_SIZE, nicknameBytes.length)
  if (nicknameBytes.length > 0) {
    const bytes = new Uint8Array(buffer)
    bytes.set(nicknameBytes, MIN_PAYLOAD_SIZE)
  }

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
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(encoded.length + (4 - (encoded.length % 4)) % 4, '=')

    const binary = atob(base64)

    if (binary.length < MIN_PAYLOAD_SIZE) return null

    const buffer = new ArrayBuffer(binary.length)
    const view = new DataView(buffer)
    for (let i = 0; i < binary.length; i++) {
      view.setUint8(i, binary.charCodeAt(i))
    }

    const boundaries: number[] = []
    for (let i = 0; i < BOUNDARY_COUNT; i++) {
      const raw = view.getUint16(i * 2, false)
      const hue = raw / 10
      if (hue < 0 || hue > 360) return null
      boundaries.push(hue)
    }

    const modeOffset = BOUNDARY_COUNT * 2
    const modeByte = view.getUint8(modeOffset)
    if (modeByte !== 0 && modeByte !== 1) return null
    const mode: 'normal' | 'refine' = modeByte === 1 ? 'refine' : 'normal'

    const localeByte = view.getUint8(modeOffset + 1)
    const locale: Locale = LOCALE_MAP[localeByte] ?? 'en'

    let nickname: string | undefined
    const nickLen = view.getUint8(HEADER_SIZE)
    if (nickLen > 0 && MIN_PAYLOAD_SIZE + nickLen <= binary.length) {
      const nickBytes = new Uint8Array(buffer, MIN_PAYLOAD_SIZE, nickLen)
      nickname = new TextDecoder().decode(nickBytes)
    }

    return { boundaries, mode, timestamp: Date.now(), locale, nickname }
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
