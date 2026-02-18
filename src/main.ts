import './styles/main.css'
import { initI18n } from './i18n/index'
import { initRouter, registerRoute, getHashParams } from './router'
import { renderLanding } from './pages/landing'
import { renderTest } from './pages/test'
import { renderResults } from './pages/results'

// Initialize i18n first
initI18n()

// Get app container
const app = document.querySelector<HTMLDivElement>('#app')!

registerRoute('landing', (container) => {
  renderLanding(
    container,
    () => {
      window.location.hash = '#/test'
    },
    (locale) => {
      const hashBase = (window.location.hash || '#/').split('?')[0]
      const params = getHashParams()
      params.set('lang', locale)
      window.history.replaceState({}, '', `${window.location.pathname}${hashBase}?${params.toString()}`)
    }
  )
})

registerRoute('test', (container) => {
  const params = getHashParams()
  const prevEncoded = params.get('prev')

  if (prevEncoded) {
    try {
      const previousResults = JSON.parse(atob(prevEncoded))
      renderTest(container, 'refine', previousResults)
    } catch {
      renderTest(container, 'normal')
    }
  } else {
    renderTest(container, 'normal')
  }
})

registerRoute('results', (container) => {
  renderResults(container)
})

// Initialize router
initRouter(app)
