import type { TestResult, Deviation, Locale } from '../types'
import { normalizeHue, STANDARD_COLORS, getColorHsl, clockwiseSpan, COLOR_ORDER, computeRegionCenter } from '../color'
import { computeDeviations, getColorRegions, summarizeResults } from '../result'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const SUMMARY_CARD_Y = 266
const SUMMARY_CARD_HEIGHT = 42
const SUMMARY_TO_COLOR_SECTION_GAP = 24
const BOUNDARY_ROW_HEIGHT = 116
const BOUNDARY_SECTION_START_Y = SUMMARY_CARD_Y + SUMMARY_CARD_HEIGHT + SUMMARY_TO_COLOR_SECTION_GAP

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

export function generateResultCard(
  result: TestResult,
  locale: Locale = 'en',
  nickname?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT

  const ctx = canvas.getContext('2d')!
  const deviations = computeDeviations(result.boundaries)

  drawBackground(ctx)
  drawHeader(ctx, nickname)
  drawMiniSpectrumBar(ctx, result.boundaries, locale)
  drawSummaryStats(ctx, deviations, locale)
  drawBoundaryStats(ctx, deviations, result.boundaries, locale)
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

function drawHeader(ctx: CanvasRenderingContext2D, nickname?: string): void {
  ctx.fillStyle = COLORS.textPrimary
  ctx.font = `bold 48px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('SpectrumSense', 80, 48)

  ctx.fillStyle = COLORS.accent
  ctx.fillRect(80, 98, 200, 3)

  ctx.fillStyle = COLORS.textSecondary
  ctx.font = `22px ${FONT}`
  ctx.fillText('Color Perception Boundaries', 80, 112)

  if (nickname) {
    const nickFont = `bold 20px ${FONT}`
    ctx.font = nickFont
    const nickW = ctx.measureText(nickname).width
    const pillPadH = 14
    const pillPadV = 6
    const pillW = nickW + pillPadH * 2
    const pillH = 20 + pillPadV * 2
    const pillX = CARD_WIDTH - 80 - pillW
    const pillY = 48
    const pillR = pillH / 2

    ctx.fillStyle = 'rgba(45, 212, 191, 0.12)'
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, pillR)
    ctx.fill()

    ctx.strokeStyle = 'rgba(45, 212, 191, 0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, pillR)
    ctx.stroke()

    ctx.fillStyle = COLORS.accent
    ctx.font = nickFont
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(nickname, pillX + pillW / 2, pillY + pillH / 2)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
  }
}

const CARD_COLOR_LABELS: Record<string, Record<Locale, string>> = {
  red:    { en: 'Red',    ko: '빨강', ja: '赤' },
  orange: { en: 'Orange', ko: '주황', ja: '橙' },
  yellow: { en: 'Yellow', ko: '노랑', ja: '黄' },
  green:  { en: 'Green',  ko: '초록', ja: '緑' },
  blue:   { en: 'Blue',   ko: '파랑', ja: '青' },
  violet: { en: 'Violet', ko: '보라', ja: '紫' },
  pink:   { en: 'Pink',   ko: '분홍', ja: 'ピンク' },
}

const SUMMARY_AVG_LABEL: Record<Locale, string> = {
  en: 'Avg. Deviation',
  ko: '평균 편차',
  ja: '平均偏差',
}

const SUMMARY_MOST_LABEL: Record<Locale, string> = {
  en: 'Largest Shift',
  ko: '최대 편차',
  ja: '最大シフト',
}

function drawMiniSpectrumBar(
  ctx: CanvasRenderingContext2D,
  userBoundaries: number[],
  locale: Locale
): void {
  const barX = 80
  const barW = CARD_WIDTH - 160
  const barH = 50
  const radius = 8

  const barY = 155
  const refArrowY = barY + barH + 10
  const refLabelY = refArrowY + 18

  // Spectrum bar — muted hue gradient in rounded rect
  const regions = getColorRegions(userBoundaries)

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(barX, barY, barW, barH, radius)
  ctx.clip()

  // Muted hue gradient (matching spectrum-bar.ts)
  for (let i = 0; i < barW; i++) {
    const hue = (i / barW) * 360
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
    ctx.fillRect(barX + i, barY, 1, barH)
  }

  // Dark vignette edges
  const vigL = ctx.createLinearGradient(barX, 0, barX + 30, 0)
  vigL.addColorStop(0, 'rgba(6, 6, 12, 0.5)')
  vigL.addColorStop(1, 'transparent')
  ctx.fillStyle = vigL
  ctx.fillRect(barX, barY, 30, barH)

  const vigR = ctx.createLinearGradient(barX + barW - 30, 0, barX + barW, 0)
  vigR.addColorStop(0, 'transparent')
  vigR.addColorStop(1, 'rgba(6, 6, 12, 0.5)')
  ctx.fillStyle = vigR
  ctx.fillRect(barX + barW - 30, barY, 30, barH)

  // Boundary lines on the bar
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.60)'
  ctx.lineWidth = 2
  for (const b of userBoundaries.map(normalizeHue)) {
    const bx = barX + (b / 360) * barW
    ctx.beginPath()
    ctx.moveTo(bx, barY)
    ctx.lineTo(bx, barY + barH)
    ctx.stroke()
  }

  ctx.restore()

  // Region labels inside the bar with dark pill backdrop
  ctx.font = `500 16px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const pillPadX = 10
  const pillPadY = 5
  const pillR = 6

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]
    const colorIdx = COLOR_ORDER.indexOf(region.name)
    if (colorIdx < 0) continue

    const label = CARD_COLOR_LABELS[region.name]?.[locale] ?? region.name
    const span = clockwiseSpan(region.startHue, region.endHue)
    const midHue = normalizeHue(region.startHue + span / 2)
    const midX = barX + (midHue / 360) * barW
    const segW = (span / 360) * barW

    const textW = ctx.measureText(label).width
    const pillW = textW + pillPadX * 2
    if (pillW + 6 > segW) continue

    const pillH = 16 + pillPadY * 2
    const pX = midX - pillW / 2
    const pY = barY + (barH - pillH) / 2
    ctx.fillStyle = 'rgba(0, 0, 0, 0.50)'
    ctx.beginPath()
    ctx.roundRect(pX, pY, pillW, pillH, pillR)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.fillText(label, midX, barY + barH / 2)
  }

  // Reference markers (▲ arrows) below the bar
  const arrowSize = 5
  for (let i = 0; i < COLOR_ORDER.length; i++) {
    const color = COLOR_ORDER[i]
    const hue = STANDARD_COLORS[color]
    const cx = barX + (normalizeHue(hue) / 360) * barW
    const clampedX = Math.max(barX + 20, Math.min(barX + barW - 20, cx))

    // ▲ arrow
    ctx.fillStyle = COLORS.textMuted
    ctx.beginPath()
    ctx.moveTo(cx, refArrowY)
    ctx.lineTo(cx - arrowSize, refArrowY + arrowSize + 1)
    ctx.lineTo(cx + arrowSize, refArrowY + arrowSize + 1)
    ctx.closePath()
    ctx.fill()

    // Color name label
    ctx.font = `500 15px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = COLORS.textMuted
    const refLabel = CARD_COLOR_LABELS[color]?.[locale] ?? color
    ctx.fillText(refLabel, clampedX, refLabelY)
  }

}

function drawSummaryStats(
  ctx: CanvasRenderingContext2D,
  deviations: Deviation[],
  locale: Locale
): void {
  const summary = summarizeResults(deviations)
  const y = SUMMARY_CARD_Y
  const cardX = 80
  const cardW = (CARD_WIDTH - 160 - 16) / 2  // two cards with 16px gap
  const cardH = SUMMARY_CARD_HEIGHT
  const cardR = 8

  const madValue = Math.round(summary.meanAbsoluteDeviation * 10) / 10
  const mostColor = CARD_COLOR_LABELS[summary.mostShifted.color]?.[locale] ?? summary.mostShifted.color
  const mostDiff = Math.round(summary.mostShifted.difference)
  const mostStr = mostDiff > 0 ? `${mostColor} +${mostDiff}\u00B0` : `${mostColor} ${mostDiff}\u00B0`

  const cards: { value: string; label: string; x: number }[] = [
    { value: `${madValue}\u00B0`, label: SUMMARY_AVG_LABEL[locale] ?? SUMMARY_AVG_LABEL.en, x: cardX },
    { value: mostStr, label: SUMMARY_MOST_LABEL[locale] ?? SUMMARY_MOST_LABEL.en, x: cardX + cardW + 16 },
  ]

  for (const card of cards) {
    // Card background
    ctx.fillStyle = COLORS.bgCard
    ctx.beginPath()
    ctx.roundRect(card.x, y, cardW, cardH, cardR)
    ctx.fill()
    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(card.x, y, cardW, cardH, cardR)
    ctx.stroke()

    // Measure to center value + label together
    ctx.font = `bold 22px ${FONT}`
    const valueW = ctx.measureText(card.value).width
    ctx.font = `500 14px ${FONT}`
    const labelW = ctx.measureText(card.label).width
    const gap = 12
    const totalW = valueW + gap + labelW
    const startX = card.x + (cardW - totalW) / 2

    // Value (bold)
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = `bold 22px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(card.value, startX, y + cardH / 2)

    // Label (muted)
    ctx.fillStyle = COLORS.textMuted
    ctx.font = `500 14px ${FONT}`
    ctx.fillText(card.label, startX + valueW + gap, y + cardH / 2)
  }
}

function drawBoundaryStats(
  ctx: CanvasRenderingContext2D,
  deviations: Deviation[],
  userBoundaries: number[],
  locale: Locale
): void {
  const startX = 80
  const startY = BOUNDARY_SECTION_START_Y
  const colWidth = (CARD_WIDTH - 160) / 4
  const rowHeight = BOUNDARY_ROW_HEIGHT

  const regions = getColorRegions(userBoundaries)
  const regionByColor = new Map(regions.map((r, i) => [r.name, i]))

  deviations.forEach((dev, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    const x = startX + col * colWidth
    const y = startY + row * rowHeight

    const colorName = CARD_COLOR_LABELS[dev.color]?.[locale] ?? dev.color

    // Color swatches (standard + user)
    const swR = 11
    const stdCx = x + swR
    const userCx = x + swR * 3 + 10
    const swCy = y + swR + 2
    const standardHsl = getColorHsl(dev.color)

    const regionIdx = regionByColor.get(dev.color)!
    const region = regions[regionIdx]
    const userCenterHue = computeRegionCenter(regionIdx, region.startHue, region.endHue)
    const userHsl = `hsl(${Math.round(userCenterHue)}, 100%, 50%)`

    // Standard color swatch
    ctx.beginPath()
    ctx.arc(stdCx, swCy, swR, 0, Math.PI * 2)
    ctx.fillStyle = standardHsl
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.stroke()

    // User color swatch
    ctx.beginPath()
    ctx.arc(userCx, swCy, swR, 0, Math.PI * 2)
    ctx.fillStyle = userHsl
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Color name
    const textY = y + 30
    ctx.fillStyle = COLORS.textSecondary
    ctx.font = `19px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(colorName, x, textY)

    // User hue value
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = `bold 30px ${FONT}`
    ctx.fillText(`${Math.round(dev.userHue)}\u00B0`, x, textY + 28)

    // Standard hue
    ctx.fillStyle = COLORS.textMuted
    ctx.font = `16px ${FONT}`
    ctx.fillText(`/ ${dev.standardHue}\u00B0`, x + 74, textY + 39)

    // Diff badge
    const diff = Math.round(dev.difference)
    const diffStr = diff === 0 ? '\u00B10\u00B0' : diff > 0 ? `+${diff}\u00B0` : `${diff}\u00B0`
    const diffColor = Math.abs(diff) <= 5 ? '#34d399' : Math.abs(diff) <= 15 ? '#fbbf24' : '#f87171'
    ctx.fillStyle = diffColor
    ctx.font = `bold 20px ${FONT}`
    ctx.fillText(diffStr, x + 138, textY + 37)
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
  ctx.font = `18px ${FONT}`
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
