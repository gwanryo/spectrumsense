import type { TestResult } from '../types'
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

const INTERSTITIAL_DURATION = 500
const INTERSTITIAL_COLOR = '#808080'

/**
 * @param mode 'normal' (36 questions) or 'refine' (18 questions)
 * @param previousResults required for refine mode — narrows prior boundaries
 */
export function renderTest(
  container: HTMLElement,
  mode: 'normal' | 'refine' = 'normal',
  previousResults?: TestResult
): void {
  const locale = getCurrentLocale()
  let state = createTestSession(mode, locale, previousResults)

  injectTestStyles()

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

  document.body.style.overflow = 'hidden'

  function showConfirmationScreen(results: TestResult): void {
    const encoded = encodeResult(results)

    container.innerHTML = `
      <div class="test-page-wrapper">
        <div class="test-confirmation">
          <h1 class="test-confirmation-title">${t('test.complete_title')}</h1>
          <p class="test-confirmation-prompt">${t('test.refine_prompt')}</p>
          <div class="test-confirmation-actions">
            <button class="test-confirmation-btn test-confirmation-btn-primary" id="btn-see-results">${t('test.see_results')}</button>
            <button class="test-confirmation-btn test-confirmation-btn-secondary" id="btn-refine">${t('results.refine')}</button>
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
      showConfirmationScreen(results)
      return
    }

    const question = getCurrentQuestion(state)

    root.style.backgroundColor = hslString(question.hue)

    progressText.textContent = t('test.progress', {
      n: question.questionNumber,
      total: question.totalQuestions,
    })
    progressFill.style.width = `${question.progress * 100}%`

    btnFirst.textContent = t(question.firstLabel)
    btnSecond.textContent = t(question.secondLabel)

    btnFirst.disabled = false
    btnSecond.disabled = false
  }

  function handleChoice(choseFirst: boolean): void {
    btnFirst.disabled = true
    btnSecond.disabled = true

    state = answerQuestion(state, choseFirst)

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
      background-color: var(--bg-primary, #0a0a0f);
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
    }

    .test-progress-bar-container {
      margin: 1.25rem 1.25rem 0;
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .test-progress-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: #ffffff;
      text-align: center;
    }

    .test-buttons-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 0 1.25rem 2rem;
    }

    .test-instruction {
      font-size: 0.9375rem;
      color: rgba(255, 255, 255, 0.9);
      text-align: center;
      padding: 0.5rem 1.25rem;
      margin: 0;
    }

    .test-choices {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      max-width: 480px;
    }

    .test-choices .test-choice-btn {
      flex: 1;
    }

    .test-confirmation {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 2rem;
      text-align: center;
      width: 100%;
      height: 100%;
    }

    .test-confirmation-title {
      font-size: 2.25rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .test-confirmation-prompt {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.55);
      margin: 0;
      max-width: 320px;
      line-height: 1.5;
    }

    .test-confirmation-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      max-width: 300px;
      margin-top: 0.5rem;
    }

    .test-confirmation-btn {
      padding: 0.9375rem 1.5rem;
      border-radius: var(--radius-md, 12px);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s ease;
    }

    .test-confirmation-btn:active {
      opacity: 0.85;
    }

    .test-confirmation-btn-primary {
      background: #ffffff;
      color: var(--bg-primary, #0a0a0f);
    }

    .test-confirmation-btn-secondary {
      background: transparent;
      color: rgba(255, 255, 255, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .test-confirmation-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    @media (max-width: 375px) {
      .test-page {
        width: 100%;
        height: 100%;
        border-radius: 0;
      }

      .test-choices {
        flex-direction: column;
        max-width: 100%;
      }

      .test-choice-btn {
        min-height: 56px;
      }
    }
  `
  document.head.appendChild(style)
}
