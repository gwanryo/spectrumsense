import { describe, it, expect, afterEach, vi } from 'vitest'
import { getCurrentPage, getHashParams, navigateTo } from '../src/router'

function stubWindowHash(hash: string): { hash: string } {
  const location = { hash }
  vi.stubGlobal('window', { location })
  return location
}

describe('router hash parsing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getCurrentPage returns landing for empty hash', () => {
    stubWindowHash('')
    expect(getCurrentPage()).toBe('landing')
  })

  it('getCurrentPage detects test and results routes', () => {
    stubWindowHash('#/test')
    expect(getCurrentPage()).toBe('test')

    stubWindowHash('#/results?r=abc')
    expect(getCurrentPage()).toBe('results')
  })

  it('getCurrentPage falls back to landing for unknown route', () => {
    stubWindowHash('#/unknown')
    expect(getCurrentPage()).toBe('landing')
  })

  it('getHashParams reads query parameters from hash', () => {
    stubWindowHash('#/results?r=abc123&lang=ko')
    const params = getHashParams()
    expect(params.get('r')).toBe('abc123')
    expect(params.get('lang')).toBe('ko')
  })

  it('getHashParams returns empty params when no query exists', () => {
    stubWindowHash('#/test')
    const params = getHashParams()
    expect(params.toString()).toBe('')
  })

  it('navigateTo writes hash with encoded params', () => {
    const location = stubWindowHash('')
    navigateTo('results', { r: 'a b', lang: 'ja' })
    expect(location.hash).toBe('#/results?r=a+b&lang=ja')
  })
})
