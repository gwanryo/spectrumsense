import type { Page } from './types'

type PageRenderer = (container: HTMLElement) => void

const routes: Map<Page, PageRenderer> = new Map()
let appContainer: HTMLElement | null = null

/** Register a page renderer for a route */
export function registerRoute(page: Page, renderer: PageRenderer): void {
  routes.set(page, renderer)
}

/** Navigate to a page by changing the hash */
export function navigateTo(page: Page, params?: Record<string, string>): void {
  let hash = `#/${page === 'landing' ? '' : page}`

  if (params) {
    const searchParams = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, value)
    }
    const search = searchParams.toString()
    window.location.href = `${window.location.pathname}?${search}${hash}`
    return
  }

  window.location.hash = hash
}

/** Get the current page from the hash */
export function getCurrentPage(): Page {
  const hash = window.location.hash
  if (!hash || hash === '#/' || hash === '#') return 'landing'
  if (hash.startsWith('#/test')) return 'test'
  if (hash.startsWith('#/results')) return 'results'
  return 'landing'
}

/** Render the current page into the app container */
function renderCurrentPage(): void {
  if (!appContainer) return

  // Check for ?r= param on initial load → go to results
  const params = new URLSearchParams(window.location.search)
  const hasResult = params.has('r')
  const currentPage = getCurrentPage()

  // If we have a result param but we're on landing, redirect to results
  if (hasResult && currentPage === 'landing') {
    window.location.hash = '#/results'
    return
  }

  const page = getCurrentPage()
  const renderer = routes.get(page)

  if (renderer) {
    renderer(appContainer)
  } else {
    // Unknown route → redirect to landing
    window.location.hash = '#/'
  }
}

/** Initialize the router with the app container element */
export function initRouter(container: HTMLElement): void {
  appContainer = container

  // Listen for hash changes
  window.addEventListener('hashchange', renderCurrentPage)

  // Render initial page
  renderCurrentPage()
}
