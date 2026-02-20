import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TestResult } from '../src/types'
import { downloadGeneratedResultCard, downloadResultCard } from '../src/canvas/result-card'

function makeResult(): TestResult {
  return {
    boundaries: [20, 48, 82, 170, 255, 322, 350],
    mode: 'normal',
    timestamp: 0,
    locale: 'en',
  }
}

describe('downloadResultCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('downloads a PNG link from canvas data', () => {
    const click = vi.fn()
    const link = {
      download: '',
      href: '',
      click,
    } as unknown as HTMLAnchorElement

    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
    })

    const toDataURL = vi.fn(() => 'data:image/png;base64,AAA')
    const canvas = { toDataURL } as unknown as HTMLCanvasElement

    downloadResultCard(canvas, 'snapshot.svg')

    expect(toDataURL).toHaveBeenCalledWith('image/png')
    expect(link.download).toBe('snapshot.png')
    expect(link.href).toBe('data:image/png;base64,AAA')
    expect(click).toHaveBeenCalledTimes(1)
  })
})

describe('downloadGeneratedResultCard', () => {
  it('uses injected generator and downloader in order', () => {
    const result = makeResult()
    const canvas = { toDataURL: vi.fn(() => 'data:image/png;base64,BBB') } as unknown as HTMLCanvasElement

    const generateCard = vi.fn(() => canvas)
    const downloadCard = vi.fn()

    downloadGeneratedResultCard(
      result,
      'ko',
      { filename: 'result.png', nickname: 'Ryo' },
      { generateCard, downloadCard },
    )

    expect(generateCard).toHaveBeenCalledWith(result, 'ko', { filename: 'result.png', nickname: 'Ryo' })
    expect(downloadCard).toHaveBeenCalledWith(canvas, 'result.png')
  })
})
