import type { TestResult, Deviation, Locale } from '../types'
import { BOUNDARIES, normalizeHue } from '../color'
import { computeDeviations } from '../result'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630

// Dark theme colors (matching CSS variables)
const COLORS = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#14141f',
  bgCard: '#1a1a2e',
  textPrimary: '#e8e8f0',
  textSecondary: '#9090a8',
  textMuted: '#606078',
  accent: '#6c5ce7',
  border: '#2a2a3e',
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
  // Main background
  ctx.fillStyle = COLORS.bgPrimary
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Subtle gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT)
  gradient.addColorStop(0, 'rgba(108, 92, 231, 0.05)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Border
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, CARD_WIDTH - 2, CARD_HEIGHT - 2)
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

  // Draw standard boundary markers (dashed)
  for (const boundary of BOUNDARIES) {
    const x = barX + (boundary.standardHue / 360) * barW
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(x, barY)
    ctx.lineTo(x, barY + barH)
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
  const colWidth = (CARD_WIDTH - 160) / 3
  const rowHeight = 80

  const colorNames: Record<string, Record<Locale, string>> = {
    red:    { en: 'Red',    ko: '\uBE68\uAC15', ja: '\u8D64' },
    orange: { en: 'Orange', ko: '\uC8FC\uD669', ja: '\u6A59' },
    yellow: { en: 'Yellow', ko: '\uB178\uB791', ja: '\u9EC4' },
    green:  { en: 'Green',  ko: '\uCD08\uB85D', ja: '\u7DD1' },
    blue:   { en: 'Blue',   ko: '\uD30C\uB791', ja: '\u9752' },
    violet: { en: 'Violet', ko: '\uBCF4\uB77C', ja: '\u7D2B' },
  }

  deviations.forEach((dev, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
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

    // User value
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(`${Math.round(dev.userHue)}\u00B0`, x, y + 22)

    // Deviation
    const diff = Math.round(dev.difference)
    const diffStr = diff === 0 ? '\u00B10\u00B0' : diff > 0 ? `+${diff}\u00B0` : `${diff}\u00B0`
    const diffColor = Math.abs(diff) <= 5 ? '#00b894' : Math.abs(diff) <= 15 ? '#fdcb6e' : '#e17055'
    ctx.fillStyle = diffColor
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(diffStr, x + 70, y + 28)
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
