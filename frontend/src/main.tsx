import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './i18n'
import './index.css'
import App from './App'
import { applyTheme, useUiStore } from './store/uiStore'
import i18n from './i18n'

// 首屏就把主题与 <html lang> 落好，避免闪烁与屏幕阅读器读错语言。
applyTheme(useUiStore.getState().theme)
document.documentElement.lang = i18n.language
i18n.on('languageChanged', (lang) => {
  document.documentElement.lang = lang
})

const container = document.getElementById('root')
if (!container) throw new Error('#root not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
