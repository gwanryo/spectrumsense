import { BOUNDARIES, normalizeHue, clockwiseSpan, COLOR_ORDER, STANDARD_COLORS } from '../color'
import type { ColorName } from '../types'
import { getColorRegions } from '../result'

export interface SpectrumBarOptions {
  colorLabels?: string[]
  labelUser?: string
  labelReference?: string
}

const DEFAULT_COLOR_LABELS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Pink']
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

/**
 * Render a single user color-boundary bar with standard-color reference markers below.
 * - Top: row label + hue gradient bar with user's boundary lines and region labels
 * - Bottom row: small ▲ arrows at standard color positions with labels
 */
export function renderSpectrumBar(
  canvas: HTMLCanvasElement,
  userBoundaries: number[],
  options: SpectrumBarOptions = {}
): void {
  const {
    colorLabels = DEFAULT_COLOR_LABELS,
    labelUser = 'Your color boundaries',
    labelReference = 'Reference color positions',
  } = options

  const dpr = window.devicePixelRatio || 1
  const W = canvas.clientWidth || 600
  const H = canvas.clientHeight || 150

  canvas.width = W * dpr
  canvas.height = H * dpr

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, W, H)

  // Layout — give more room on narrow screens for staggered labels
  const isNarrow = W < 500
  const rowLabelY = 2             // "당신의 색 경계"
  const barY = 20
  const belowBarSpace = isNarrow ? 62 : 52 // extra space for staggered labels
  const barH = H - barY - belowBarSpace
  const refArrowY = barY + barH + 8  // ▲ arrows below bar
  const refLabelY = refArrowY + 12   // color name labels
  const refRowLabelY = refLabelY + (isNarrow ? 26 : 16) // "기준 색 위치"

  // 1. Row label
  ctx.font = `500 13px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#8e8da6'
  ctx.fillText(labelUser, 2, rowLabelY + 6)

  // 2. User bar
  drawColorBar(ctx, userBoundaries, 0, barY, W, barH, colorLabels)

  // 3. Reference markers below bar (standard color positions)
  drawReferenceMarkers(ctx, W, refLabelY, refArrowY, colorLabels)

  // 4. Reference row label
  ctx.font = `500 13px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#8e8da6'
  ctx.fillText(labelReference, W / 2, refRowLabelY)
}

// ── Reference markers ──

function drawReferenceMarkers(
  ctx: CanvasRenderingContext2D,
  barW: number,
  labelY: number,
  arrowY: number,
  labels: string[],
): void {
  const isNarrow = barW < 500
  const arrowSize = isNarrow ? 3 : 4
  const minInset = isNarrow ? 10 : 14
  const fontSize = isNarrow ? 9 : 11

  for (let i = 0; i < COLOR_ORDER.length; i++) {
    const color = COLOR_ORDER[i] as ColorName
    const hue = STANDARD_COLORS[color]
    const cx = (normalizeHue(hue) / 360) * barW

    // Clamp label position to stay within bounds
    const clampedX = Math.max(minInset, Math.min(barW - minInset, cx))

    // Stagger labels on narrow screens to avoid overlap
    const staggerOffset = isNarrow && i % 2 === 1 ? 11 : 0

    // Color name label
    ctx.font = `500 ${fontSize}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#6b6a85' // --text-muted
    const label = labels[i] ?? DEFAULT_COLOR_LABELS[i]
    ctx.fillText(label, clampedX, labelY + staggerOffset)

    // ▲ arrow (pointing up toward the bar)
    ctx.fillStyle = '#6b6a85'
    ctx.beginPath()
    ctx.moveTo(cx, arrowY)
    ctx.lineTo(cx - arrowSize, arrowY + arrowSize + 1)
    ctx.lineTo(cx + arrowSize, arrowY + arrowSize + 1)
    ctx.closePath()
    ctx.fill()
  }
}

// ── Color bar ──

function drawColorBar(
  ctx: CanvasRenderingContext2D,
  boundaries: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  labels: string[],
): void {
  const regions = getColorRegions(boundaries)
  const radius = 8

  ctx.save()

  // Clip to rounded rect
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.clip()

  // 1. Muted hue spectrum gradient
  const steps = Math.ceil(w)
  for (let i = 0; i < steps; i++) {
    const hue = (i / steps) * 360
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
    ctx.fillRect(x + i, y, 1, h)
  }

  // 2. Dark vignette — blend edges into background
  const vignetteL = ctx.createLinearGradient(x, 0, x + 24, 0)
  vignetteL.addColorStop(0, 'rgba(6, 6, 12, 0.5)')
  vignetteL.addColorStop(1, 'transparent')
  ctx.fillStyle = vignetteL
  ctx.fillRect(x, y, 24, h)

  const vignetteR = ctx.createLinearGradient(x + w - 24, 0, x + w, 0)
  vignetteR.addColorStop(0, 'transparent')
  vignetteR.addColorStop(1, 'rgba(6, 6, 12, 0.5)')
  ctx.fillStyle = vignetteR
  ctx.fillRect(x + w - 24, y, 24, h)

  // 3. Boundary lines
  for (const b of boundaries.map(normalizeHue)) {
    const bx = x + (b / 360) * w
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.60)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(bx, y)
    ctx.lineTo(bx, y + h)
    ctx.stroke()
  }

  ctx.restore()

  // 4. Labels at region centers with dark pill backdrop
  const isNarrowBar = w < 500
  const labelFontSize = isNarrowBar ? 10 : 12
  ctx.font = `500 ${labelFontSize}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const pillPadX = isNarrowBar ? 5 : 7
  const pillPadY = isNarrowBar ? 3 : 4
  const pillRadius = isNarrowBar ? 4 : 5

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]
    const colorIdx = COLOR_ORDER.indexOf(region.name)
    if (colorIdx < 0) continue
    const label = labels[colorIdx] ?? DEFAULT_COLOR_LABELS[colorIdx]

    const span = clockwiseSpan(region.startHue, region.endHue)
    const midHue = normalizeHue(region.startHue + span / 2)
    const midX = x + (midHue / 360) * w
    const segW = (span / 360) * w

    const textW = ctx.measureText(label).width
    const pillW = textW + pillPadX * 2
    if (pillW + 4 > segW) continue

    // Dark pill background
    const pillH = 12 + pillPadY * 2
    const pX = midX - pillW / 2
    const pY = y + (h - pillH) / 2
    ctx.fillStyle = 'rgba(0, 0, 0, 0.50)'
    ctx.beginPath()
    ctx.roundRect(pX, pY, pillW, pillH, pillRadius)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.fillText(label, midX, y + h / 2)
  }
}

/**
 * Compute deviation display data for the spectrum bar.
 * Returns pixel offset for each user boundary relative to standard.
 */
export function computeMarkerOffsets(
  userBoundaries: number[],
  canvasWidth: number
): { userX: number; standardX: number; degreeDiff: number }[] {
  return BOUNDARIES.map((boundary, i) => {
    const userHue = normalizeHue(userBoundaries[i] ?? boundary.standardHue)
    const standardHue = boundary.standardHue
    const userX = (userHue / 360) * canvasWidth
    const standardX = (standardHue / 360) * canvasWidth
    let degreeDiff = userHue - standardHue
    if (degreeDiff > 180) degreeDiff -= 360
    if (degreeDiff < -180) degreeDiff += 360
    return { userX, standardX, degreeDiff }
  })
}
