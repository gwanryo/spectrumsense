import { t, setLocale, getCurrentLocale } from '../i18n/index'
import type { Locale } from '../types'

export function renderLanding(
  container: HTMLElement,
  onStart: () => void,
  onLocaleChange: (locale: Locale) => void
): void {
  container.innerHTML = `
    <div class="landing-page">
      <header class="landing-header">
        <div class="lang-switcher">
          <button class="lang-btn ${getCurrentLocale() === 'en' ? 'active' : ''}" data-lang="en">${t('landing.lang.en')}</button>
          <button class="lang-btn ${getCurrentLocale() === 'ko' ? 'active' : ''}" data-lang="ko">${t('landing.lang.ko')}</button>
          <button class="lang-btn ${getCurrentLocale() === 'ja' ? 'active' : ''}" data-lang="ja">${t('landing.lang.ja')}</button>
        </div>
      </header>

      <main class="landing-main">
        <div class="landing-hero">
          <div class="landing-content">
            <div class="spectrum-preview" aria-hidden="true"></div>

            <h1 class="landing-title">${t('landing.title')}</h1>
            <p class="landing-subtitle">${t('landing.subtitle')}</p>
            <p class="landing-description">${t('landing.description')}</p>
            <p class="landing-duration">${t('landing.duration')}</p>

            <button class="btn-primary start-btn" id="start-test-btn">
              ${t('landing.start')}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <p class="landing-disclaimer">${t('landing.disclaimer')}</p>
          </div>
        </div>

        <div class="landing-how">
          <div class="landing-how-header">${t('landing.how_title')}</div>
          <ol class="landing-how-steps">
            <li><span class="landing-how-num">1</span><span>${t('landing.how_step1')}</span></li>
            <li><span class="landing-how-num">2</span><span>${t('landing.how_step2')}</span></li>
            <li><span class="landing-how-num">3</span><span>${t('landing.how_step3')}</span></li>
          </ol>
        </div>

      </main>
    </div>
  `

  injectLandingStyles()

  const startBtn = container.querySelector('#start-test-btn')
  startBtn?.addEventListener('click', onStart)

  const langBtns = container.querySelectorAll('.lang-btn')
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = (btn as HTMLElement).dataset.lang as Locale
      if (lang) {
        setLocale(lang)
        onLocaleChange(lang)
        renderLanding(container, onStart, onLocaleChange)
      }
    })
  })
}

function injectLandingStyles(): void {
  const styleId = 'landing-styles'
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    .landing-page {
      min-height: 100svh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    .landing-header {
      display: flex;
      justify-content: flex-end;
      padding: 1.5rem 2rem;
      animation: fadeIn 0.8s ease both;
      animation-delay: 0.6s;
    }

    .lang-switcher {
      display: flex;
      gap: 0.25rem;
      background: rgba(14, 14, 24, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 0.25rem;
    }

    .lang-btn {
      padding: 0.5rem 1rem;
      border-radius: calc(var(--radius-lg) - 4px);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-muted);
      background: transparent;
      transition: all var(--transition-fast);
      cursor: pointer;
      border: none;
      font-family: var(--font-sans);
    }

    .lang-btn:hover {
      color: var(--text-primary);
    }

    .lang-btn.active {
      background: var(--bg-card);
      color: var(--text-primary);
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }

    .landing-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 0;
    }

    .landing-hero {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem 3rem;
      width: 100%;
    }

    .landing-content {
      max-width: 620px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }

    .spectrum-preview {
      width: 100%;
      max-width: 440px;
      height: 14px;
      border-radius: 7px;
      background: linear-gradient(
        to right,
        hsl(0, 100%, 55%),
        hsl(30, 100%, 55%),
        hsl(55, 100%, 50%),
        hsl(120, 80%, 45%),
        hsl(210, 100%, 55%),
        hsl(270, 80%, 60%),
        hsl(320, 80%, 55%),
        hsl(360, 100%, 55%)
      );
      margin-bottom: 0.75rem;
      position: relative;
      animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0s;
    }

    .spectrum-preview::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 11px;
      background: inherit;
      filter: blur(16px);
      opacity: 0.55;
      z-index: -1;
      animation: spectrumPulse 4s ease-in-out infinite;
    }

    .spectrum-preview::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(
        to right,
        transparent 0%,
        rgba(255, 255, 255, 0.15) 45%,
        rgba(255, 255, 255, 0.25) 50%,
        rgba(255, 255, 255, 0.15) 55%,
        transparent 100%
      );
      background-size: 250% 100%;
      animation: shimmer 4s ease-in-out infinite;
    }

    .landing-title {
      color: var(--text-primary);
      margin: 0;
      font-family: var(--font-display);
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.1s;
    }

    .landing-subtitle {
      font-size: 1.125rem;
      color: var(--text-secondary);
      margin: 0;
      font-weight: 300;
      letter-spacing: 0.01em;
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.18s;
    }

    .landing-description {
      font-size: 0.9375rem;
      color: var(--text-muted);
      line-height: 1.8;
      margin: 0;
      max-width: 460px;
      font-weight: 300;
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.26s;
    }

    .landing-duration {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin: 0;
      font-family: var(--font-mono);
      letter-spacing: 0.06em;
      font-weight: 400;
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.32s;
    }

    .start-btn {
      margin-top: 0.75rem;
      font-size: 1.0625rem;
      padding: 1rem 2.75rem;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.4s;
    }

    .landing-disclaimer {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 0;
      max-width: 400px;
      line-height: 1.5;
      font-weight: 300;
      animation: fadeIn 0.8s ease both;
      animation-delay: 0.55s;
    }

    .landing-how {
      width: 100%;
      max-width: 440px;
      padding: 2rem 0;
      animation: fadeIn 0.8s ease both;
      animation-delay: 0.7s;
    }

    .landing-how-header {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-align: center;
      margin-bottom: 1.25rem;
    }

    .landing-how-steps {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .landing-how-steps li {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.6;
      font-weight: 300;
    }

    .landing-how-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--accent-dim);
      border: 1px solid var(--border-accent);
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--accent);
      margin-top: 0.1rem;
    }

    @media (max-width: 480px) {
      .landing-header {
        padding: 1rem 1rem;
      }
      .landing-hero {
        padding: 1.5rem 1rem 2rem;
      }
      .landing-content {
        gap: 1.25rem;
      }
      .landing-description {
        font-size: 0.875rem;
      }
      .start-btn {
        width: 100%;
        justify-content: center;
      }
      .landing-how {
        padding: 1.5rem 0;
      }
    }
  `
  document.head.appendChild(style)
}
