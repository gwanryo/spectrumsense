import { describe, it, expect, beforeEach, vi } from 'vitest'
import en from '../src/i18n/en.json'
import ko from '../src/i18n/ko.json'
import ja from '../src/i18n/ja.json'

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
    const colorKeys = ['colors.red', 'colors.orange', 'colors.yellow', 'colors.green', 'colors.blue', 'colors.violet']
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
