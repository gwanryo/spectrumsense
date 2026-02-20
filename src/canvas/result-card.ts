import type { TestResult, Deviation, Locale } from '../types'
import { normalizeHue, STANDARD_COLORS, clockwiseSpan, COLOR_ORDER, sampleHueRange, huePositionInRange, getColorHsl } from '../color'
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
  textSecondary: '#a09eb8',
  textMuted: '#807e99',
  accent: '#2dd4bf',
  border: 'rgba(255, 255, 255, 0.10)',
}

export function generateResultCard(
  result: TestResult,
  locale: Locale = 'en'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT

  const ctx = canvas.getContext('2d')!
  const deviations = computeDeviations(result.boundaries)

  drawBackground(ctx)
  drawHeader(ctx)
  drawMiniSpectrumBar(ctx, result.boundaries, locale)
  drawSummaryStats(ctx, deviations, result.boundaries, locale)
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

function drawHeader(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.textPrimary
  ctx.font = `bold 48px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('SpectrumSense', 80, 48)

  ctx.fillStyle = COLORS.accent
  ctx.fillRect(80, 98, 200, 3)

  ctx.fillStyle = COLORS.textSecondary
  ctx.font = `22px ${FONT}`
  ctx.fillText('Color Perception Centers', 80, 112)

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

const YOUR_COLOR_LABEL_TEMPLATE: Record<Locale, string> = {
  en: '{color}',
  ko: '{color}',
  ja: '{color}',
}

const REFERENCE_LABEL: Record<Locale, string> = {
  en: 'Reference',
  ko: '표준',
  ja: '基準',
}

const REFERENCE_OUT_OF_RANGE_LABEL: Record<Locale, string> = {
  en: 'Out of range',
  ko: '범위 밖',
  ja: '範囲外',
}

const VALUE_YOUR_LABEL: Record<Locale, string> = {
  en: 'Your Value',
  ko: '중앙값',
  ja: '中央値',
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
  for (const b of userBoundaries.map(normalizeHue)) {
    const bx = barX + (b / 360) * barW

    ctx.strokeStyle = 'rgba(12, 14, 24, 0.52)'
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.moveTo(bx, barY)
    ctx.lineTo(bx, barY + barH)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.86)'
    ctx.lineWidth = 1.6
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
  userBoundaries: number[],
  locale: Locale
): void {
  const summary = summarizeResults(deviations, userBoundaries)
  const y = SUMMARY_CARD_Y
  const cardX = 80
  const cardW = (CARD_WIDTH - 160 - 16) / 2  // two cards with 16px gap
  const cardH = SUMMARY_CARD_HEIGHT
  const cardR = 8

  const madValue = Math.round(summary.meanAbsoluteDeviation * 10) / 10
  const mostColor = CARD_COLOR_LABELS[summary.mostShifted.color]?.[locale] ?? summary.mostShifted.color
  const mostDiff = Math.round(summary.mostShifted.difference)
  const mostDiffText = mostDiff > 0 ? `+${mostDiff}\u00B0` : `${mostDiff}\u00B0`
  const mostColorHsl = getColorHsl(summary.mostShifted.color)

  const avgLabel = SUMMARY_AVG_LABEL[locale] ?? SUMMARY_AVG_LABEL.en
  const mostLabel = SUMMARY_MOST_LABEL[locale] ?? SUMMARY_MOST_LABEL.en

  const cards = [
    { kind: 'avg' as const, x: cardX },
    { kind: 'most' as const, x: cardX + cardW + 16 },
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

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    if (card.kind === 'avg') {
      const valueText = `${madValue}\u00B0`
      ctx.font = `bold 22px ${FONT}`
      const valueW = ctx.measureText(valueText).width
      ctx.font = `500 15px ${FONT}`
      const labelW = ctx.measureText(avgLabel).width
      const gap = 12
      const totalW = valueW + gap + labelW
      const startX = card.x + (cardW - totalW) / 2

      ctx.fillStyle = COLORS.textPrimary
      ctx.font = `bold 22px ${FONT}`
      ctx.fillText(valueText, startX, y + cardH / 2)

      ctx.fillStyle = COLORS.textMuted
      ctx.font = `500 15px ${FONT}`
      ctx.fillText(avgLabel, startX + valueW + gap, y + cardH / 2)
      continue
    }

    // Most-shift card: color name tinted by the actual color
    const colorText = mostColor
    const diffText = ` ${mostDiffText}`
    ctx.font = `bold 22px ${FONT}`
    const colorW = ctx.measureText(colorText).width
    const diffW = ctx.measureText(diffText).width
    ctx.font = `500 15px ${FONT}`
    const labelW = ctx.measureText(mostLabel).width
    const gap = 12
    const totalW = colorW + diffW + gap + labelW
    const startX = card.x + (cardW - totalW) / 2

    ctx.font = `bold 22px ${FONT}`
    ctx.fillStyle = mostColorHsl
    ctx.fillText(colorText, startX, y + cardH / 2)

    ctx.fillStyle = COLORS.textPrimary
    ctx.fillText(diffText, startX + colorW, y + cardH / 2)

    ctx.fillStyle = COLORS.textMuted
    ctx.font = `500 15px ${FONT}`
    ctx.fillText(mostLabel, startX + colorW + diffW + gap, y + cardH / 2)
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
    const yourColorLabel = formatYourColorLabel(colorName, locale)
    const referenceLabel = REFERENCE_LABEL[locale] ?? REFERENCE_LABEL.en
    const outOfRangeLabel = REFERENCE_OUT_OF_RANGE_LABEL[locale] ?? REFERENCE_OUT_OF_RANGE_LABEL.en
    const valueYourLabel = VALUE_YOUR_LABEL[locale] ?? VALUE_YOUR_LABEL.en

    // Single full-width user swatch with optional reference marker
    const swX = x + 2
    const swW = colWidth - 8
    const swH = 48
    const swRadius = 6
    const swY = y + 18

    const regionIdx = regionByColor.get(dev.color)!
    const region = regions[regionIdx]
    const userHues = sampleHueRange(region.startHue, region.endHue, 7)
    const userGradient = ctx.createLinearGradient(swX, swY + swH / 2, swX + swW, swY + swH / 2)
    const stopDenominator = Math.max(1, userHues.length - 1)
    for (let stopIdx = 0; stopIdx < userHues.length; stopIdx++) {
      const stopHue = userHues[stopIdx]
      userGradient.addColorStop(stopIdx / stopDenominator, `hsl(${Math.round(stopHue)}, 100%, 50%)`)
    }

    // Top row labels
    ctx.font = `500 14px ${FONT}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = COLORS.textMuted
    ctx.fillText(yourColorLabel, swX, y + 8)

    const markerRatio = huePositionInRange(dev.referenceHue, region.startHue, region.endHue)
    const hasReferenceMarker = markerRatio !== null
    if (!hasReferenceMarker) {
      ctx.textAlign = 'right'
      ctx.fillText(outOfRangeLabel, swX + swW, y + 8)
      ctx.textAlign = 'left'
    }

    // User swatch
    ctx.beginPath()
    ctx.roundRect(swX, swY, swW, swH, swRadius)
    ctx.fillStyle = userGradient
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.stroke()

    if (hasReferenceMarker) {
      const markerX = swX + (markerRatio * swW)
      const markerColor = 'rgba(255, 255, 255, 0.98)'

      // Top downward triangle
      ctx.fillStyle = markerColor
      ctx.beginPath()
      ctx.moveTo(markerX, swY + 9)
      ctx.lineTo(markerX - 6, swY)
      ctx.lineTo(markerX + 6, swY)
      ctx.closePath()
      ctx.fill()

      // Bottom upward triangle
      ctx.beginPath()
      ctx.moveTo(markerX, swY + swH - 9)
      ctx.lineTo(markerX - 6, swY + swH)
      ctx.lineTo(markerX + 6, swY + swH)
      ctx.closePath()
      ctx.fill()

      // Label centered between triangles
      ctx.font = `700 12px ${FONT}`
      const refLabelW = ctx.measureText(referenceLabel).width
      const pillPadX = 5
      const pillPadY = 2
      const pillW = refLabelW + pillPadX * 2
      const pillH = 12 + pillPadY * 2
      const pillX = markerX - (pillW / 2)
      const pillY = swY + (swH - pillH) / 2

      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)'
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, 4)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(referenceLabel, markerX, swY + swH / 2)
      ctx.textAlign = 'left'
    }

    // Values area
    const textY = swY + swH + 6

    ctx.fillStyle = COLORS.textSecondary
    ctx.font = `16px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(colorName, x, textY)

    ctx.fillStyle = COLORS.textMuted
    ctx.font = `13px ${FONT}`
    ctx.fillText(`/${dev.referenceHue}\u00B0`, x + 64, textY + 1)

    ctx.fillStyle = COLORS.textPrimary
    ctx.font = `bold 22px ${FONT}`
    ctx.fillText(`${Math.round(dev.userHue)}\u00B0`, x, textY + 14)

    ctx.fillStyle = COLORS.textMuted
    ctx.font = `12px ${FONT}`
    ctx.fillText(valueYourLabel, x + 66, textY + 21)

    // Diff badge
    const diff = Math.round(dev.difference)
    const diffStr = diff === 0 ? '\u00B10\u00B0' : diff > 0 ? `+${diff}\u00B0` : `${diff}\u00B0`
    const diffColor = Math.abs(diff) <= 5 ? '#34d399' : Math.abs(diff) <= 15 ? '#fbbf24' : '#f87171'
    ctx.fillStyle = diffColor
    ctx.font = `bold 16px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText(diffStr, swX + swW, textY + 22)
    ctx.textAlign = 'left'
  })
}

function formatYourColorLabel(colorName: string, locale: Locale): string {
  const template = YOUR_COLOR_LABEL_TEMPLATE[locale] ?? YOUR_COLOR_LABEL_TEMPLATE.en
  return template.replace('{color}', colorName)
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
  ctx.fillText('Discover Your Color Perception Centers', CARD_WIDTH - 80, CARD_HEIGHT - 38)
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
