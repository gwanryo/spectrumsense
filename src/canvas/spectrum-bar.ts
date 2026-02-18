import { BOUNDARIES, normalizeHue, circularMidpoint } from '../color'

export interface SpectrumBarOptions {
  colorLabels?: string[]
  showLabels?: boolean
  barHeight?: number
}

const DEFAULT_COLOR_LABELS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Pink']

/**
 * Render a linear spectrum bar onto a canvas element.
 * Shows user's boundary markers vs standard boundary markers.
 * Applies devicePixelRatio for crisp retina rendering.
 */
export function renderSpectrumBar(
  canvas: HTMLCanvasElement,
  userBoundaries: number[],
  options: SpectrumBarOptions = {}
): void {
  const {
    colorLabels = DEFAULT_COLOR_LABELS,
    showLabels = true,
    barHeight = 40,
  } = options

  const dpr = window.devicePixelRatio || 1
  const logicalWidth = canvas.clientWidth || 600
  const logicalHeight = canvas.clientHeight || 140

  canvas.width = logicalWidth * dpr
  canvas.height = logicalHeight * dpr

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, logicalWidth, logicalHeight)

  const barY = 40
  const barW = logicalWidth
  const barH = barHeight

  drawSpectrumGradient(ctx, 0, barY, barW, barH)

  const standardHues = BOUNDARIES.map(b => b.standardHue)
  drawBoundaryMarkers(ctx, standardHues, barY, barH, barW, {
    color: 'rgba(45, 212, 191, 0.7)',
    lineWidth: 2,
    dashed: true,
    markerHeight: 10,
    position: 'below',
  })

  drawBoundaryMarkers(ctx, userBoundaries, barY, barH, barW, {
    color: '#ffffff',
    lineWidth: 2.5,
    dashed: false,
    markerHeight: 12,
    position: 'above',
  })

  if (showLabels) {
    drawColorLabels(ctx, userBoundaries, barY, barH, barW, colorLabels)
  }

  drawLegend(ctx, logicalWidth, logicalHeight)
}

function drawSpectrumGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const steps = Math.ceil(width)
  for (let i = 0; i < steps; i++) {
    const hue = (i / steps) * 360
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
    ctx.fillRect(x + i, y, 1, height)
  }

  ctx.save()
  const radius = 6
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.restore()
}

interface MarkerOptions {
  color: string
  lineWidth: number
  dashed: boolean
  markerHeight: number
  position: 'above' | 'below'
}

function drawBoundaryMarkers(
  ctx: CanvasRenderingContext2D,
  hues: number[],
  barY: number,
  barH: number,
  barW: number,
  opts: MarkerOptions
): void {
  ctx.save()
  ctx.strokeStyle = opts.color
  ctx.lineWidth = opts.lineWidth

  if (opts.dashed) {
    ctx.setLineDash([3, 3])
  } else {
    ctx.setLineDash([])
  }

  for (const hue of hues) {
    const x = (normalizeHue(hue) / 360) * barW

    if (opts.position === 'above') {
      ctx.beginPath()
      ctx.moveTo(x, barY - 2)
      ctx.lineTo(x - 5, barY - opts.markerHeight)
      ctx.lineTo(x + 5, barY - opts.markerHeight)
      ctx.closePath()
      ctx.fillStyle = opts.color
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(x, barY)
      ctx.lineTo(x, barY + barH)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(x, barY)
      ctx.lineTo(x, barY + barH)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(x, barY + barH)
      ctx.lineTo(x, barY + barH + opts.markerHeight)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawColorLabels(
  ctx: CanvasRenderingContext2D,
  userBoundaries: number[],
  barY: number,
  barH: number,
  barW: number,
  labels: string[]
): void {
  ctx.save()
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const N = labels.length
  const normalized = userBoundaries.map(normalizeHue)

  const pillH = 16
  const pillY = barY + barH + 14

  for (let i = 0; i < N; i++) {
    const startHue = normalized[(i + N - 1) % N]
    const endHue = normalized[i]

    // circularMidpoint handles 0°/360° wrap (naive average fails at violet→red boundary)
    const midHue = circularMidpoint(startHue, endHue)

    const rawX = Math.round((midHue / 360) * barW)
    const centerY = pillY + pillH / 2

    const label = labels[i] ?? DEFAULT_COLOR_LABELS[i]
    const metrics = ctx.measureText(label)
    const paddingH = 6
    const paddingV = 2
    const pillW = metrics.width + paddingH * 2
    const pillR = (pillH + paddingV * 2) / 2

    // Clamp x to prevent label overflow at canvas edges
    const halfPill = Math.ceil(pillW / 2)
    const x = Math.max(halfPill + 2, Math.min(barW - halfPill - 2, rawX))

    ctx.fillStyle = 'rgba(10, 10, 15, 0.75)'
    ctx.beginPath()
    ctx.roundRect(
      Math.round(x - pillW / 2),
      pillY - paddingV,
      pillW,
      pillH + paddingV * 2,
      pillR
    )
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillText(label, x, centerY)
  }

  ctx.restore()
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.save()
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textBaseline = 'middle'

  const legendY = height - 12

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(8, legendY)
  ctx.lineTo(8 - 4, legendY - 6)
  ctx.lineTo(8 + 4, legendY - 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.textAlign = 'left'
  ctx.fillText('Your boundaries', 18, legendY)

  ctx.save()
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(width - 130, legendY)
  ctx.lineTo(width - 116, legendY)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = 'rgba(45, 212, 191, 0.9)'
  ctx.textAlign = 'left'
  ctx.fillText('Typical boundaries', width - 112, legendY)

  ctx.restore()
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
