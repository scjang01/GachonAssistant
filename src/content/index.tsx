import { createRoot } from 'react-dom/client'

import { App } from './App'
import styles from '@/styles/index.css?inline'
import { createShadowRoot } from '@/utils'

function initApp() {
  // remove scroll to top button
  document.getElementById('back-top')?.remove()

  const shadowRoot = createShadowRoot([styles])
  createRoot(shadowRoot).render(<App />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
