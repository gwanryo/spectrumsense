import type { TestResult, ColorName } from '../types'
import { readResultFromUrl, buildShareUrl } from '../url-state'
import { computeDeviations } from '../result'
import { renderSpectrumBar } from '../canvas/spectrum-bar'
import { generateResultCard, downloadResultCard } from '../canvas/result-card'
import { shareWebApi, copyToClipboard, isWebShareSupported } from '../sharing'
import { t, getCurrentLocale } from '../i18n/index'

const COLOR_HUE_MAP: Record<ColorName, string> = {
  red: 'hsl(0, 100%, 50%)',
  orange: 'hsl(30, 100%, 55%)',
  yellow: 'hsl(55, 100%, 50%)',
  green: 'hsl(140, 70%, 45%)',
  blue: 'hsl(220, 100%, 55%)',
  violet: 'hsl(270, 80%, 60%)',
  pink: 'hsl(330, 80%, 55%)',
}

export function renderResults(container: HTMLElement): void {
  const result = readResultFromUrl()

  if (!result) {
    renderError(container)
    return
  }

  const deviations = computeDeviations(result.boundaries)

  container.innerHTML = `
    <div class="results-page">
      <header class="results-header">
        <div class="container">
          <h1 class="results-title">${t('results.title')}</h1>
          <p class="results-subtitle">${t('results.subtitle')}</p>
        </div>
      </header>

      <main class="results-main">
        <div class="container">

          <!-- Spectrum Bar -->
          <section class="results-section">
            <canvas id="spectrum-bar-canvas" class="spectrum-bar-canvas"></canvas>
          </section>

          <!-- Deviation Table -->
          <section class="results-section">
            <div class="deviation-grid" id="deviation-grid"></div>
          </section>

           <!-- Disclaimer -->
           <p class="results-disclaimer">${t('results.disclaimer')}</p>

           <!-- References Footer -->
           <footer class="results-references">
             <span class="results-references-label">${t('results.citation')}</span>
             <div class="results-references-links">
               <a href="https://blog.xkcd.com/2010/05/03/color-survey-results/" target="_blank" rel="noopener noreferrer">XKCD Color Survey</a>
               <a href="https://en.wikipedia.org/wiki/Munsell_color_system" target="_blank" rel="noopener noreferrer">Munsell Color System</a>
               <a href="https://en.wikipedia.org/wiki/CIE_1931_color_space" target="_blank" rel="noopener noreferrer">CIE 1931</a>
             </div>
           </footer>

           <!-- Action Buttons -->
          <section class="results-actions">
            <div class="actions-primary">
              <button class="btn-primary" id="btn-refine">${t('results.refine')}</button>
              <button class="btn-secondary" id="btn-retake">${t('results.retake')}</button>
            </div>

            <div class="actions-share">
              <button class="btn-secondary" id="btn-copy">
                ${t('results.copy_link')}
              </button>

              ${isWebShareSupported() ? `<button class="btn-secondary" id="btn-webshare">${t('results.web_share')}</button>` : ''}

              <button class="btn-secondary" id="btn-download">${t('results.download')}</button>
            </div>
          </section>

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
    })
  })
  ro.observe(canvas)

  renderDeviationGrid(container, deviations)
  wireButtons(container, result)
}

function renderDeviationGrid(
  container: HTMLElement,
  deviations: ReturnType<typeof computeDeviations>,
): void {
  const grid = container.querySelector<HTMLElement>('#deviation-grid')!

  grid.innerHTML = deviations.map((dev, i) => {
    const diff = Math.round(dev.difference)
    const absDiff = Math.abs(diff)
    const diffStr = diff === 0 ? '±0°' : diff > 0 ? `+${diff}°` : `${diff}°`
    const diffClass = absDiff <= 5 ? 'diff-small' : absDiff <= 15 ? 'diff-medium' : 'diff-large'

    const fromKey = `colors.${dev.boundary.from}`
    const toKey = `colors.${dev.boundary.to}`
    const fromColor = COLOR_HUE_MAP[dev.boundary.from]
    const toColor = COLOR_HUE_MAP[dev.boundary.to]

    return `
      <div class="deviation-card card" style="animation-delay: ${i * 0.08}s">
        <div class="deviation-card-header">
          <div class="deviation-swatches">
            <span class="deviation-swatch" style="background: ${fromColor}"></span>
            <span class="deviation-swatch" style="background: ${toColor}"></span>
          </div>
          <div class="deviation-boundary">${t(fromKey)} ↔ ${t(toKey)}</div>
        </div>
        <div class="deviation-values">
          <div class="deviation-value">
            <span class="deviation-label">${t('results.your_value')}</span>
            <span class="deviation-hue">${Math.round(dev.userHue)}°</span>
          </div>
          <div class="deviation-value">
            <span class="deviation-label">${t('results.typical_value')}</span>
            <span class="deviation-hue deviation-hue--muted">${dev.standardHue}°</span>
          </div>
          <div class="deviation-diff-badge ${diffClass}">${diffStr}</div>
        </div>
      </div>
    `
  }).join('')
}

function wireButtons(
  container: HTMLElement,
  result: TestResult,
): void {
  container.querySelector('#btn-refine')?.addEventListener('click', () => {
    const encoded = btoa(JSON.stringify(result))
    const params = new URLSearchParams()
    params.set('prev', encoded)
    window.location.hash = `#/test?${params.toString()}`
  })

  container.querySelector('#btn-retake')?.addEventListener('click', () => {
    window.location.hash = '#/test'
  })

  container.querySelector('#btn-copy')?.addEventListener('click', async () => {
    const url = buildShareUrl(result)
    const success = await copyToClipboard(url)
    if (success) showToast(container)
  })

  container.querySelector('#btn-webshare')?.addEventListener('click', async () => {
    await shareWebApi(result)
  })

  container.querySelector('#btn-download')?.addEventListener('click', () => {
    const locale = getCurrentLocale()
    const card = generateResultCard(result, locale)
    downloadResultCard(card)
  })
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
      padding: 3.5rem 0 2.5rem;
      border-bottom: 1px solid var(--border);
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
      padding-top: 2.5rem;
    }

    .results-section {
      margin-bottom: 2.5rem;
      animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.15s;
    }

    .spectrum-bar-canvas {
      width: 100%;
      height: 140px;
      display: block;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--border);
      box-shadow: 0 4px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(45, 212, 191, 0.04);
    }

    .deviation-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .deviation-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .deviation-grid {
        grid-template-columns: 1fr;
      }
    }

    .deviation-card {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .deviation-card-header {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .deviation-swatches {
      display: flex;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .deviation-swatch {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
    }

    .deviation-boundary {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
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
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .deviation-hue {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .deviation-hue--muted {
      color: var(--text-secondary);
      font-weight: 400;
    }

    .deviation-diff-badge {
      display: inline-flex;
      align-self: flex-end;
      font-size: 0.8125rem;
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
      font-size: 0.8125rem;
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
      font-size: 0.6875rem;
      color: var(--text-muted);
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

    .actions-primary {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .actions-share {
      display: flex;
      gap: 0.625rem;
      flex-wrap: wrap;
    }

    .actions-share .btn-secondary {
      font-size: 0.875rem;
      padding: 0.625rem 1.25rem;
      background: transparent;
      border-color: var(--border);
    }

    .actions-share .btn-secondary:hover {
      background: var(--bg-card);
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

    @media (max-width: 375px) {
      .results-header {
        padding: 2rem 0 1.5rem;
      }
      .actions-primary,
      .actions-share {
        flex-direction: column;
      }
      .actions-primary .btn-primary,
      .actions-primary .btn-secondary,
      .actions-share .btn-secondary {
        width: 100%;
        justify-content: center;
      }
    }
  `
  document.head.appendChild(style)
}
