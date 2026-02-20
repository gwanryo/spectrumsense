/** @param variant `'dark'` = rgba(12,14,24,0.52) / `'light'` = rgba(255,255,255,0.86) */
export function createFadeGradient(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  variant: 'dark' | 'light',
): CanvasGradient {
  const [r, g, b, alpha] = variant === 'dark'
    ? [12, 14, 24, 0.52]
    : [255, 255, 255, 0.86]

  const grad = ctx.createLinearGradient(x1, y1, x2, y2)
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
  grad.addColorStop(0.18, `rgba(${r}, ${g}, ${b}, ${alpha})`)
  grad.addColorStop(0.82, `rgba(${r}, ${g}, ${b}, ${alpha})`)
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  return grad
}
