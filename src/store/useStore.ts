import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/lib/types'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  darkMode: boolean
  toggleDarkMode: () => void
  defaultLanguage: Language
  setDefaultLanguage: (lang: Language) => void
  codeFontSize: number
  setCodeFontSize: (size: number) => void
}

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

export const useStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      darkMode: prefersDark,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      defaultLanguage: 'C++',
      setDefaultLanguage: (lang) => set({ defaultLanguage: lang }),
      codeFontSize: 14,
      setCodeFontSize: (size) => set({ codeFontSize: size }),
    }),
    {
      name: 'oi-recorder-settings',
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        darkMode: s.darkMode,
        defaultLanguage: s.defaultLanguage,
        codeFontSize: s.codeFontSize,
      }),
      // 这里不再重复应用主题：localStorage 是同步存储，persist 在 create() 期间
      // 就完成 rehydrate，App 首个 useLayoutEffect 同样在 paint 前跑，
      // 早期版本两处各写一份只是多改一次属性。改主题的唯一入口在 App.tsx。
    }
  )
)
