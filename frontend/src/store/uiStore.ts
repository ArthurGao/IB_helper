import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '../i18n'

export type ThemeMode = 'light' | 'dark' | 'system'

interface UiState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

/** 主题落到 <html data-theme>，CSS 变量据此切换（见 index.css）。 */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = resolveTheme(mode)
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      toggleTheme: () => {
        const next = resolveTheme(get().theme) === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },
    }),
    {
      name: 'ib-selector.ui',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? 'system')
      },
    },
  ),
)

/** 语言切换：i18next 自己负责写 localStorage（见 i18n.ts 的 detection.caches）。 */
export async function setLanguage(lang: 'zh-CN' | 'en'): Promise<void> {
  await i18n.changeLanguage(lang)
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}
