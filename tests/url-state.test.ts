import { describe, it, expect } from 'vitest'
import { encodeResult, decodeResult, buildShareUrl } from '../src/url-state'
import type { TestResult } from '../src/types'

const standardResult: TestResult = {
  boundaries: [18, 48, 78, 163, 258, 300, 345],
  mode: 'normal',
  timestamp: 1000000,
  locale: 'en',
}

const refineResult: TestResult = {
  boundaries: [20, 50, 80, 165, 260, 305, 340],
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
    for (let i = 0; i < 7; i++) {
      expect(decoded!.boundaries[i]).toBeCloseTo(standardResult.boundaries[i], 0)
    }
  })

  it('round-trips refine mode with KO locale', () => {
    const encoded = encodeResult(refineResult)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.mode).toBe('refine')
    expect(decoded!.locale).toBe('ko')
    for (let i = 0; i < 7; i++) {
      expect(decoded!.boundaries[i]).toBeCloseTo(refineResult.boundaries[i], 0)
    }
  })

  it('round-trips extreme values [0, 1, 179, 180, 359, 300, 0]', () => {
    const extremeResult: TestResult = {
      boundaries: [0, 1, 179, 180, 359, 300, 0],
      mode: 'normal',
      timestamp: 0,
      locale: 'ja',
    }
    const encoded = encodeResult(extremeResult)
    const decoded = decodeResult(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.locale).toBe('ja')
    for (let i = 0; i < 7; i++) {
      expect(decoded!.boundaries[i]).toBeCloseTo(extremeResult.boundaries[i], 0)
    }
  })

  it('encodes as 16-byte payload', () => {
    const encoded = encodeResult(standardResult)
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(24, '='))
    expect(binary.length).toBe(16)
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
    const rParam = new URL(url).searchParams.get('r')
    expect(rParam).toBeTruthy()
    const decoded = decodeResult(rParam!)
    expect(decoded).not.toBeNull()
    expect(decoded!.mode).toBe('normal')
  })
})
