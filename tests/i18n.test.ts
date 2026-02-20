import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import en from '../src/i18n/en.json'
import ko from '../src/i18n/ko.json'
import ja from '../src/i18n/ja.json'
import {
  detectLocale,
  getCurrentLocale,
  initI18n,
  setLocale,
  t,
} from '../src/i18n/index'

describe('i18n key parity', () => {
  it('EN and KO have identical key sets', () => {
    const enKeys = Object.keys(en).sort()
    const koKeys = Object.keys(ko).sort()
    expect(koKeys).toEqual(enKeys)
  })

  it('EN and JA have identical key sets', () => {
    const enKeys = Object.keys(en).sort()
    const jaKeys = Object.keys(ja).sort()
    expect(jaKeys).toEqual(enKeys)
  })

  it('all locales have required color keys', () => {
    const colorKeys = ['colors.red', 'colors.orange', 'colors.yellow', 'colors.green', 'colors.cyan', 'colors.blue', 'colors.violet', 'colors.pink']
    for (const key of colorKeys) {
      expect(en).toHaveProperty(key)
      expect(ko).toHaveProperty(key)
      expect(ja).toHaveProperty(key)
    }
  })

  it('color names are correctly translated', () => {
    expect(en['colors.red']).toBe('Red')
    expect(ko['colors.red']).toBe('빨강')
    expect(ja['colors.red']).toBe('赤')

    expect(en['colors.violet']).toBe('Violet')
    expect(ko['colors.violet']).toBe('보라')
    expect(ja['colors.violet']).toBe('紫')

    expect(en['colors.pink']).toBe('Pink')
    expect(ko['colors.pink']).toBe('분홍')
    expect(ja['colors.pink']).toBe('ピンク')
  })

  it('all locales have non-empty values', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `EN key "${key}" is empty`).toBeTruthy()
    }
    for (const [key, value] of Object.entries(ko)) {
      expect(value, `KO key "${key}" is empty`).toBeTruthy()
    }
    for (const [key, value] of Object.entries(ja)) {
      expect(value, `JA key "${key}" is empty`).toBeTruthy()
    }
  })
})

describe('t() function', () => {
  it('EN translations have landing title', () => {
    expect(en['landing.title']).toBe('SpectrumSense')
  })

  it('KO translations have landing title', () => {
    expect(ko['landing.title']).toBeTruthy()
    expect(ko['landing.title']).not.toBe('SpectrumSense')
  })

  it('JA translations have landing title', () => {
    expect(ja['landing.title']).toBeTruthy()
    expect(ja['landing.title']).not.toBe('SpectrumSense')
  })

  it('progress template has {n} and {total} placeholders', () => {
    expect(en['test.progress']).toContain('{n}')
    expect(en['test.progress']).toContain('{total}')
  })
})

describe('i18n runtime behavior', () => {
  beforeEach(() => {
    setLocale('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setLocale('en')
  })

  it('setLocale and getCurrentLocale keep current language', () => {
    setLocale('ko')
    expect(getCurrentLocale()).toBe('ko')
    setLocale('ja')
    expect(getCurrentLocale()).toBe('ja')
  })

  it('t() substitutes template variables', () => {
    setLocale('en')
    const rendered = t('test.progress', { n: 3, total: 48 })
    expect(rendered).toContain('3')
    expect(rendered).toContain('48')
    expect(rendered).not.toContain('{n}')
    expect(rendered).not.toContain('{total}')
  })

  it('t() returns key when translation is missing', () => {
    expect(t('missing.translation.key')).toBe('missing.translation.key')
  })

  it('detectLocale prioritizes hash lang param over browser language', () => {
    vi.stubGlobal('window', { location: { hash: '#/test?lang=ja' } })
    vi.stubGlobal('navigator', { language: 'ko-KR' })
    expect(detectLocale()).toBe('ja')
  })

  it('detectLocale uses browser language when hash lang is missing', () => {
    vi.stubGlobal('window', { location: { hash: '#/test' } })
    vi.stubGlobal('navigator', { language: 'ko-KR' })
    expect(detectLocale()).toBe('ko')
  })

  it('detectLocale falls back to en for unsupported browser language', () => {
    vi.stubGlobal('window', { location: { hash: '#/test' } })
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    expect(detectLocale()).toBe('en')
  })

  it('initI18n sets current locale from detected value', () => {
    vi.stubGlobal('window', { location: { hash: '#/?lang=ko' } })
    vi.stubGlobal('navigator', { language: 'en-US' })
    const locale = initI18n()
    expect(locale).toBe('ko')
    expect(getCurrentLocale()).toBe('ko')
  })
})
