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
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }

    .landing-header {
      display: flex;
      justify-content: flex-end;
      padding: 1.5rem 2rem;
    }

    .lang-switcher {
      display: flex;
      gap: 0.25rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 0.25rem;
    }

    .lang-btn {
      padding: 0.375rem 0.875rem;
      border-radius: calc(var(--radius-lg) - 4px);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      transition: var(--transition-fast);
      cursor: pointer;
      border: none;
    }

    .lang-btn:hover {
      color: var(--text-primary);
    }

    .lang-btn.active {
      background: var(--bg-card);
      color: var(--text-primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .landing-main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem 4rem;
    }

    .landing-content {
      max-width: 600px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }

    .spectrum-preview {
      width: 100%;
      max-width: 400px;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(
        to right,
        hsl(0, 100%, 50%),
        hsl(48, 100%, 50%),
        hsl(78, 100%, 50%),
        hsl(163, 100%, 50%),
        hsl(258, 100%, 50%),
        hsl(300, 100%, 50%),
        hsl(360, 100%, 50%)
      );
      margin-bottom: 0.5rem;
      opacity: 0.85;
    }

    .landing-title {
      color: var(--text-primary);
      margin: 0;
    }

    .landing-subtitle {
      font-size: 1.125rem;
      color: var(--text-secondary);
      margin: 0;
      font-weight: 400;
    }

    .landing-description {
      font-size: 0.9375rem;
      color: var(--text-muted);
      line-height: 1.7;
      margin: 0;
      max-width: 480px;
    }

    .landing-duration {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin: 0;
      font-family: var(--font-mono);
      letter-spacing: 0.05em;
    }

    .start-btn {
      margin-top: 0.5rem;
      font-size: 1.0625rem;
      padding: 1rem 2.5rem;
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .landing-disclaimer {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 0;
      max-width: 400px;
      line-height: 1.5;
    }

    @media (max-width: 375px) {
      .landing-header {
        padding: 1rem;
      }
      .landing-main {
        padding: 1rem 1rem 3rem;
      }
      .start-btn {
        width: 100%;
        justify-content: center;
      }
    }
  `
  document.head.appendChild(style)
}
