import { describe, it, expect } from 'vitest'
import { encodeResult, decodeResult, buildShareUrl } from '../src/url-state'
import type { TestResult } from '../src/types'

const standardResult: TestResult = {
  boundaries: [18, 48, 78, 148, 208, 258, 300, 345],
  mode: 'normal',
  timestamp: 1000000,
  locale: 'en',
}

const refineResult: TestResult = {
  boundaries: [20, 50, 80, 150, 210, 260, 305, 340],
  mode: 'refine',
  timestamp: 2000000,
  locale: 'ko',
}

describe('encodeResult', () => {
  it('produces a non-empty string', () => {
    const encoded = encodeResult(standardResult)
    expect(encoded).toBeTruthy()
    expect(typeof encoded).toBe('string')
  })

  it('encoded string is ≤ 50 characters', () => {
    const encoded = encodeResult(standardResult)
    expect(encoded.length).toBeLessThanOrEqual(50)
  })

  it('uses URL-safe Base64 (no +, /, or = chars)', () => {
    const encoded = encodeResult(standardResult)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
  })
})

describe('decodeResult', () => {
  it('round-trips standard boundaries', () => {
    const encoded = encodeResult(standardResult)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.mode).toBe('normal')
    expect(decoded!.locale).toBe('en')
    for (let i = 0; i < 8; i++) {
      expect(decoded!.boundaries[i]).toBeCloseTo(standardResult.boundaries[i], 0)
    }
  })

  it('round-trips refine mode with KO locale', () => {
    const encoded = encodeResult(refineResult)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.mode).toBe('refine')
    expect(decoded!.locale).toBe('ko')
    for (let i = 0; i < 8; i++) {
      expect(decoded!.boundaries[i]).toBeCloseTo(refineResult.boundaries[i], 0)
    }
  })

  it('round-trips extreme values [0, 1, 90, 179, 180, 359, 300, 0]', () => {
    const extremeResult: TestResult = {
      boundaries: [0, 1, 90, 179, 180, 359, 300, 0],
      mode: 'normal',
      timestamp: 0,
      locale: 'ja',
    }
    const encoded = encodeResult(extremeResult)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.locale).toBe('ja')
    for (let i = 0; i < 8; i++) {
      expect(decoded!.boundaries[i]).toBeCloseTo(extremeResult.boundaries[i], 0)
    }
  })

  it('encodes as 19-byte payload without nickname', () => {
    const encoded = encodeResult(standardResult)
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const binary = atob(padded)
    expect(binary.length).toBe(19)
  })

  it('encodes larger payload when nickname is present', () => {
    const withNick: TestResult = { ...standardResult, nickname: 'Alice' }
    const encoded = encodeResult(withNick)
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const binary = atob(padded)
    expect(binary.length).toBe(19 + 5)
  })

  it('returns null for empty string', () => {
    expect(decodeResult('')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(decodeResult('GARBAGE')).toBeNull()
    expect(decodeResult('!!!invalid!!!')).toBeNull()
    expect(decodeResult('abc')).toBeNull()
  })

  it('does not throw for any invalid input', () => {
    expect(() => decodeResult('')).not.toThrow()
    expect(() => decodeResult('GARBAGE')).not.toThrow()
    expect(() => decodeResult('null')).not.toThrow()
    expect(() => decodeResult('undefined')).not.toThrow()
  })

  it('returns null for invalid mode byte', () => {
    const bytes = new Uint8Array(19)
    const view = new DataView(bytes.buffer)
    for (let i = 0; i < 8; i++) {
      view.setUint16(i * 2, 100, false)
    }
    view.setUint8(16, 2)
    view.setUint8(17, 0)
    view.setUint8(18, 0)

    const encoded = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    expect(decodeResult(encoded)).toBeNull()
  })

  it('falls back to en for unknown locale byte', () => {
    const bytes = new Uint8Array(19)
    const view = new DataView(bytes.buffer)
    for (let i = 0; i < 8; i++) {
      view.setUint16(i * 2, 100, false)
    }
    view.setUint8(16, 0)
    view.setUint8(17, 99)
    view.setUint8(18, 0)

    const encoded = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.locale).toBe('en')
  })

  it('returns null for payloads smaller than 19 bytes', () => {
    for (const size of [15, 16, 18]) {
      const bytes = new Uint8Array(size)
      const encoded = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      expect(decodeResult(encoded)).toBeNull()
    }
  })

  it('round-trips ASCII nickname', () => {
    const withNick: TestResult = { ...standardResult, nickname: 'Alice' }
    const encoded = encodeResult(withNick)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.nickname).toBe('Alice')
    for (let i = 0; i < 8; i++) {
      expect(decoded!.boundaries[i]).toBeCloseTo(standardResult.boundaries[i], 0)
    }
  })

  it('round-trips CJK nickname', () => {
    const withNick: TestResult = { ...standardResult, nickname: '테스트유저' }
    const encoded = encodeResult(withNick)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.nickname).toBe('테스트유저')
  })

  it('omits nickname when empty or whitespace-only', () => {
    const noNick: TestResult = { ...standardResult, nickname: '   ' }
    const encoded = encodeResult(noNick)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.nickname).toBeUndefined()
  })

  it('round-trips result without nickname field', () => {
    const noNick: TestResult = { ...standardResult }
    delete noNick.nickname
    const encoded = encodeResult(noNick)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.nickname).toBeUndefined()
  })

})

describe('buildShareUrl', () => {
  it('produces a URL with ?r= parameter', () => {
    const url = buildShareUrl(standardResult)
    expect(url).toContain('?r=')
  })

  it('produces a URL with #/results hash', () => {
    const url = buildShareUrl(standardResult)
    expect(url).toContain('#/results')
  })

  it('encoded result in URL round-trips correctly', () => {
    const url = buildShareUrl(standardResult)
    const hash = new URL(url).hash
    const rParam = new URLSearchParams(hash.slice(hash.indexOf('?'))).get('r')
    expect(rParam).toBeTruthy()
    const decoded = decodeResult(rParam!)
    expect(decoded).not.toBeNull()
    expect(decoded!.mode).toBe('normal')
  })
})
