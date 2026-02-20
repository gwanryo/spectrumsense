import type { TestResult } from '../types'
import { readResultFromUrl, buildShareUrl } from '../url-state'
import { computeDeviations, summarizeResults } from '../result'
import { sampleHueRange, huePositionInRange, getColorHsl } from '../color'
import { getColorRegions } from '../result'
import { renderSpectrumBar } from '../canvas/spectrum-bar'
import { downloadGeneratedResultCard } from '../canvas/result-card'
import { shareWebApi, copyToClipboard, isWebShareSupported } from '../sharing'
import { t, getCurrentLocale } from '../i18n/index'

export function renderResults(container: HTMLElement): void {
  const result = readResultFromUrl()

  if (!result) {
    renderError(container)
    return
  }

  const deviations = computeDeviations(result.boundaries)
  const summary = summarizeResults(deviations, result.boundaries)

  const nickname = (sessionStorage.getItem('spectrumsense-nickname') ?? '').trim()
  const title = nickname
    ? t('results.title_with_nickname').replace('{nickname}', escapeHtml(nickname))
    : t('results.title')

  const madValue = Math.round(summary.meanAbsoluteDeviation * 10) / 10
  const mostShiftedColor = t(`colors.${summary.mostShifted.color}`)
  const mostShiftedDiff = Math.round(summary.mostShifted.difference)
  const mostShiftedStr = mostShiftedDiff > 0 ? `+${mostShiftedDiff}°` : `${mostShiftedDiff}°`
  const mostShiftedColorHsl = getColorHsl(summary.mostShifted.color)

  container.innerHTML = `
    <div class="results-page">
      <header class="results-header">
        <div class="container">
          <div class="results-heading-row">
            <div class="results-heading-copy">
              <h1 class="results-title">${title}</h1>
              <p class="results-subtitle">${t('results.subtitle')}</p>
            </div>
          </div>
        </div>
      </header>

      <main class="results-main">
        <div class="container">

          <!-- Spectrum Bar -->
          <section class="results-section results-section--spectrum">
            <canvas id="spectrum-bar-canvas" class="spectrum-bar-canvas"></canvas>
          </section>

          <!-- Summary Stats -->
          <section class="results-summary">
            <div class="summary-stat">
              <span class="summary-stat-value">${madValue}°</span>
              <span class="summary-stat-label">${t('results.summary_avg')}</span>
            </div>
            <div class="summary-stat">
              <span class="summary-stat-value">
                <span class="summary-shift-color" style="color: ${mostShiftedColorHsl}">${mostShiftedColor}</span>
                <span class="summary-shift-diff">${mostShiftedStr}</span>
              </span>
              <span class="summary-stat-label">${t('results.summary_most_shifted')}</span>
            </div>
          </section>

          <!-- Deviation Table -->
          <section class="results-section">
            <div class="deviation-grid" id="deviation-grid"></div>
          </section>

           <!-- Action Buttons -->
          <section class="results-actions">
            <div class="actions-row">
              <button class="btn-primary" id="btn-retake">${t('results.retake')}</button>
              <button class="btn-secondary" id="btn-copy">${t('results.copy_link')}</button>
              ${isWebShareSupported() ? `<button class="btn-secondary" id="btn-webshare">${t('results.web_share')}</button>` : ''}
              <button class="btn-secondary" id="btn-download">${t('results.download')}</button>
            </div>
          </section>

           <!-- References Footer -->
           <footer class="results-references">
             <span class="results-references-label">${t('results.citation')}</span>
             <div class="results-references-links">
               <a href="https://blog.xkcd.com/2010/05/03/color-survey-results/" target="_blank" rel="noopener noreferrer">XKCD Color Survey</a>
               <a href="https://en.wikipedia.org/wiki/Munsell_color_system" target="_blank" rel="noopener noreferrer">Munsell Color System</a>
               <a href="https://en.wikipedia.org/wiki/CIE_1931_color_space" target="_blank" rel="noopener noreferrer">CIE 1931</a>
               <a href="https://html-color.codes/" target="_blank" rel="noopener noreferrer">HTML Color Codes</a>
             </div>
           </footer>

        </div>
      </main>

      <!-- Toast notification -->
      <div class="toast" id="copy-toast">${t('results.copied')}</div>
    </div>
  `

  injectResultsStyles()

  const canvas = container.querySelector<HTMLCanvasElement>('#spectrum-bar-canvas')!
  // ResizeObserver ensures canvas renders after layout completes (clientWidth/Height need computed styles)
  const ro = new ResizeObserver(() => {
    renderSpectrumBar(canvas, result.boundaries, {
      colorLabels: [
        t('colors.red'), t('colors.orange'), t('colors.yellow'),
        t('colors.green'), t('colors.blue'), t('colors.violet'), t('colors.pink'),
      ],
      labelUser: t('results.legend_user'),
      labelReference: t('results.legend_reference'),
    })
  })
  ro.observe(canvas)

  renderDeviationGrid(container, deviations, result.boundaries)
  wireButtons(container, result, nickname)
}

function renderDeviationGrid(
  container: HTMLElement,
  deviations: ReturnType<typeof computeDeviations>,
  userBoundaries: number[],
): void {
  const grid = container.querySelector<HTMLElement>('#deviation-grid')!
  const regions = getColorRegions(userBoundaries)
  const regionByColor = new Map(regions.map((r, i) => [r.name, i]))

  const cards = deviations.map((dev, i) => {
    const diff = Math.round(dev.difference)
    const absDiff = Math.abs(diff)
    const diffStr = diff === 0 ? '±0°' : diff > 0 ? `+${diff}°` : `${diff}°`
    const diffClass = absDiff <= 5 ? 'diff-small' : absDiff <= 15 ? 'diff-medium' : 'diff-large'

    const colorKey = `colors.${dev.color}`
    const colorName = t(colorKey)
    const userHue = Math.round(dev.userHue)

    const regionIdx = regionByColor.get(dev.color)!
    const region = regions[regionIdx]
    const userRangeGradient = buildHueRangeGradient(region.startHue, region.endHue)
    const yourColorLabel = t('results.your_color').replace('{color}', colorName)
    const referencePosition = huePositionInRange(dev.referenceHue, region.startHue, region.endHue)
    const referencePositionPct = referencePosition === null
      ? null
      : Math.max(0, Math.min(100, referencePosition * 100))
    const isReferenceInRange = referencePositionPct !== null

    return `
      <div class="deviation-card card" style="animation-delay: ${i * 0.08}s">
        <div class="deviation-user-color">
          <div class="deviation-user-color-top">
            <span class="deviation-color-label">${yourColorLabel}</span>
            ${isReferenceInRange ? '' : `<span class="deviation-out-of-range-inline">${t('results.reference_out_of_range')}</span>`}
          </div>
          <div class="deviation-user-swatch-wrap">
            <div class="deviation-user-swatch" style="background: ${userRangeGradient}"></div>
            ${isReferenceInRange
              ? `<span class="deviation-reference-marker-wrap" style="left: ${referencePositionPct.toFixed(2)}%">
                   <span class="deviation-reference-line"></span>
                   <span class="deviation-reference-inside-label">${t('results.reference_short')}</span>
                 </span>`
              : ''
            }
          </div>
        </div>
        <div class="deviation-values">
          <div class="deviation-value">
            <span class="deviation-label">${t('results.typical_value')}</span>
            <span class="deviation-hue deviation-hue--muted">${dev.referenceHue}°</span>
          </div>
          <div class="deviation-value">
            <span class="deviation-label">${t('results.measured_value')}</span>
            <span class="deviation-hue">${userHue}°</span>
          </div>
          <div class="deviation-diff-badge ${diffClass}">${diffStr}</div>
        </div>
      </div>
    `
  })

  grid.innerHTML = cards.join('')
}

function buildHueRangeGradient(startHue: number, endHue: number): string {
  const hues = sampleHueRange(startHue, endHue, 7)
  const stopDenominator = Math.max(1, hues.length - 1)
  const stops = hues.map((h, i) => `hsl(${Math.round(h)}, 100%, 50%) ${(i / stopDenominator) * 100}%`)
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

function wireButtons(
  container: HTMLElement,
  result: TestResult,
  nickname: string,
): void {
  container.querySelector('#btn-retake')?.addEventListener('click', () => {
    window.location.hash = '#/test'
  })

  container.querySelector('#btn-copy')?.addEventListener('click', async () => {
    const url = buildShareUrl(result)
    const success = await copyToClipboard(url)
    if (success) showToast(container)
  })

  container.querySelector('#btn-webshare')?.addEventListener('click', async () => {
    const shareResult = await shareWebApi(result)
    if (shareResult === 'copied') {
      showToast(container)
    }
  })

  container.querySelector('#btn-download')?.addEventListener('click', async () => {
    const locale = getCurrentLocale()
    await downloadGeneratedResultCard(result, locale, { nickname })
  })
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function showToast(container: HTMLElement): void {
  const toast = container.querySelector<HTMLElement>('#copy-toast')!
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2500)
}

function renderError(container: HTMLElement): void {
  container.innerHTML = `
    <div class="results-error">
      <div class="container">
        <p class="error-message">${t('error.invalid_url')}</p>
        <a href="#/" class="btn-primary">${t('error.try_test')}</a>
      </div>
    </div>
  `
  injectResultsStyles()
}

function injectResultsStyles(): void {
  const styleId = 'results-styles'
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    .results-page {
      min-height: 100dvh;
      padding-bottom: 4rem;
    }

    .results-header {
      padding: 3.5rem 0 1.75rem;
      border-bottom: 1px solid var(--border);
    }

    .results-heading-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .results-heading-copy {
      min-width: 0;
    }

    .results-title {
      margin-bottom: 0.5rem;
      font-family: var(--font-display);
      animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .results-subtitle {
      color: var(--text-secondary);
      font-size: 1.0625rem;
      font-weight: 300;
      animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.08s;
    }

    .results-main {
      padding-top: 1.5rem;
    }

    .results-section {
      margin-bottom: 2.5rem;
      animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.15s;
    }

    .results-section--spectrum {
      margin-bottom: 1.25rem;
    }

    .results-disclaimer--medical {
      border-left-color: rgba(251, 191, 36, 0.3);
    }

    .spectrum-bar-canvas {
      width: 100%;
      height: 150px;
      display: block;
    }

    @media (max-width: 480px) {
      .spectrum-bar-canvas {
        height: 160px;
      }
    }

    .results-summary {
      display: flex;
      gap: 1rem;
      margin-bottom: 2.5rem;
      animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.2s;
    }

    .summary-stat {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      padding: 1.25rem 1rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .summary-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-mono);
      letter-spacing: -0.02em;
      display: inline-flex;
      align-items: baseline;
      gap: 0.375rem;
    }

    .summary-shift-color {
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
    }

    .summary-shift-diff {
      color: var(--text-primary);
    }

    .summary-stat-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .deviation-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
    }

    @media (max-width: 768px) {
      .deviation-grid {
        gap: 0.75rem;
      }
      .deviation-card {
        width: calc((100% - 0.75rem) / 2);
      }
    }

    @media (max-width: 480px) {
      .results-summary {
        gap: 0.625rem;
      }
      .summary-stat {
        padding: 1rem 0.75rem;
      }
      .summary-stat-value {
        font-size: 1.25rem;
      }
      .deviation-grid {
        gap: 0.625rem;
      }
      .deviation-card {
        padding: 1rem;
        gap: 0.625rem;
        width: calc((100% - 0.625rem) / 2);
      }
      .deviation-color-label {
        font-size: 0.6875rem;
      }
      .deviation-user-swatch-wrap {
        height: 42px;
      }
      .deviation-reference-inside-label {
        font-size: 0.6875rem;
        padding: 0.125rem 0.3125rem;
      }
      .deviation-reference-marker-wrap {
        width: 2.8px;
      }
      .deviation-reference-line {
        --marker-gap: 8px;
        --marker-outer-width: 2.4px;
        --marker-inner-width: 1.2px;
      }
      .deviation-out-of-range-inline {
        font-size: 0.6875rem;
      }
      .deviation-hue {
        font-size: 0.875rem;
      }
      .deviation-label {
        font-size: 0.8125rem;
      }
      .deviation-diff-badge {
        font-size: 0.8125rem;
        padding: 0.1875rem 0.5rem;
      }

    }

    .deviation-card {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
      width: calc((100% - 3rem) / 4);
      min-width: 0;
    }

    .deviation-user-color {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .deviation-user-color-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .deviation-color-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-muted);
      text-align: left;
      line-height: 1.2;
    }

    .deviation-user-swatch-wrap {
      position: relative;
      width: 100%;
      height: 48px;
    }

    .deviation-user-swatch {
      position: absolute;
      inset: 0;
      border-radius: var(--radius-sm);
      overflow: hidden;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    .deviation-reference-marker-wrap {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      transform: translateX(-50%);
      width: 3.2px;
      pointer-events: none;
    }

    .deviation-reference-line {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      transform: translateX(-50%);
      width: var(--marker-outer-width);
      border-radius: 999px;
      --marker-gap: 8px;
      --marker-outer-width: 2.8px;
      --marker-inner-width: 1.4px;
      background:
        linear-gradient(
          180deg,
          rgba(12, 14, 24, 0) 0%,
          rgba(12, 14, 24, 0.52) 18%,
          rgba(12, 14, 24, 0.52) 82%,
          rgba(12, 14, 24, 0) 100%
        ) center top / 100% calc(50% - var(--marker-gap)) no-repeat,
        linear-gradient(
          180deg,
          rgba(12, 14, 24, 0) 0%,
          rgba(12, 14, 24, 0.52) 18%,
          rgba(12, 14, 24, 0.52) 82%,
          rgba(12, 14, 24, 0) 100%
        ) center bottom / 100% calc(50% - var(--marker-gap)) no-repeat;
    }

    .deviation-reference-line::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      transform: translateX(-50%);
      width: var(--marker-inner-width);
      border-radius: 999px;
      pointer-events: none;
      background: linear-gradient(
        180deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.86) 18%,
          rgba(255, 255, 255, 0.86) 82%,
          rgba(255, 255, 255, 0) 100%
        ) center top / 100% calc(50% - var(--marker-gap)) no-repeat,
        linear-gradient(
          180deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.86) 18%,
          rgba(255, 255, 255, 0.86) 82%,
          rgba(255, 255, 255, 0) 100%
        ) center bottom / 100% calc(50% - var(--marker-gap)) no-repeat;
    }

    .deviation-reference-inside-label {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.6875rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.95);
      font-family: var(--font-mono);
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.28);
      white-space: nowrap;
      letter-spacing: 0.01em;
      margin: 0;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
      z-index: 1;
    }

    .deviation-out-of-range-inline {
      font-size: 0.75rem;
      color: var(--text-muted);
      letter-spacing: 0.01em;
      line-height: 1.2;
      white-space: nowrap;
    }

    .deviation-values {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .deviation-value {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .deviation-label {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .deviation-hue {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .deviation-hue--muted {
      color: var(--text-primary);
      font-weight: 400;
      opacity: 0.55;
    }

    .deviation-diff-badge {
      display: inline-flex;
      align-self: flex-end;
      font-size: 0.875rem;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 0.25rem 0.625rem;
      border-radius: var(--radius-sm);
      margin-top: 0.25rem;
      letter-spacing: 0.02em;
    }

    .diff-small {
      color: var(--diff-small, #34d399);
      background: rgba(52, 211, 153, 0.1);
    }
    .diff-medium {
      color: var(--diff-medium, #fbbf24);
      background: rgba(251, 191, 36, 0.1);
    }
    .diff-large {
      color: var(--diff-large, #f87171);
      background: rgba(248, 113, 113, 0.1);
    }

    .results-disclaimer {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 2rem;
      padding: 1rem 1.25rem;
      background: var(--bg-secondary);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--border-accent, rgba(45, 212, 191, 0.2));
      animation: fadeIn 0.6s ease both;
      animation-delay: 0.5s;
    }

    .results-references {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 2.5rem;
      margin-bottom: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      animation: fadeIn 0.6s ease both;
      animation-delay: 0.55s;
      flex-wrap: wrap;
    }

    .results-references-label {
      flex-shrink: 0;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .results-references-links {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .results-references-links a {
      color: var(--text-muted);
      text-decoration: none;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      transition: all var(--transition-fast);
    }

    .results-references-links a:hover {
      color: var(--accent);
      border-color: var(--border-accent);
    }

    .results-actions {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.6s;
    }

    .actions-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .actions-row .btn-primary {
      padding: 0.75rem 1.75rem;
      font-size: 0.9375rem;
    }

    .actions-row .btn-secondary {
      border-radius: var(--radius-lg);
    }

    .results-error {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .error-message {
      font-size: 1.125rem;
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    @media (max-width: 480px) {
      .results-header {
        padding: 2rem 0 1.5rem;
      }
      .results-heading-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .summary-stat-value {
        font-size: 1.125rem;
      }
      .actions-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }
      .actions-row .btn-primary,
      .actions-row .btn-secondary {
        width: 100%;
        justify-content: center;
        font-size: 0.875rem;
        padding: 0.625rem 1rem;
      }
    }
  `
  document.head.appendChild(style)
}
