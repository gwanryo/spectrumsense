import type { TestResult, Deviation, Locale } from '../types'
import {
  normalizeHue,
  STANDARD_COLORS,
  clockwiseSpan,
  COLOR_ORDER,
  sampleHueRange,
  huePositionInRange,
  getColorHsl,
} from '../color'
import { computeDeviations, getColorRegions, summarizeResults } from '../result'
import { createFadeGradient } from './gradient'
import en from '../i18n/en.json'
import ko from '../i18n/ko.json'
import ja from '../i18n/ja.json'

// ── Card dimensions ──
const W = 1200
const PAD = 72
const CW = W - PAD * 2

// ── Typography — use the site's loaded web fonts with system fallbacks ──
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif"
const SANS = "'Outfit', 'Noto Sans KR', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const MONO = "'JetBrains Mono', 'Noto Sans KR', 'Noto Sans JP', 'SF Mono', Consolas, monospace"

// ── Palette (dark theme matching CSS variables) ──
const C = {
  bg: '#08080f',
  card: '#111120',
  text: '#e8e6f0',
  sub: '#a09eb8',
  muted: '#807e99',
  accent: '#2dd4bf',
  border: 'rgba(255, 255, 255, 0.08)',
}

// ── Grid layout for boundary details ──
const GRID_COLS = 4
const GRID_GAP = 16
const CARD_PAD = 10
const CELL_W = Math.floor((CW - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS)
const SWATCH_H = 96
const CELL_H = 220
const GRID_ROW_GAP = 20

const DEFAULT_DOWNLOAD_FILENAME = 'spectrumsense-result.png'
const LOCALE_MESSAGES: Record<Locale, Record<string, string>> = { en, ko, ja }

// ── Public types ──

export interface ResultCardOptions {
  filename?: string
  nickname?: string
}

export interface ResultCardDownloadDeps {
  generateCard?: (result: TestResult, locale: Locale, options?: ResultCardOptions) => HTMLCanvasElement
  downloadCard?: (canvas: HTMLCanvasElement, filename?: string) => void
}

// ── Height computation ──

function computeCardHeight(deviationCount: number, locale: Locale, nickname: string): number {
  const m = document.createElement('canvas').getContext('2d')!
  const title = nickname
    ? tl(locale, 'results.title_with_nickname', { nickname })
    : tl(locale, 'results.title')
  let titleSize = 52
  while (titleSize > 36) {
    m.font = `400 ${titleSize}px ${SERIF}`
    if (m.measureText(title).width <= CW) break
    titleSize -= 2
  }

  let y = 88
  y += titleSize + 14 + 20 + 30   // header
  y += 52                           // gap
  y += 30 + 88 + 14 + 36 + 24      // spectrum section
  y += 52                           // gap
  y += 84                           // summary stats
  y += 56                           // gap
  const rows = Math.ceil(deviationCount / GRID_COLS)
  y += rows * CELL_H + (rows - 1) * GRID_ROW_GAP
  y += 48 + 80                      // footer gap + footer
  return y
}

// ── Main entry ──

export function generateResultCard(
  result: TestResult,
  locale: Locale = 'en',
  options: ResultCardOptions = {},
): HTMLCanvasElement {
  const deviations = computeDeviations(result.boundaries)
  const regions = getColorRegions(result.boundaries)
  const nick = (options.nickname ?? '').trim()

  const h = computeCardHeight(deviations.length, locale, nick)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = h

  const ctx = canvas.getContext('2d')!
  drawBackground(ctx, h)

  let y = 88
  y = drawHeader(ctx, locale, nick, y)
  y += 52
  y = drawSpectrumSection(ctx, result.boundaries, regions, locale, y)
  y += 52
  y = drawSummaryStats(ctx, deviations, result.boundaries, locale, y)
  y += 56
  y = drawBoundaryGrid(ctx, deviations, regions, locale, y)
  drawFooter(ctx, locale, y + 48)

  return canvas
}

// ── Background ──

function drawBackground(ctx: CanvasRenderingContext2D, h: number): void {
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, h)

  const grad = ctx.createLinearGradient(0, 0, W, h)
  grad.addColorStop(0, 'rgba(45, 212, 191, 0.05)')
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  grad.addColorStop(1, 'rgba(45, 212, 191, 0.02)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, h)

  ctx.strokeStyle = C.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(0, 0, W, h, 16)
  ctx.stroke()
}

// ── Header ──

function drawHeader(
  ctx: CanvasRenderingContext2D,
  locale: Locale,
  nickname: string,
  y: number,
): number {
  const title = nickname
    ? tl(locale, 'results.title_with_nickname', { nickname })
    : tl(locale, 'results.title')
  const subtitle = tl(locale, 'results.subtitle')

  // Title — auto-shrink for long nicknames
  let titleSize = 52
  while (titleSize > 36) {
    ctx.font = `400 ${titleSize}px ${SERIF}`
    if (ctx.measureText(title).width <= CW) break
    titleSize -= 2
  }

  ctx.fillStyle = C.text
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = `400 ${titleSize}px ${SERIF}`
  ctx.fillText(title, PAD, y)
  y += titleSize + 14

  // Accent underline
  ctx.fillStyle = C.accent
  ctx.fillRect(PAD, y, 180, 3)
  y += 20

  // Subtitle
  ctx.fillStyle = C.sub
  ctx.font = `300 24px ${SANS}`
  ctx.fillText(subtitle, PAD, y)
  y += 30

  return y
}

// ── Spectrum bar section ──

function drawSpectrumSection(
  ctx: CanvasRenderingContext2D,
  userBoundaries: number[],
  regions: ReturnType<typeof getColorRegions>,
  locale: Locale,
  y: number,
): number {
  const barX = PAD
  const barW = CW
  const barH = 88
  const barR = 8

  // Top legend
  ctx.font = `500 18px ${SANS}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = C.muted
  ctx.fillText(tl(locale, 'results.legend_user'), barX, y)
  y += 30

  // ── Bar ──
  const barY = y
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(barX, barY, barW, barH, barR)
  ctx.clip()

  // Full hue gradient
  for (let i = 0; i < barW; i++) {
    ctx.fillStyle = `hsl(${(i / barW) * 360}, 100%, 50%)`
    ctx.fillRect(barX + i, barY, 1, barH)
  }

  // Vignette edges
  const vigL = ctx.createLinearGradient(barX, 0, barX + 28, 0)
  vigL.addColorStop(0, 'rgba(8, 8, 15, 0.5)')
  vigL.addColorStop(1, 'transparent')
  ctx.fillStyle = vigL
  ctx.fillRect(barX, barY, 28, barH)

  const vigR = ctx.createLinearGradient(barX + barW - 28, 0, barX + barW, 0)
  vigR.addColorStop(0, 'transparent')
  vigR.addColorStop(1, 'rgba(8, 8, 15, 0.5)')
  ctx.fillStyle = vigR
  ctx.fillRect(barX + barW - 28, barY, 28, barH)

  // User boundary lines (dual-stroke fade)
  for (const b of userBoundaries.map(normalizeHue)) {
    const bx = barX + (b / 360) * barW

    ctx.strokeStyle = createFadeGradient(ctx, 0, barY, 0, barY + barH, 'dark')
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(bx, barY)
    ctx.lineTo(bx, barY + barH)
    ctx.stroke()

    ctx.strokeStyle = createFadeGradient(ctx, 0, barY, 0, barY + barH, 'light')
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(bx, barY)
    ctx.lineTo(bx, barY + barH)
    ctx.stroke()
  }

  ctx.restore()

  // Region labels inside bar (dark pill backdrop)
  ctx.font = `500 18px ${SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const region of regions) {
    const colorIdx = COLOR_ORDER.indexOf(region.name)
    if (colorIdx < 0) continue

    const label = colorLabel(locale, region.name)
    const span = clockwiseSpan(region.startHue, region.endHue)
    const mid = normalizeHue(region.startHue + span / 2)
    const midX = barX + (mid / 360) * barW
    const segW = (span / 360) * barW

    const tw = ctx.measureText(label).width
    const pillW = tw + 20
    if (pillW + 6 > segW) continue

    const pillH = 28
    ctx.fillStyle = 'rgba(0, 0, 0, 0.50)'
    ctx.beginPath()
    ctx.roundRect(midX - pillW / 2, barY + (barH - pillH) / 2, pillW, pillH, 5)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.fillText(label, midX, barY + barH / 2)
  }

  y = barY + barH + 14

  const arrowSize = 6
  const refFontSize = 15
  for (let i = 0; i < COLOR_ORDER.length; i++) {
    const color = COLOR_ORDER[i]
    const hue = STANDARD_COLORS[color]
    const cx = barX + (normalizeHue(hue) / 360) * barW
    const clampedX = Math.max(barX + 16, Math.min(barX + barW - 16, cx))

    ctx.fillStyle = C.muted
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(cx - arrowSize, y + arrowSize + 1)
    ctx.lineTo(cx + arrowSize, y + arrowSize + 1)
    ctx.closePath()
    ctx.fill()

    ctx.font = `500 ${refFontSize}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = C.muted
    ctx.fillText(colorLabel(locale, color), clampedX, y + arrowSize + 5)
  }

  y += arrowSize + 5 + refFontSize + 10

  // Bottom legend
  ctx.font = `500 18px ${SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = C.muted
  ctx.fillText(tl(locale, 'results.legend_reference'), W / 2, y)
  y += 24

  return y
}

// ── Summary stats (two side-by-side cards) ──

function drawSummaryStats(
  ctx: CanvasRenderingContext2D,
  deviations: Deviation[],
  userBoundaries: number[],
  locale: Locale,
  y: number,
): number {
  const summary = summarizeResults(deviations, userBoundaries)
  const cardGap = 20
  const cardW = (CW - cardGap) / 2
  const cardH = 84
  const cardR = 10

  const madValue = Math.round(summary.meanAbsoluteDeviation * 10) / 10
  const mostColor = colorLabel(locale, summary.mostShifted.color)
  const mostDiff = Math.round(summary.mostShifted.difference)
  const mostDiffStr = mostDiff > 0 ? `+${mostDiff}\u00B0` : `${mostDiff}\u00B0`
  const mostHsl = getColorHsl(summary.mostShifted.color)

  const avgLabel = tl(locale, 'results.summary_avg')
  const mostLabel = tl(locale, 'results.summary_most_shifted')

  // Draw both card backgrounds
  for (const cx of [PAD, PAD + cardW + cardGap]) {
    ctx.fillStyle = C.card
    ctx.beginPath()
    ctx.roundRect(cx, y, cardW, cardH, cardR)
    ctx.fill()
    ctx.strokeStyle = C.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(cx, y, cardW, cardH, cardR)
    ctx.stroke()
  }

  // Card 1: Average deviation
  {
    const cx = PAD
    const valueText = `${madValue}\u00B0`
    const gap = 14
    const maxInner = cardW - 40
    let size = 30
    while (size > 18) {
      ctx.font = `700 ${size}px ${MONO}`
      const vw = ctx.measureText(valueText).width
      const labelSize = Math.round(size * 0.68)
      ctx.font = `500 ${labelSize}px ${SANS}`
      const lw = ctx.measureText(avgLabel).width
      if (vw + gap + lw <= maxInner) break
      size--
    }

    ctx.font = `700 ${size}px ${MONO}`
    const vw = ctx.measureText(valueText).width
    const labelSize = Math.round(size * 0.68)
    ctx.font = `500 ${labelSize}px ${SANS}`
    const lw = ctx.measureText(avgLabel).width
    const totalW = vw + gap + lw
    const startX = cx + (cardW - totalW) / 2

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = C.text
    ctx.font = `700 ${size}px ${MONO}`
    ctx.fillText(valueText, startX, y + cardH / 2)

    ctx.fillStyle = C.muted
    ctx.font = `500 ${labelSize}px ${SANS}`
    ctx.fillText(avgLabel, startX + vw + gap, y + cardH / 2)
  }

  // Card 2: Most shifted color
  {
    const cx = PAD + cardW + cardGap
    const gap1 = 6
    const gap2 = 14
    const maxInner = cardW - 40
    let size = 30
    while (size > 18) {
      ctx.font = `700 ${size}px ${SANS}`
      const cw = ctx.measureText(mostColor).width
      ctx.font = `700 ${size}px ${MONO}`
      const dw = ctx.measureText(mostDiffStr).width
      const labelSize = Math.round(size * 0.68)
      ctx.font = `500 ${labelSize}px ${SANS}`
      const lw = ctx.measureText(mostLabel).width
      if (cw + gap1 + dw + gap2 + lw <= maxInner) break
      size--
    }

    ctx.font = `700 ${size}px ${SANS}`
    const cw = ctx.measureText(mostColor).width
    ctx.font = `700 ${size}px ${MONO}`
    const dw = ctx.measureText(mostDiffStr).width
    const labelSize = Math.round(size * 0.68)
    ctx.font = `500 ${labelSize}px ${SANS}`
    const lw = ctx.measureText(mostLabel).width
    const totalW = cw + gap1 + dw + gap2 + lw
    const startX = cx + (cardW - totalW) / 2

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const midY = y + cardH / 2

    ctx.fillStyle = mostHsl
    ctx.font = `700 ${size}px ${SANS}`
    ctx.fillText(mostColor, startX, midY)

    ctx.fillStyle = C.text
    ctx.font = `700 ${size}px ${MONO}`
    ctx.fillText(mostDiffStr, startX + cw + gap1, midY)

    ctx.fillStyle = C.muted
    ctx.font = `500 ${labelSize}px ${SANS}`
    ctx.fillText(mostLabel, startX + cw + gap1 + dw + gap2, midY)
  }

  return y + cardH
}

// ── Boundary detail grid ──

function drawBoundaryGrid(
  ctx: CanvasRenderingContext2D,
  deviations: Deviation[],
  regions: ReturnType<typeof getColorRegions>,
  locale: Locale,
  y: number,
): number {
  const regionByColor = new Map(regions.map((r, i) => [r.name, i]))

  deviations.forEach((dev, i) => {
    const row = i < GRID_COLS ? 0 : 1
    const col = row === 0 ? i : i - GRID_COLS

    let cellX: number
    if (row === 0) {
      cellX = PAD + col * (CELL_W + GRID_GAP)
    } else {
      // Center the remaining items in the second row
      const count = deviations.length - GRID_COLS
      const rowW = count * CELL_W + (count - 1) * GRID_GAP
      cellX = PAD + (CW - rowW) / 2 + col * (CELL_W + GRID_GAP)
    }

    const cellY = y + row * (CELL_H + GRID_ROW_GAP)
    drawBoundaryCell(ctx, dev, regions, regionByColor, locale, cellX, cellY)
  })

  const totalRows = Math.ceil(deviations.length / GRID_COLS)
  return y + totalRows * CELL_H + (totalRows - 1) * GRID_ROW_GAP
}

// ── Single boundary cell ──

function drawBoundaryCell(
  ctx: CanvasRenderingContext2D,
  dev: Deviation,
  regions: ReturnType<typeof getColorRegions>,
  regionByColor: Map<string, number>,
  locale: Locale,
  x: number,
  y: number,
): void {
  const w = CELL_W
  const innerX = x + CARD_PAD
  const innerW = w - 2 * CARD_PAD
  const colorName = colorLabel(locale, dev.color)
  const yourLabel = tl(locale, 'results.your_color', { color: colorName })
  const refLabel = tl(locale, 'results.typical_value')
  const measLabel = tl(locale, 'results.measured_value')
  const outOfRangeLabel = tl(locale, 'results.reference_out_of_range')

  const regionIdx = regionByColor.get(dev.color)!
  const region = regions[regionIdx]
  const userHues = sampleHueRange(region.startHue, region.endHue, 7)

  const refPosition = huePositionInRange(dev.referenceHue, region.startHue, region.endHue)
  const hasRef = refPosition !== null

  ctx.fillStyle = C.card
  ctx.beginPath()
  ctx.roundRect(x, y, w, CELL_H, 8)
  ctx.fill()
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, w, CELL_H, 8)
  ctx.stroke()

  let cy = y + CARD_PAD

  ctx.font = `500 16px ${SANS}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = C.sub
  ctx.fillText(yourLabel, innerX, cy, innerW * 0.62)

  if (!hasRef) {
    const outSize = shrinkFont(ctx, outOfRangeLabel, '500', SANS, innerW * 0.34, 12, 9)
    ctx.font = `500 ${outSize}px ${SANS}`
    const otw = ctx.measureText(outOfRangeLabel).width
    const opx = 6
    const opy = 3
    const obw = otw + opx * 2
    const obh = outSize + opy * 2
    const obx = innerX + innerW - obw
    const oby = cy + 1

    ctx.fillStyle = 'rgba(251, 191, 36, 0.10)'
    ctx.beginPath()
    ctx.roundRect(obx, oby, obw, obh, 3)
    ctx.fill()

    ctx.fillStyle = '#fbbf24'
    ctx.font = `500 ${outSize}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(outOfRangeLabel, obx + obw / 2, oby + opy)
    ctx.textAlign = 'left'
  }

  cy += 22

  const swY = cy
  const swH = SWATCH_H
  const grad = ctx.createLinearGradient(innerX, 0, innerX + innerW, 0)
  const stopDenom = Math.max(1, userHues.length - 1)
  userHues.forEach((h, i) => {
    grad.addColorStop(i / stopDenom, `hsl(${Math.round(h)}, 100%, 50%)`)
  })

  ctx.beginPath()
  ctx.roundRect(innerX, swY, innerW, swH, 6)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.lineWidth = 1
  ctx.stroke()

  if (hasRef) {
    const mx = innerX + refPosition * innerW
    const refShort = tl(locale, 'results.reference_short')

    const pillSize = shrinkFont(ctx, refShort, '700', SANS, innerW * 0.32, 14, 10)
    ctx.font = `700 ${pillSize}px ${SANS}`
    const refLW = ctx.measureText(refShort).width
    const pPadX = 7
    const pPadY = 5
    const pW = refLW + pPadX * 2
    const pH = pillSize + pPadY * 2
    const pX = Math.max(innerX + 2, Math.min(innerX + innerW - pW - 2, mx - pW / 2))
    const pY = swY + (swH - pH) / 2

    const lineTop = swY + 1
    const lineBot = swY + swH - 1
    const gapPad = 1.5
    const topEnd = Math.max(lineTop, pY - gapPad)
    const botStart = Math.min(lineBot, pY + pH + gapPad)

    ctx.save()
    ctx.lineCap = 'round'

    if (topEnd - lineTop > 1) {
      ctx.strokeStyle = createFadeGradient(ctx, mx, lineTop, mx, topEnd, 'dark')
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(mx, lineTop)
      ctx.lineTo(mx, topEnd)
      ctx.stroke()

      ctx.strokeStyle = createFadeGradient(ctx, mx, lineTop, mx, topEnd, 'light')
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(mx, lineTop)
      ctx.lineTo(mx, topEnd)
      ctx.stroke()
    }

    if (lineBot - botStart > 1) {
      ctx.strokeStyle = createFadeGradient(ctx, mx, botStart, mx, lineBot, 'dark')
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(mx, botStart)
      ctx.lineTo(mx, lineBot)
      ctx.stroke()

      ctx.strokeStyle = createFadeGradient(ctx, mx, botStart, mx, lineBot, 'light')
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(mx, botStart)
      ctx.lineTo(mx, lineBot)
      ctx.stroke()
    }

    ctx.restore()

    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
    ctx.beginPath()
    ctx.roundRect(pX, pY, pW, pH, 3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(refShort, pX + pW / 2, swY + swH / 2)
    ctx.textAlign = 'left'
  }

  cy = swY + swH + 10

  const valSize = 15

  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillStyle = C.sub
  ctx.font = `400 ${valSize}px ${SANS}`
  ctx.fillText(refLabel, innerX, cy)

  ctx.textAlign = 'right'
  ctx.fillStyle = C.sub
  ctx.font = `400 ${valSize}px ${MONO}`
  ctx.fillText(`${dev.referenceHue}\u00B0`, innerX + innerW, cy)

  cy += valSize + 6

  ctx.textAlign = 'left'
  ctx.fillStyle = C.sub
  ctx.font = `400 ${valSize}px ${SANS}`
  ctx.fillText(measLabel, innerX, cy)

  ctx.textAlign = 'right'
  ctx.fillStyle = C.text
  ctx.font = `600 ${valSize}px ${MONO}`
  ctx.fillText(`${Math.round(dev.userHue)}\u00B0`, innerX + innerW, cy)

  cy += valSize + 10

  const diff = Math.round(dev.difference)
  const diffStr = diff === 0 ? '\u00B10\u00B0' : diff > 0 ? `+${diff}\u00B0` : `${diff}\u00B0`
  const diffColor = Math.abs(diff) <= 5 ? '#34d399' : Math.abs(diff) <= 15 ? '#fbbf24' : '#f87171'
  const diffBg = Math.abs(diff) <= 5
    ? 'rgba(52, 211, 153, 0.10)'
    : Math.abs(diff) <= 15
      ? 'rgba(251, 191, 36, 0.10)'
      : 'rgba(248, 113, 113, 0.10)'

  const diffFontSize = valSize + 1
  ctx.font = `700 ${diffFontSize}px ${MONO}`
  const dtw = ctx.measureText(diffStr).width
  const dpx = 8
  const dpy = 4
  const dbw = dtw + dpx * 2
  const dbh = diffFontSize + dpy * 2
  const dbx = innerX + innerW - dbw
  const dby = cy - dpy

  ctx.fillStyle = diffBg
  ctx.beginPath()
  ctx.roundRect(dbx, dby, dbw, dbh, 4)
  ctx.fill()

  ctx.fillStyle = diffColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(diffStr, dbx + dbw / 2, cy)
  ctx.textAlign = 'left'
}

// ── Footer ──

function drawFooter(ctx: CanvasRenderingContext2D, locale: Locale, startY: number): void {
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(PAD, startY)
  ctx.lineTo(W - PAD, startY)
  ctx.stroke()

  const textY = startY + 44
  ctx.fillStyle = C.muted
  ctx.font = `400 22px ${SANS}`
  ctx.textBaseline = 'middle'

  ctx.textAlign = 'left'
  ctx.fillText('rwe.kr/spectrumsense', PAD, textY)

  ctx.textAlign = 'right'
  ctx.fillText(tl(locale, 'results.citation'), W - PAD, textY)
}

// ── Utilities ──

function tl(
  locale: Locale,
  key: string,
  vars: Record<string, string> = {},
): string {
  const dict = LOCALE_MESSAGES[locale] ?? LOCALE_MESSAGES.en
  const template = dict[key] ?? key
  return Object.entries(vars).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, value),
    template,
  )
}

function colorLabel(locale: Locale, color: string): string {
  return tl(locale, `colors.${color}`)
}

function shrinkFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: string,
  family: string,
  maxW: number,
  preferred: number,
  min: number,
): number {
  let s = preferred
  while (s > min) {
    ctx.font = `${weight} ${s}px ${family}`
    if (ctx.measureText(text).width <= maxW) break
    s--
  }
  return s
}

// ── Download ──

/**
 * Trigger a PNG download of the result card.
 */
export function downloadResultCard(
  canvas: HTMLCanvasElement,
  filename: string = DEFAULT_DOWNLOAD_FILENAME,
): void {
  const link = document.createElement('a')
  link.download = forceExtension(filename, 'png')
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/**
 * Generate and download a result card.
 * Awaits font loading to ensure web fonts are available for canvas rendering.
 */
export async function downloadGeneratedResultCard(
  result: TestResult,
  locale: Locale = 'en',
  options: ResultCardOptions = {},
  deps: ResultCardDownloadDeps = {},
): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready
  }

  const filename = options.filename ?? DEFAULT_DOWNLOAD_FILENAME
  const generateCard = deps.generateCard ?? generateResultCard
  const downloadCard = deps.downloadCard ?? downloadResultCard
  const canvas = generateCard(result, locale, options)
  downloadCard(canvas, filename)
}

function forceExtension(filename: string, extension: 'png'): string {
  const base = filename.replace(/\.(png|svg)$/i, '')
  return `${base}.${extension}`
}
