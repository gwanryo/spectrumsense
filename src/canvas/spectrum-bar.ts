import {
  COLOR_ORDER,
  COLOR_TRANSITIONS,
  STANDARD_COLORS,
  computeRegionCenter,
  getDefaultBoundaryHue,
  normalizeHue,
  clockwiseSpan,
} from '../color'
import type { ColorName } from '../types'
import { getColorRegions } from '../result'
import { createFadeGradient } from './gradient'

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
 * - Middle: 0°..360° hue scale for easier reading
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
  const rowLabelY = 0             // "당신의 색 경계"
  const barY = 40
  const belowBarSpace = isNarrow ? 62 : 52 // extra space for staggered labels
  const barH = H - barY - belowBarSpace
  const hueScaleY = barY - (isNarrow ? 12 : 14)
  const refArrowY = barY + barH + (isNarrow ? 2 : 3)  // ▲ arrows below bar
  const refLabelY = refArrowY + 12   // color name labels
  const refRowLabelY = refLabelY + (isNarrow ? 26 : 16) // "기준 색 위치"

  // 1. Row label
  ctx.font = `500 14px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#a09eb8'
  ctx.fillText(labelUser, 2, rowLabelY)

  // 2. User bar
  drawColorBar(ctx, userBoundaries, 0, barY, W, barH, colorLabels)

  // 3. 0°..360° scale for the user boundary row
  drawHueScale(ctx, 0, barY, W, hueScaleY)

  // 4. Reference markers below bar (standard color positions)
  drawReferenceMarkers(ctx, W, refLabelY, refArrowY, colorLabels)

  // 5. Reference row label
  ctx.font = `500 14px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#a09eb8'
  ctx.fillText(labelReference, W / 2, refRowLabelY)
}

// ── User hue scale ──

function drawHueScale(
  ctx: CanvasRenderingContext2D,
  x: number,
  barY: number,
  w: number,
  labelY: number,
): void {
  const isNarrow = w < 500
  const ticks = isNarrow ? [0, 90, 180, 270, 360] : [0, 60, 120, 180, 240, 300, 360]
  const tickTop = barY - 3
  const tickBottom = barY
  const minInset = isNarrow ? 11 : 14

  ctx.strokeStyle = '#807e99'
  ctx.lineWidth = 1

  ctx.font = `500 ${isNarrow ? 10 : 11}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#807e99'

  for (const tick of ticks) {
    const px = x + (tick / 360) * w
    const clampedX = Math.max(x + minInset, Math.min(x + w - minInset, px))

    ctx.beginPath()
    ctx.moveTo(px, tickTop)
    ctx.lineTo(px, tickBottom)
    ctx.stroke()

    ctx.fillText(`${tick}\u00B0`, clampedX, labelY)
  }
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
  const fontSize = isNarrow ? 10 : 12

  for (let i = 0; i < COLOR_ORDER.length; i++) {
    const color = COLOR_ORDER[i] as ColorName
    const hue = STANDARD_COLORS[color]
    const cx = (normalizeHue(hue) / 360) * barW

    // Clamp label position to stay within bounds
    const clampedX = Math.max(minInset, Math.min(barW - minInset, cx))

    // Stagger labels on narrow screens to avoid overlap
    const staggerOffset = isNarrow && i % 2 === 1 ? 12 : 0

    // Color name label
    ctx.font = `500 ${fontSize}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#807e99'
    const label = labels[i] ?? DEFAULT_COLOR_LABELS[i]
    ctx.fillText(label, clampedX, labelY + staggerOffset)

    // ▲ arrow (pointing up toward the bar)
    ctx.fillStyle = '#807e99'
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

  // 3. Boundary lines (vertical fade for softer look)
  for (const b of boundaries.map(normalizeHue)) {
    const bx = x + (b / 360) * w

    ctx.strokeStyle = createFadeGradient(ctx, 0, y, 0, y + h, 'dark')
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(bx, y)
    ctx.lineTo(bx, y + h)
    ctx.stroke()

    ctx.strokeStyle = createFadeGradient(ctx, 0, y, 0, y + h, 'light')
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(bx, y)
    ctx.lineTo(bx, y + h)
    ctx.stroke()
  }

  ctx.restore()

  // 4. Labels at region centers with dark pill backdrop
  const isNarrowBar = w < 500
  const labelFontSize = isNarrowBar ? 11 : 13
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
    const midHue = computeRegionCenter(region.startHue, region.endHue)
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
 * Returns pixel offset for each user boundary relative to default search midpoint.
 */
export function computeMarkerOffsets(
  userBoundaries: number[],
  canvasWidth: number
): { userX: number; referenceX: number; degreeDiff: number }[] {
  return COLOR_TRANSITIONS.map((_, i) => {
    const userHue = normalizeHue(userBoundaries[i] ?? getDefaultBoundaryHue(i))
    const referenceHue = getDefaultBoundaryHue(i)
    const userX = (userHue / 360) * canvasWidth
    const referenceX = (referenceHue / 360) * canvasWidth
    let degreeDiff = userHue - referenceHue
    if (degreeDiff > 180) degreeDiff -= 360
    if (degreeDiff < -180) degreeDiff += 360
    return { userX, referenceX, degreeDiff }
  })
}
