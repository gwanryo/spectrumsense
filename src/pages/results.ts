import type { TestResult } from '../types'
import { readResultFromUrl, buildShareUrl } from '../url-state'
import { computeDeviations } from '../result'
import { renderSpectrumBar } from '../canvas/spectrum-bar'
import { generateResultCard, downloadResultCard } from '../canvas/result-card'
import { shareTwitter, shareWebApi, copyToClipboard, isWebShareSupported } from '../sharing'
import { t, getCurrentLocale } from '../i18n/index'

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

           <!-- Citation -->
           <p class="results-citation">${t('results.citation')}</p>

           <!-- Action Buttons -->
          <section class="results-actions">
            <div class="actions-primary">
              <button class="btn-primary" id="btn-refine">${t('results.refine')}</button>
              <button class="btn-secondary" id="btn-retake">${t('results.retake')}</button>
            </div>

            <div class="actions-share">
              <button class="btn-secondary" id="btn-twitter">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                ${t('results.share_twitter')}
              </button>

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

  grid.innerHTML = deviations.map((dev) => {
    const diff = Math.round(dev.difference)
    const absDiff = Math.abs(diff)
    const diffStr = diff === 0 ? '±0°' : diff > 0 ? `+${diff}°` : `${diff}°`
    const diffClass = absDiff <= 5 ? 'diff-small' : absDiff <= 15 ? 'diff-medium' : 'diff-large'

    const fromKey = `colors.${dev.boundary.from}`
    const toKey = `colors.${dev.boundary.to}`

    return `
      <div class="deviation-card card">
        <div class="deviation-boundary">${t(fromKey)} ↔ ${t(toKey)}</div>
        <div class="deviation-values">
          <div class="deviation-value">
            <span class="deviation-label">${t('results.your_value')}</span>
            <span class="deviation-hue">${Math.round(dev.userHue)}°</span>
          </div>
          <div class="deviation-value">
            <span class="deviation-label">${t('results.typical_value')}</span>
            <span class="deviation-hue deviation-hue--muted">${dev.standardHue}°</span>
          </div>
          <div class="deviation-diff ${diffClass}">${diffStr}</div>
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
    const url = new URL(window.location.href)
    url.searchParams.set('prev', encoded)
    url.hash = '#/test'
    window.location.href = url.toString()
  })

  container.querySelector('#btn-retake')?.addEventListener('click', () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('r')
    url.searchParams.delete('prev')
    url.hash = '#/test'
    window.location.href = url.toString()
  })

  container.querySelector('#btn-twitter')?.addEventListener('click', () => {
    shareTwitter(result)
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
      padding: 3rem 0 2rem;
      border-bottom: 1px solid var(--border);
    }

    .results-title {
      margin-bottom: 0.5rem;
    }

    .results-subtitle {
      color: var(--text-secondary);
      font-size: 1.0625rem;
    }

    .results-main {
      padding-top: 2rem;
    }

    .results-section {
      margin-bottom: 2rem;
    }

    .spectrum-bar-canvas {
      width: 100%;
      height: 140px;
      display: block;
      border-radius: var(--radius-md);
      overflow: hidden;
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
      gap: 0.75rem;
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

    .deviation-diff {
      font-size: 0.9375rem;
      font-weight: 700;
      font-family: var(--font-mono);
      text-align: right;
      margin-top: 0.25rem;
    }

    .diff-small { color: #00b894; }
    .diff-medium { color: #fdcb6e; }
    .diff-large { color: #e17055; }

    .results-disclaimer {
      font-size: 0.8125rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 2rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--border);
    }

    .results-citation {
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 2rem;
      padding: 0.75rem;
      background: var(--bg-secondary);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--border);
      opacity: 0.85;
    }

    .results-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .actions-primary {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .actions-share {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
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
