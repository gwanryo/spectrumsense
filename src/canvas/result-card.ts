import type { TestResult, Deviation, Locale } from '../types'
import { BOUNDARIES, normalizeHue } from '../color'
import { computeDeviations } from '../result'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630

// Dark theme colors (matching CSS variables)
const COLORS = {
  bgPrimary: '#10101c',
  bgSecondary: '#0e0e18',
  bgCard: '#121220',
  textPrimary: '#e8e6f0',
  textSecondary: '#8e8da6',
  textMuted: '#55546e',
  accent: '#2dd4bf',
  border: 'rgba(255, 255, 255, 0.10)',
}

/**
 * Generate a 1200x630 result card canvas for PNG download.
 * Fixed size — no DPI scaling (it's a fixed-size downloadable image).
 */
export function generateResultCard(
  result: TestResult,
  locale: Locale = 'en'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT

  const ctx = canvas.getContext('2d')!
  const deviations = computeDeviations(result.boundaries)

  // ── Background ──
  drawBackground(ctx)

  // ── Header: SpectrumSense branding ──
  drawHeader(ctx)

  // ── Spectrum bar (mini version) ──
  drawMiniSpectrumBar(ctx, result.boundaries, deviations)

  // ── Boundary stats ──
  drawBoundaryStats(ctx, deviations, locale)

  // ── Footer ──
  drawFooter(ctx)

  return canvas
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.bgPrimary
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT)
  gradient.addColorStop(0, 'rgba(45, 212, 191, 0.07)')
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(1, 'rgba(45, 212, 191, 0.03)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const radius = 16
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(CARD_WIDTH - radius, 0)
  ctx.quadraticCurveTo(CARD_WIDTH, 0, CARD_WIDTH, radius)
  ctx.lineTo(CARD_WIDTH, CARD_HEIGHT - radius)
  ctx.quadraticCurveTo(CARD_WIDTH, CARD_HEIGHT, CARD_WIDTH - radius, CARD_HEIGHT)
  ctx.lineTo(radius, CARD_HEIGHT)
  ctx.quadraticCurveTo(0, CARD_HEIGHT, 0, CARD_HEIGHT - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawHeader(ctx: CanvasRenderingContext2D): void {
  // Logo/title
  ctx.fillStyle = COLORS.textPrimary
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('SpectrumSense', 80, 60)

  // Subtitle
  ctx.fillStyle = COLORS.textSecondary
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText('Color Perception Boundaries', 80, 124)

  // Accent line
  ctx.fillStyle = COLORS.accent
  ctx.fillRect(80, 110, 200, 3)
}

function drawMiniSpectrumBar(
  ctx: CanvasRenderingContext2D,
  userBoundaries: number[],
  _deviations: Deviation[]
): void {
  const barX = 80
  const barY = 180
  const barW = CARD_WIDTH - 160
  const barH = 60

  // Draw spectrum gradient
  for (let i = 0; i < barW; i++) {
    const hue = (i / barW) * 360
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
    ctx.fillRect(barX + i, barY, 1, barH)
  }

  // Draw rounded corners overlay (clip effect)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  const radius = 8
  ctx.beginPath()
  ctx.moveTo(barX + radius, barY)
  ctx.lineTo(barX + barW - radius, barY)
  ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + radius)
  ctx.lineTo(barX + barW, barY + barH - radius)
  ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - radius, barY + barH)
  ctx.lineTo(barX + radius, barY + barH)
  ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - radius)
  ctx.lineTo(barX, barY + radius)
  ctx.quadraticCurveTo(barX, barY, barX + radius, barY)
  ctx.closePath()
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.restore()

  // Draw user boundary markers
  const normalized = userBoundaries.map(normalizeHue)
  for (const hue of normalized) {
    const x = barX + (hue / 360) * barW
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(x, barY - 8)
    ctx.lineTo(x, barY + barH + 8)
    ctx.stroke()

    // Triangle marker above
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.moveTo(x, barY - 2)
    ctx.lineTo(x - 6, barY - 14)
    ctx.lineTo(x + 6, barY - 14)
    ctx.closePath()
    ctx.fill()
  }

  // Draw standard boundary markers (dashed, teal)
  for (const boundary of BOUNDARIES) {
    const x = barX + (boundary.standardHue / 360) * barW
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(x, barY)
    ctx.lineTo(x, barY + barH + 10)
    ctx.stroke()
  }
  ctx.setLineDash([])
}

function drawBoundaryStats(
  ctx: CanvasRenderingContext2D,
  deviations: Deviation[],
  locale: Locale
): void {
  const startX = 80
  const startY = 300
  const colWidth = (CARD_WIDTH - 160) / 4
  const rowHeight = 80

  const colorNames: Record<string, Record<Locale, string>> = {
    red:    { en: 'Red',    ko: '\uBE68\uAC15', ja: '\u8D64' },
    orange: { en: 'Orange', ko: '\uC8FC\uD669', ja: '\u6A59' },
    yellow: { en: 'Yellow', ko: '\uB178\uB791', ja: '\u9EC4' },
    green:  { en: 'Green',  ko: '\uCD08\uB85D', ja: '\u7DD1' },
    blue:   { en: 'Blue',   ko: '\uD30C\uB791', ja: '\u9752' },
    violet: { en: 'Violet', ko: '\uBCF4\uB77C', ja: '\u7D2B' },
    pink:   { en: 'Pink',   ko: '\uBD84\uD64D', ja: '\u30D4\u30F3\u30AF' },
  }

  deviations.forEach((dev, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    const x = startX + col * colWidth
    const y = startY + row * rowHeight

    const fromName = colorNames[dev.boundary.from]?.[locale] ?? dev.boundary.from
    const toName = colorNames[dev.boundary.to]?.[locale] ?? dev.boundary.to

    // Boundary label
    ctx.fillStyle = COLORS.textSecondary
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${fromName} \u2194 ${toName}`, x, y)

    ctx.fillStyle = COLORS.textPrimary
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(`${Math.round(dev.userHue)}\u00B0`, x, y + 22)

    ctx.fillStyle = COLORS.textMuted
    ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(`/ ${dev.standardHue}\u00B0`, x + 70, y + 30)

    const diff = Math.round(dev.difference)
    const diffStr = diff === 0 ? '\u00B10\u00B0' : diff > 0 ? `+${diff}\u00B0` : `${diff}\u00B0`
    const diffColor = Math.abs(diff) <= 5 ? '#34d399' : Math.abs(diff) <= 15 ? '#fbbf24' : '#f87171'
    ctx.fillStyle = diffColor
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(diffStr, x + 120, y + 28)
  })
}

function drawFooter(ctx: CanvasRenderingContext2D): void {
  // Divider line
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(80, CARD_HEIGHT - 70)
  ctx.lineTo(CARD_WIDTH - 80, CARD_HEIGHT - 70)
  ctx.stroke()

  // URL
  ctx.fillStyle = COLORS.textMuted
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
   ctx.fillText('rwe.kr/spectrumsense', 80, CARD_HEIGHT - 38)

  // Tagline
  ctx.textAlign = 'right'
  ctx.fillText('Discover Your Color Perception Boundaries', CARD_WIDTH - 80, CARD_HEIGHT - 38)
}

/**
 * Trigger a PNG download of the result card.
 * Uses anchor click to force file download (not open in tab).
 */
export function downloadResultCard(canvas: HTMLCanvasElement): void {
  const link = document.createElement('a')
  link.download = 'spectrumsense-result.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}
