import type { Question, TestResult } from '../types'
import {
  createTestSession,
  getCurrentQuestion,
  answerQuestion,
  advanceFromInterstitial,
  isTestComplete,
  getTestResults,
} from '../state-machine'
import { hslString } from '../color'
import { t, getCurrentLocale } from '../i18n/index'
import { encodeResult } from '../url-state'
import { navigateTo } from '../router'

const INTERSTITIAL_DURATION = 1200
const INTERSTITIAL_COLOR = '#808080'
const MIN_RESPONSE_TIME_MS = 300

const WARMUP_QUESTIONS: { hue: number; from: string; to: string }[] = [
  { hue: 0, from: 'colors.red', to: 'colors.orange' },
  { hue: 200, from: 'colors.cyan', to: 'colors.blue' },
]

export function renderTest(
  container: HTMLElement,
  mode: 'normal' | 'refine' = 'normal',
  previousResults?: TestResult
): void {
  injectTestStyles()
  document.body.style.overflow = 'hidden'

  if (mode === 'refine') {
    startRealTest(container, mode, previousResults)
    return
  }

  showEnvironmentCheck(container, () => {
    runWarmup(container, 0, () => {
      startRealTest(container, mode, previousResults)
    })
  })
}

function showEnvironmentCheck(
  container: HTMLElement,
  onReady: () => void
): void {
  const savedNickname = sessionStorage.getItem('spectrumsense-nickname') ?? ''

  container.innerHTML = `
    <div class="test-page-wrapper">
      <div class="test-env-check">
        <button class="test-back-btn" id="btn-back" aria-label="${t('test.back')}">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${t('test.back')}
        </button>
        <h2 class="test-env-title">${t('test.env_title')}</h2>
        <ul class="test-env-list">
          <li>${t('test.env_brightness')}</li>
          <li>${t('test.env_nightmode')}</li>
          <li>${t('test.env_lighting')}</li>
        </ul>

        <div class="test-env-divider"></div>

        <div class="test-env-nickname">
          <label class="test-env-nickname-label" for="nickname-input">${t('test.nickname_label')}</label>
          <input
            type="text"
            id="nickname-input"
            class="test-env-nickname-input"
            placeholder="${t('test.nickname_placeholder')}"
            value="${savedNickname.replace(/"/g, '&quot;')}"
            maxlength="20"
            autocomplete="off"
          />
        </div>

        <div class="test-env-divider"></div>

        <div class="test-env-how">
          <h3 class="test-env-how-title">${t('landing.how_title')}</h3>
          <ol class="test-env-how-steps">
            <li><span class="test-env-how-num">1</span><span>${t('landing.how_step1')}</span></li>
            <li><span class="test-env-how-num">2</span><span>${t('landing.how_step2')}</span></li>
            <li><span class="test-env-how-num">3</span><span>${t('landing.how_step3')}</span></li>
          </ol>
        </div>

        <div class="test-env-divider"></div>

        <p class="test-env-disclaimer">${t('test.disclaimer')}</p>

        <button class="test-confirmation-btn test-confirmation-btn-primary" id="btn-env-ready">
          ${t('test.env_ready')}
        </button>
      </div>
    </div>
  `

  const nicknameInput = container.querySelector<HTMLInputElement>('#nickname-input')!
  const readyBtn = container.querySelector<HTMLButtonElement>('#btn-env-ready')!
  const backBtn = container.querySelector<HTMLButtonElement>('#btn-back')!

  backBtn.addEventListener('click', () => {
    document.body.style.overflow = ''
    window.location.hash = '#/landing'
  })

  readyBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim()
    if (nickname) {
      sessionStorage.setItem('spectrumsense-nickname', nickname)
    } else {
      sessionStorage.removeItem('spectrumsense-nickname')
    }
    onReady()
  })
}

function runWarmup(
  container: HTMLElement,
  index: number,
  onComplete: () => void
): void {
  if (index >= WARMUP_QUESTIONS.length) {
    showWarmupComplete(container, onComplete)
    return
  }

  const wq = WARMUP_QUESTIONS[index]
  const swapped = Math.random() < 0.5
  const firstLabel = swapped ? wq.to : wq.from
  const secondLabel = swapped ? wq.from : wq.to

  container.innerHTML = `
    <div class="test-page-wrapper">
      <div class="test-page" id="test-page-root" style="background-color: ${hslString(wq.hue)}">
        <div class="test-progress-bar-container test-overlay">
          <div class="test-progress-text">
            ${t('test.warmup_label')} ${index + 1} / ${WARMUP_QUESTIONS.length}
          </div>
        </div>
        <div class="test-buttons-container">
          <p class="test-instruction test-overlay">${t('test.instruction')}</p>
          <div class="test-choices">
            <button class="test-choice-btn" id="btn-first" type="button" disabled>${t(firstLabel)}</button>
            <button class="test-choice-btn" id="btn-second" type="button" disabled>${t(secondLabel)}</button>
          </div>
        </div>
      </div>
    </div>
  `

  const btnFirst = container.querySelector<HTMLButtonElement>('#btn-first')!
  const btnSecond = container.querySelector<HTMLButtonElement>('#btn-second')!

  setTimeout(() => {
    btnFirst.disabled = false
    btnSecond.disabled = false
  }, MIN_RESPONSE_TIME_MS)

  function next(): void {
    btnFirst.disabled = true
    btnSecond.disabled = true
    const root = container.querySelector<HTMLElement>('#test-page-root')!
    root.style.backgroundColor = INTERSTITIAL_COLOR
    setTimeout(() => runWarmup(container, index + 1, onComplete), INTERSTITIAL_DURATION)
  }

  btnFirst.addEventListener('click', next)
  btnSecond.addEventListener('click', next)
}

function showWarmupComplete(
  container: HTMLElement,
  onReady: () => void
): void {
  container.innerHTML = `
    <div class="test-page-wrapper">
      <div class="test-warmup-complete">
        <div class="test-warmup-complete-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 class="test-warmup-complete-title">${t('test.real_test_title')}</h2>
        <p class="test-warmup-complete-message">${t('test.real_test_message')}</p>
        <button class="test-confirmation-btn test-confirmation-btn-primary" id="btn-start-real">
          ${t('test.real_test_start')}
        </button>
      </div>
    </div>
  `
  container.querySelector<HTMLButtonElement>('#btn-start-real')!
    .addEventListener('click', onReady)
}

function startRealTest(
  container: HTMLElement,
  mode: 'normal' | 'refine',
  previousResults?: TestResult
): void {
  const locale = getCurrentLocale()
  let state = createTestSession(mode, locale, previousResults)
  let currentQuestion: Question

  container.innerHTML = `
    <div class="test-page-wrapper">
      <div class="test-page" id="test-page-root">
        <div class="test-progress-bar-container test-overlay" id="test-progress-container">
          <div class="test-progress-text" id="test-progress-text"></div>
          <div class="progress-bar">
            <div class="progress-bar-fill" id="test-progress-fill"></div>
          </div>
        </div>

        <div class="test-buttons-container" id="test-buttons-container">
          <p class="test-instruction test-overlay" id="test-instruction">${t('test.instruction')}</p>
          <div class="test-choices">
            <button class="test-choice-btn" id="btn-first" type="button"></button>
            <button class="test-choice-btn" id="btn-second" type="button"></button>
          </div>
        </div>
      </div>
    </div>
  `

  const root = container.querySelector<HTMLElement>('#test-page-root')!
  const progressText = container.querySelector<HTMLElement>('#test-progress-text')!
  const progressFill = container.querySelector<HTMLElement>('#test-progress-fill')!
  const btnFirst = container.querySelector<HTMLButtonElement>('#btn-first')!
  const btnSecond = container.querySelector<HTMLButtonElement>('#btn-second')!

  function showConfirmationScreen(results: TestResult): void {
    const encoded = encodeResult(results)

    container.innerHTML = `
      <div class="test-page-wrapper">
        <div class="test-confirmation">
          <h1 class="test-confirmation-title">${t('test.complete_title')}</h1>
          <p class="test-confirmation-prompt">${t('test.refine_prompt')}</p>
          <div class="test-confirmation-actions">
            <button class="test-confirmation-btn test-confirmation-btn-primary" id="btn-see-results">${t('test.see_results')}</button>
            ${results.mode !== 'refine' ? `<button class="test-confirmation-btn test-confirmation-btn-secondary" id="btn-refine">${t('results.refine')}</button>` : ''}
          </div>
        </div>
      </div>
    `

    container.querySelector<HTMLButtonElement>('#btn-see-results')!.addEventListener('click', () => {
      navigateTo('results', { r: encoded })
    })

    container.querySelector<HTMLButtonElement>('#btn-refine')!.addEventListener('click', () => {
      renderTest(container, 'refine', results)
    })
  }

  function updateDisplay(): void {
    if (isTestComplete(state)) {
      document.body.style.overflow = ''
      const results = getTestResults(state, locale)
      const nick = sessionStorage.getItem('spectrumsense-nickname')?.trim()
      if (nick) results.nickname = nick
      showConfirmationScreen(results)
      return
    }

    currentQuestion = getCurrentQuestion(state)

    root.style.backgroundColor = hslString(currentQuestion.hue)

    progressText.textContent = t('test.progress', {
      n: currentQuestion.questionNumber,
      total: currentQuestion.totalQuestions,
    })
    progressFill.style.width = `${currentQuestion.progress * 100}%`

    btnFirst.textContent = t(currentQuestion.firstLabel)
    btnSecond.textContent = t(currentQuestion.secondLabel)

    btnFirst.disabled = true
    btnSecond.disabled = true
    setTimeout(() => {
      btnFirst.disabled = false
      btnSecond.disabled = false
    }, MIN_RESPONSE_TIME_MS)
  }

  function handleChoice(choseFirst: boolean): void {
    btnFirst.disabled = true
    btnSecond.disabled = true

    const actualChoice = currentQuestion.swapped ? !choseFirst : choseFirst
    state = answerQuestion(state, actualChoice)

    if (isTestComplete(state)) {
      updateDisplay()
      return
    }

    root.style.backgroundColor = INTERSTITIAL_COLOR

    setTimeout(() => {
      state = advanceFromInterstitial(state)
      updateDisplay()
    }, INTERSTITIAL_DURATION)
  }

  btnFirst.addEventListener('click', () => handleChoice(true))
  btnSecond.addEventListener('click', () => handleChoice(false))

  updateDisplay()
}

function injectTestStyles(): void {
  const styleId = 'test-page-styles'
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    .test-page-wrapper {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-primary, #06060c);
      overflow: hidden;
    }

    .test-page {
      width: 80%;
      height: 80%;
      border-radius: var(--radius-lg, 20px);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: background-color 0ms;
      overflow: hidden;
      box-shadow: 0 0 80px rgba(0, 0, 0, 0.4);
    }

    .test-progress-bar-container {
      margin: 1.25rem 1.25rem 0;
      padding: 0.75rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .test-progress-text {
      font-size: 0.8125rem;
      font-weight: 500;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
      letter-spacing: 0.04em;
    }

    .test-buttons-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 0 1.5rem 2.25rem;
    }

    .test-instruction {
      font-size: 0.9375rem;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
      padding: 0.5rem 1.25rem;
      margin: 0;
      letter-spacing: 0.01em;
    }

    .test-choices {
      display: flex;
      gap: 0.875rem;
      width: 100%;
      max-width: 500px;
    }

    .test-choices .test-choice-btn {
      flex: 1;
    }

    .test-back-btn {
      position: absolute;
      top: 1.25rem;
      left: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm, 8px);
      color: var(--text-muted);
      font-family: var(--font-sans, 'Outfit', sans-serif);
      font-size: 0.8125rem;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.15s ease;
      z-index: 10;
    }

    .test-back-btn:hover {
      color: var(--text-primary);
      background: var(--bg-card);
      border-color: var(--border-accent);
    }

    .test-env-check {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: safe center;
      gap: 1.75rem;
      padding: 4.5rem 2rem 2rem;
      text-align: center;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      animation: fadeIn 0.5s ease both;
      position: relative;
    }

    .test-env-title {
      font-family: var(--font-display, 'Instrument Serif', Georgia, serif);
      font-size: 2rem;
      font-weight: 400;
      color: var(--text-primary);
      margin: 0;
    }

    .test-env-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      color: var(--text-secondary);
      font-size: 1rem;
      font-weight: 300;
      line-height: 1.6;
      text-align: left;
      max-width: 440px;
      width: 100%;
    }

    .test-env-list li {
      display: flex;
      gap: 0.5rem;
    }

    .test-env-list li::before {
      content: '→';
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .test-env-divider {
      width: 40px;
      height: 1px;
      background: var(--border);
    }

    .test-env-how {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      max-width: 440px;
    }

    .test-env-how-title {
      font-family: var(--font-sans, 'Outfit', sans-serif);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0;
    }

    .test-env-how-steps {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 300;
      line-height: 1.6;
      text-align: left;
    }

    .test-env-how-steps li {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
    }

    .test-env-how-num {
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

    .test-env-how-note {
      font-size: 0.8125rem;
      color: rgba(255, 255, 255, 0.3);
      font-weight: 300;
      margin: 0;
      font-style: italic;
    }

    .test-env-nickname {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      max-width: 440px;
      width: 100%;
    }

    .test-env-nickname-label {
      font-family: var(--font-sans, 'Outfit', sans-serif);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .test-env-nickname-input {
      width: 100%;
      max-width: 280px;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md, 12px);
      border: 1px solid var(--border);
      background: var(--accent-glow);
      color: var(--text-primary);
      font-family: var(--font-sans, 'Outfit', sans-serif);
      font-size: 1rem;
      font-weight: 400;
      text-align: center;
      outline: none;
      transition: all 0.15s ease;
    }

    .test-env-nickname-input::placeholder {
      color: var(--text-muted);
    }

    .test-env-nickname-input:focus {
      border-color: var(--border-accent);
      background: var(--accent-dim);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    .test-env-disclaimer {
      font-size: 0.8125rem;
      color: var(--text-muted);
      line-height: 1.7;
      max-width: 440px;
      text-align: center;
      font-weight: 300;
      padding: 0.875rem 1.25rem;
      background: var(--bg-secondary);
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--border-subtle);
    }

    .test-env-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      max-width: 540px;
      width: 100%;
    }

    .test-env-detail {
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md, 12px);
      text-align: left;
    }

    .test-env-detail-title {
      font-family: var(--font-sans, 'Outfit', sans-serif);
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .test-env-detail-text {
      font-size: 0.8125rem;
      color: rgba(255, 255, 255, 0.35);
      line-height: 1.7;
      font-weight: 300;
      margin: 0;
    }

    .test-confirmation {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.75rem;
      padding: 2rem;
      text-align: center;
      width: 100%;
      height: 100%;
      animation: fadeIn 0.5s ease both;
    }

    .test-confirmation-title {
      font-family: var(--font-display, 'Instrument Serif', Georgia, serif);
      font-size: 2.75rem;
      font-weight: 400;
      color: var(--text-primary);
      margin: 0;
      letter-spacing: -0.01em;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.1s;
    }

    .test-confirmation-prompt {
      font-size: 1rem;
      font-weight: 300;
      color: var(--text-muted);
      margin: 0;
      max-width: 340px;
      line-height: 1.6;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.2s;
    }

    .test-confirmation-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      max-width: 320px;
      margin-top: 0.5rem;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.35s;
    }

    .test-confirmation-btn {
      padding: 1rem 1.75rem;
      border-radius: var(--radius-lg, 20px);
      font-size: 1rem;
      font-weight: 600;
      font-family: var(--font-sans, 'Outfit', sans-serif);
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }

    .test-confirmation-btn:hover {
      transform: translateY(-1px);
    }

    .test-confirmation-btn:active {
      opacity: 0.85;
      transform: translateY(0);
    }

    .test-confirmation-btn-primary {
      background: var(--accent, #2dd4bf);
      color: #0a0a14;
      position: relative;
    }

    .test-confirmation-btn-primary:hover {
      background: var(--accent-hover, #5eead4);
    }

    .test-confirmation-btn-primary::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--accent, #2dd4bf);
      filter: blur(16px);
      opacity: 0.3;
      z-index: -1;
    }

    .test-warmup-complete {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 2rem;
      text-align: center;
      width: 100%;
      height: 100%;
      animation: fadeIn 0.5s ease both;
    }

    .test-warmup-complete-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(45, 212, 191, 0.12);
      color: var(--accent, #2dd4bf);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .test-warmup-complete-title {
      font-family: var(--font-display, 'Instrument Serif', Georgia, serif);
      font-size: 2rem;
      font-weight: 400;
      color: var(--text-primary);
      margin: 0;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.1s;
    }

    .test-warmup-complete-message {
      font-size: 1rem;
      font-weight: 300;
      color: var(--text-muted);
      margin: 0;
      max-width: 340px;
      line-height: 1.6;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 0.2s;
    }

    .test-confirmation-btn-secondary {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .test-confirmation-btn-secondary:hover {
      color: var(--text-secondary);
      background: var(--bg-card);
      border-color: var(--border-accent);
    }

    @media (max-width: 480px) {
      .test-env-check {
        gap: 1.25rem;
        padding: 4rem 1.25rem 1.5rem;
        justify-content: flex-start;
      }
      .test-env-title {
        font-size: 1.625rem;
      }
      .test-env-list {
        font-size: 0.9375rem;
        gap: 0.5rem;
      }
      .test-env-divider {
        margin: 0;
      }
      .test-env-how-steps {
        font-size: 0.8125rem;
      }
      .test-env-disclaimer {
        font-size: 0.75rem;
        padding: 0.625rem 1rem;
        line-height: 1.6;
      }
      .test-env-details {
        grid-template-columns: 1fr;
      }
      .test-confirmation-btn {
        padding: 0.875rem 1.5rem;
        font-size: 0.9375rem;
      }
    }

    @media (max-width: 375px) {
      .test-page {
        width: 100%;
        height: 100%;
        border-radius: var(--radius-sm, 8px);
      }

      .test-choices {
        flex-direction: column;
        max-width: 100%;
      }

      .test-choice-btn {
        min-height: 56px;
      }

      .test-confirmation-title {
        font-size: 2.25rem;
      }
    }
  `
  document.head.appendChild(style)
}
